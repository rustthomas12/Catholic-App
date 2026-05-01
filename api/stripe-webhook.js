import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getRawBody(req) {
  // Try req.rawBody first (some Vercel runtimes expose this)
  if (req.rawBody) {
    return typeof req.rawBody === 'string'
      ? Buffer.from(req.rawBody)
      : req.rawBody
  }
  // Fall back to reading the stream
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    )
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  const rawBody = await getRawBody(req)
  console.log('Raw body length:', rawBody.length, '| Secret prefix:', process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 10))

  let event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody.toString('utf8'),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature error:', err.message, '| Body length:', rawBody.length)
    return res.status(400).json({ error: err.message })
  }

  try {
    switch (event.type) {

      // ── Checkout completed ──────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId       = session.metadata?.user_id
        const parishId     = session.metadata?.parish_id
        const billingType  = session.metadata?.billing_type
        const donationType = session.metadata?.donation_type
        const tier         = session.metadata?.tier
        const customerId   = session.customer

        // Parish subscription checkout
        if (parishId && billingType?.startsWith('parish_')) {
          await supabase.from('parish_subscriptions').upsert({
            parish_id: parishId,
            stripe_customer_id: customerId,
            status: 'trialing',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'parish_id' })
          break
        }

        if (!userId) break

        if (donationType === 'one_time') {
          const amountCents = parseInt(session.metadata?.amount_cents || '0', 10)
          await supabase
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              donation_tier: 'benefactor',
              donation_tier_since: new Date().toISOString(),
              one_time_donation_total_cents: supabase.rpc
                ? undefined  // handled below
                : 0,
            })
            .eq('id', userId)

          // Increment one_time_donation_total_cents
          await supabase.rpc('increment_donation_total', {
            p_user_id: userId,
            p_amount: amountCents,
          }).catch(() => {
            // RPC may not exist — update directly instead
            supabase.from('profiles')
              .select('one_time_donation_total_cents')
              .eq('id', userId)
              .single()
              .then(({ data }) => {
                supabase.from('profiles').update({
                  one_time_donation_total_cents: (data?.one_time_donation_total_cents || 0) + amountCents,
                }).eq('id', userId)
              })
          })

        } else if (tier) {
          // Recurring subscription — subscription events handle ongoing status
          // but we set initial state here in case webhook arrives before sub event
          await supabase
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              donation_tier: tier,
              donation_tier_since: new Date().toISOString(),
              subscription_status: 'active',
            })
            .eq('id', userId)
        }

        await logBillingEvent(userId, customerId, event.type, {
          status: 'completed',
          amount_cents: session.amount_total,
        })
        break
      }

      // ── Subscription updated ────────────────────────────────
      case 'customer.subscription.updated': {
        const sub        = event.data.object
        const customerId = sub.customer
        const status     = sub.status  // active, past_due, canceled, trialing, etc.
        const tier       = sub.metadata?.tier
        const parishId   = sub.metadata?.parish_id
        const billingType = sub.metadata?.billing_type
        const interval   = sub.items?.data?.[0]?.price?.recurring?.interval

        // Parish subscription
        if (parishId) {
          await supabase.from('parish_subscriptions').upsert({
            parish_id: parishId,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            status,
            trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'parish_id' })
          break
        }

        // Personal subscription
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        const updates = {
          subscription_status: status,
          subscription_interval: interval || null,
        }
        if (tier) {
          updates.donation_tier = status === 'active' ? tier : null
        }
        if (status === 'canceled' || status === 'unpaid') {
          updates.donation_tier = null
        }

        await supabase.from('profiles').update(updates).eq('id', profile.id)
        await logBillingEvent(profile.id, customerId, event.type, { status, interval })
        break
      }

      // ── Subscription deleted (canceled) ────────────────────
      case 'customer.subscription.deleted': {
        const sub        = event.data.object
        const customerId = sub.customer
        const parishId   = sub.metadata?.parish_id

        // Parish subscription
        if (parishId) {
          await supabase.from('parish_subscriptions').update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }).eq('parish_id', parishId)
          break
        }

        // Personal subscription
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase.from('profiles').update({
          donation_tier: null,
          subscription_status: 'inactive',
          subscription_interval: null,
        }).eq('id', profile.id)

        await logBillingEvent(profile.id, customerId, event.type, { status: 'canceled' })
        break
      }

      // ── Payment failed ──────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice    = event.data.object
        const customerId = invoice.customer

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase.from('profiles').update({
          subscription_status: 'past_due',
        }).eq('id', profile.id)

        await logBillingEvent(profile.id, customerId, event.type, { status: 'past_due' })
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    res.status(500).json({ error: err.message })
  }
}

async function logBillingEvent(userId, customerId, eventType, extras = {}) {
  await supabase.from('billing_events').insert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_event_id: null,
    event_type: eventType,
    ...extras,
  }).catch(err => console.error('Failed to log billing event:', err.message))
}
