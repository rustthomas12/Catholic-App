import { applyNativeCors, returnUrl } from './_native.js'
import Stripe from 'stripe'
import { getSessionUser, isParishAdmin, hasParishRole, parishHasAdmin, isPlatformAdmin, serviceSelect } from './_auth.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (applyNativeCors(req, res)) return
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const caller = await getSessionUser(req)
  if (!caller) return res.status(401).json({ error: 'Please sign in again' })

  const { parishId, tierKey, action } = req.body || {}
  if (!parishId) return res.status(400).json({ error: 'Missing required fields' })

  if (action === 'add-card') return addCard(req, res, caller, parishId)

  // The caller subscribes for themselves: an existing admin of the parish, or
  // a pastor claiming a parish that has no admin yet (verified after payment)
  // (a provisional pastor restarting checkout has a 'pending' row of their own)
  const callerIsAdmin = await isParishAdmin(caller.id, parishId)
  const allowed = callerIsAdmin
    || await hasParishRole(caller.id, parishId)
    || !(await parishHasAdmin(parishId))
    || await isPlatformAdmin(caller.id)
  if (!allowed) return res.status(403).json({ error: 'This parish is already managed by another admin' })
  const adminUserId = caller.id
  const adminEmail  = caller.email

  const TIER_PRICES = {
    small:     process.env.STRIPE_PRICE_PARISH_SMALL,
    medium:    process.env.STRIPE_PRICE_PARISH_MEDIUM,
    large:     process.env.STRIPE_PRICE_PARISH_LARGE,
    cathedral: process.env.STRIPE_PRICE_PARISH_CATHEDRAL,
  }
  const priceId = TIER_PRICES[tierKey] || TIER_PRICES.medium

  if (!priceId) {
    return res.status(500).json({ error: 'Stripe price not configured for tier: ' + (tierKey || 'medium') })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      // No card needed to start the 90-day trial. If none is added by the
      // end, Stripe pauses the subscription (trial_settings below); adding a
      // card later (action 'add-card') resumes it on autopay.
      payment_method_collection: 'if_required',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      customer_email: adminEmail,
      metadata: {
        parish_id: parishId,
        admin_user_id: adminUserId,
        billing_type: 'parish_' + (tierKey || 'medium'),
      },
      subscription_data: {
        trial_period_days: parseInt(process.env.STRIPE_PARISH_TRIAL_DAYS || '90'),
        trial_settings: { end_behavior: { missing_payment_method: 'pause' } },
        metadata: {
          parish_id: parishId,
          admin_user_id: adminUserId,
          billing_type: 'parish_' + (tierKey || 'medium'),
        },
      },
      // Existing admins go back to their dashboard; new pastors await verification
      success_url: returnUrl(req, callerIsAdmin
        ? `/parish-admin/${parishId}?tab=billing`
        : `/pastor-verification-pending?parish_id=${parishId}`),
      cancel_url:  returnUrl(req, `/parish/${parishId}`),
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Parish checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Save a card for autopay: a Checkout session in setup mode for the parish's
 * existing Stripe customer. The webhook makes the card the default for the
 * subscription and resumes it if the trial ended without one (paused).
 */
async function addCard(req, res, caller, parishId) {
  // Provisional pastors can add a card during their trial too
  const allowed = await hasParishRole(caller.id, parishId) || await isPlatformAdmin(caller.id)
  if (!allowed) return res.status(403).json({ error: 'Not an admin of this parish' })

  const [sub] = await serviceSelect(
    `parish_subscriptions?parish_id=eq.${encodeURIComponent(parishId)}&select=stripe_customer_id,stripe_subscription_id,status`
  )
  if (!sub?.stripe_customer_id || !sub?.stripe_subscription_id || !['trialing', 'paused', 'active', 'past_due'].includes(sub.status)) {
    return res.status(404).json({ error: 'No current plan for this parish' })
  }

  try {
    const meta = { purpose: 'parish_add_card', parish_id: parishId, subscription_id: sub.stripe_subscription_id }
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: sub.stripe_customer_id,
      currency: 'usd',
      metadata: meta,
      setup_intent_data: { metadata: meta },
      success_url: returnUrl(req, `/parish-admin/${parishId}?tab=billing&card=added`),
      cancel_url:  returnUrl(req, `/parish-admin/${parishId}?tab=billing`),
    })
    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Parish add-card error:', err)
    res.status(500).json({ error: err.message })
  }
}
