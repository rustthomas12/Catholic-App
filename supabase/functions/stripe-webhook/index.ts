import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Webhook signature failed', { status: 400 })
  }

  // Idempotency: skip already-processed events
  const { data: existing } = await supabase
    .from('billing_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing) {
    return new Response('Already processed', { status: 200 })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription' && session.mode !== 'payment') break

        const billingType = session.metadata?.billing_type
        const customerId = session.customer as string

        if (billingType === 'parish_base') {
          // ── Parish Base subscription (unchanged) ──
          const parishId = session.metadata?.parish_id
          const adminUserId = session.metadata?.admin_user_id
          if (!parishId) break

          const subscriptionId = session.subscription as string
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const status = subscription.status
          const trialEnd = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null
          const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

          await supabase.from('parish_subscriptions').upsert({
            parish_id: parishId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status,
            trial_ends_at: trialEnd,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'parish_id' })

          await supabase.from('billing_events').insert({
            user_id: adminUserId ?? null,
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
            event_type: `${event.type}:parish_base`,
            status,
          })

        } else if (billingType === 'org_base') {
          // ── Organization subscription ──
          const orgId = session.metadata?.org_id
          const adminUserId = session.metadata?.admin_user_id
          const tier = session.metadata?.tier || 'small'
          const subscriptionId = session.subscription as string

          if (!orgId) break

          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const status = subscription.status
          const trialEnd = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null
          const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

          await supabase.from('org_subscriptions').upsert({
            org_id: orgId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            tier,
            status,
            trial_ends_at: trialEnd,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'org_id' })

          await supabase.from('billing_events').insert({
            user_id: adminUserId ?? null,
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
            event_type: `${event.type}:org_base`,
            status,
            interval: 'month',
          })

        } else if (billingType === 'individual_donation') {
          // ── Individual donation (new model) ──
          const donationType = session.metadata?.donation_type  // 'recurring' | 'one_time'
          const tier = session.metadata?.tier                   // 'supporter' | 'member' | 'patron'
          const userId = session.metadata?.user_id

          if (!userId) {
            console.error('No user_id in session metadata')
            break
          }

          if (donationType === 'one_time') {
            await supabase.from('profiles').update({
              donation_tier: 'benefactor',
              donation_tier_since: new Date().toISOString(),
              stripe_customer_id: customerId,
            }).eq('id', userId)

          } else {
            // Recurring subscription
            const subscriptionId = session.subscription as string
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

            await supabase.from('profiles').update({
              donation_tier: tier,
              donation_tier_since: new Date().toISOString(),
              stripe_customer_id: customerId,
              subscription_status: 'active',
              subscription_interval: 'month',
              premium_expires_at: periodEnd,
              // NOTE: is_premium is NOT set here — reserved for parish sponsorship only
            }).eq('id', userId)
          }

          await supabase.from('billing_events').insert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
            event_type: `${event.type}:individual_donation`,
            status: 'active',
            interval: donationType === 'recurring' ? 'month' : 'one_time',
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const billingType = subscription.metadata?.billing_type
        const customerId = subscription.customer as string
        const status = subscription.status
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

        if (billingType === 'parish_base') {
          // ── Parish (unchanged) ──
          await supabase.from('parish_subscriptions').update({
            status,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          }).eq('stripe_customer_id', customerId)

          await supabase.from('billing_events').insert({
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
            event_type: `${event.type}:parish_base`,
            status,
          })

        } else if (billingType === 'org_base') {
          // ── Organization subscription ──
          const tier = subscription.metadata?.tier || 'small'
          const isActive = status === 'active' || status === 'trialing'
          const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

          await supabase.from('org_subscriptions').update({
            status,
            tier,
            current_period_end: isActive ? periodEnd : null,
            updated_at: new Date().toISOString(),
          }).eq('stripe_customer_id', customerId)

          await supabase.from('billing_events').insert({
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
            event_type: `${event.type}:org_base`,
            status,
          })

        } else if (billingType === 'individual_donation') {
          // ── Individual donation ──
          const tier = subscription.metadata?.tier
          const isPremium = status === 'active' || status === 'trialing'

          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()

          if (!profile) break

          await supabase.from('profiles').update({
            donation_tier: isPremium ? (tier ?? null) : null,
            subscription_status: status,
            premium_expires_at: isPremium ? periodEnd : null,
            // NOTE: is_premium is not touched here
          }).eq('id', profile.id)

          await supabase.from('billing_events').insert({
            user_id: profile.id,
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
            event_type: `${event.type}:individual_donation`,
            status,
            interval: 'month',
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const billingType = subscription.metadata?.billing_type
        const customerId = subscription.customer as string

        if (billingType === 'parish_base') {
          // ── Parish (unchanged) ──
          const { data: parishSub } = await supabase
            .from('parish_subscriptions')
            .select('parish_id')
            .eq('stripe_customer_id', customerId)
            .single()

          await supabase.from('parish_subscriptions').update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }).eq('stripe_customer_id', customerId)

          if (parishSub?.parish_id) {
            await supabase.from('parish_sponsorship_codes')
              .update({ is_active: false, rotated_at: new Date().toISOString() })
              .eq('parish_id', parishSub.parish_id)
              .eq('is_active', true)

            await supabase.from('sponsored_activations')
              .update({ is_active: false, deactivated_at: new Date().toISOString() })
              .eq('parish_id', parishSub.parish_id)
              .eq('is_active', true)

            await supabase.from('profiles')
              .update({ is_premium: false, premium_source: 'none', sponsored_by_parish_id: null })
              .eq('sponsored_by_parish_id', parishSub.parish_id)
              .eq('premium_source', 'parish_sponsored')
          }

          await supabase.from('billing_events').insert({
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
            event_type: `${event.type}:parish_base`,
            status: 'canceled',
          })

        } else if (billingType === 'org_base') {
          // ── Organization subscription canceled ──
          await supabase.from('org_subscriptions').update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }).eq('stripe_customer_id', customerId)

          await supabase.from('billing_events').insert({
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
            event_type: `${event.type}:org_base`,
            status: 'canceled',
          })

        } else if (billingType === 'individual_donation') {
          // ── Individual donation — clear tier, leave is_premium alone ──
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, premium_source')
            .eq('stripe_customer_id', customerId)
            .single()

          if (!profile) break

          await supabase.from('profiles').update({
            donation_tier: null,
            subscription_status: 'canceled',
            premium_expires_at: null,
            // is_premium is NOT touched — only parish sponsorship logic sets it
          }).eq('id', profile.id)

          await supabase.from('billing_events').insert({
            user_id: profile.id,
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
            event_type: `${event.type}:individual_donation`,
            status: 'canceled',
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Try parish first
        const { data: parishSub } = await supabase
          .from('parish_subscriptions')
          .select('parish_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (parishSub) {
          await supabase.from('parish_subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('stripe_customer_id', customerId)

          await supabase.from('billing_events').insert({
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
            event_type: `${event.type}:parish_base`,
            status: 'past_due',
          })
        } else {
          // Individual donor
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()

          if (!profile) break

          await supabase.from('profiles').update({
            subscription_status: 'past_due',
          }).eq('id', profile.id)

          await supabase.from('billing_events').insert({
            user_id: profile.id,
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
            event_type: `${event.type}:individual_donation`,
            status: 'past_due',
          })
        }
        break
      }
    }
  } catch (err) {
    console.error('Error processing webhook event:', err)
    return new Response('Internal error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
})
