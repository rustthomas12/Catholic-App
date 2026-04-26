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
        if (session.mode !== 'subscription') break

        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const userId = session.metadata?.user_id

        if (!userId) {
          console.error('No user_id in session metadata')
          break
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const interval = subscription.items.data[0]?.plan.interval
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

        await supabase.from('profiles').update({
          stripe_customer_id: customerId,
          is_premium: true,
          premium_expires_at: periodEnd,
          subscription_status: 'active',
          subscription_interval: interval,
        }).eq('id', userId)

        await supabase.from('billing_events').insert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_event_id: event.id,
          event_type: event.type,
          status: 'active',
          interval,
        })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const status = subscription.status
        const interval = subscription.items.data[0]?.plan.interval
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()
        const isPremium = status === 'active' || status === 'trialing'

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase.from('profiles').update({
          is_premium: isPremium,
          premium_expires_at: isPremium ? periodEnd : null,
          subscription_status: status,
          subscription_interval: interval,
        }).eq('id', profile.id)

        await supabase.from('billing_events').insert({
          user_id: profile.id,
          stripe_customer_id: customerId,
          stripe_event_id: event.id,
          event_type: event.type,
          status,
          interval,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase.from('profiles').update({
          is_premium: false,
          premium_expires_at: null,
          subscription_status: 'canceled',
        }).eq('id', profile.id)

        await supabase.from('billing_events').insert({
          user_id: profile.id,
          stripe_customer_id: customerId,
          stripe_event_id: event.id,
          event_type: event.type,
          status: 'canceled',
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

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
          event_type: event.type,
          status: 'past_due',
        })
        break
      }
    }
  } catch (err) {
    console.error('Error processing webhook event:', err)
    return new Response('Internal error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
})
