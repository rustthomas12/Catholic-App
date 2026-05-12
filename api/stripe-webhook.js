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
          const adminUserId = session.metadata?.admin_user_id

          await supabase.from('parish_subscriptions').upsert({
            parish_id: parishId,
            stripe_customer_id: customerId,
            status: 'trialing',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'parish_id' })

          // Do NOT auto-add to parish_admins — requires manual verification.
          // Send verification email to info@getcommunio.app for review.
          if (adminUserId) {
            try {
              const [profileRes, parishRes] = await Promise.all([
                supabase.from('profiles').select('full_name').eq('id', adminUserId).single(),
                supabase.from('parishes').select('name, city, state').eq('id', parishId).single(),
              ])
              const priest = profileRes.data
              const parish = parishRes.data
              const tierName = billingType.replace('parish_', '')
              const resendKey = process.env.RESEND_API_KEY
              if (resendKey && resendKey !== 're_placeholder') {
                const approvalSQL =
                  "INSERT INTO parish_admins (parish_id, user_id, role)\nVALUES ('" +
                  parishId + "', '" + adminUserId + "', 'admin')\nON CONFLICT (parish_id, user_id) DO UPDATE SET role = 'admin';"
                await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    from: 'Communio <noreply@getcommunio.app>',
                    to: ['info@getcommunio.app'],
                    subject: '[Verification Needed] Pastor Application — ' + (parish?.name || parishId),
                    html:
                      '<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto">' +
                      '<div style="background:#1B2A4A;padding:20px;border-radius:8px 8px 0 0">' +
                      '<h2 style="color:#C9A84C;margin:0">Pastor Application — Verification Needed</h2></div>' +
                      '<div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px">' +
                      '<table style="width:100%;border-collapse:collapse">' +
                      '<tr><td style="padding:6px 0;color:#888;width:140px">Pastor</td><td>' + (priest?.full_name || 'Unknown') + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">User ID</td><td style="font-family:monospace;font-size:12px">' + adminUserId + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">Parish</td><td>' + (parish?.name || parishId) + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">Parish ID</td><td style="font-family:monospace;font-size:12px">' + parishId + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">Location</td><td>' + [parish?.city, parish?.state].filter(Boolean).join(', ') + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">Plan</td><td>' + tierName + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">Stripe Customer</td><td>' + customerId + '</td></tr>' +
                      '</table>' +
                      '<hr style="border:none;border-top:1px solid #C9A84C;margin:20px 0"/>' +
                      '<p style="font-size:13px;color:#555"><strong>To approve, run in Supabase SQL Editor:</strong></p>' +
                      '<pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:12px;white-space:pre-wrap">' + approvalSQL + '</pre>' +
                      '</div></div>',
                  }),
                })
              }
            } catch (emailErr) {
              console.error('Verification email failed:', emailErr.message)
            }
          }
          break
        }

        // Org subscription checkout
        if (billingType === 'org_base') {
          const orgId       = session.metadata?.org_id
          const billingTrack = session.metadata?.billing_track || 'standalone'
          const orgTier     = session.metadata?.tier || 'starter'
          if (orgId) {
            await supabase.from('org_subscriptions').upsert({
              org_id: orgId,
              stripe_customer_id: customerId,
              status: 'trialing',
              tier: orgTier,
              billing_track: billingTrack,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id' })
            // Update org_type to match billing track
            await supabase.from('organizations').update({
              org_type: billingTrack === 'national' ? 'national' : 'standalone',
            }).eq('id', orgId)
          }
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

        // Org subscription
        if (sub.metadata?.billing_type === 'org_base') {
          const orgId        = sub.metadata?.org_id
          const billingTrack = sub.metadata?.billing_track || 'standalone'
          const orgTier      = sub.metadata?.tier || 'starter'
          if (orgId) {
            await supabase.from('org_subscriptions').upsert({
              org_id: orgId,
              stripe_customer_id: customerId,
              stripe_subscription_id: sub.id,
              status,
              tier: orgTier,
              billing_track: billingTrack,
              trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
              current_period_end: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id' })
          }
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
