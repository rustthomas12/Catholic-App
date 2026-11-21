/**
 * Diocese plan helpers shared by /api/diocese and the Stripe webhook
 * (underscore files aren't deployed as routes). Migration 108.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

const COVERING = ['active', 'trialing', 'past_due']

export function dioceseCovers(status) {
  return COVERING.includes(status)
}

/**
 * A parish the diocese now covers stops paying for itself: its own
 * subscription is set to cancel at the end of the period it already paid for
 * (or at the end of its trial), so nobody is charged twice. The parish keeps
 * its data and settings. Returns what happened, for logs.
 */
export async function endParishOwnSubscription(stripe, parishId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/parish_subscriptions?parish_id=eq.${encodeURIComponent(parishId)}&select=stripe_subscription_id,status`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  const [own] = r.ok ? await r.json() : []
  if (!own?.stripe_subscription_id || !['trialing', 'active', 'past_due', 'paused'].includes(own.status)) {
    return 'no own subscription'
  }
  try {
    if (own.status === 'paused') {
      // A paused no-card trial has no paid period left to honour
      await stripe.subscriptions.cancel(own.stripe_subscription_id)
      return 'paused subscription canceled'
    }
    await stripe.subscriptions.update(own.stripe_subscription_id, {
      cancel_at_period_end: true,
      metadata: { ended_by: 'diocese_plan' },
    })
    return 'set to cancel at period end'
  } catch (err) {
    console.error(`Could not end parish ${parishId}'s own subscription:`, err.message)
    return 'error: ' + err.message
  }
}
