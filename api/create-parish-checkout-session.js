import { applyNativeCors, returnUrl } from './_native.js'
import Stripe from 'stripe'
import { getSessionUser, isParishAdmin, parishHasAdmin, isPlatformAdmin } from './_auth.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (applyNativeCors(req, res)) return
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const caller = await getSessionUser(req)
  if (!caller) return res.status(401).json({ error: 'Please sign in again' })

  const { parishId, tierKey } = req.body || {}
  if (!parishId) return res.status(400).json({ error: 'Missing required fields' })

  // The caller subscribes for themselves: an existing admin of the parish, or
  // a pastor claiming a parish that has no admin yet (verified after payment)
  const allowed = await isParishAdmin(caller.id, parishId)
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
      payment_method_types: ['card'],
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
        metadata: {
          parish_id: parishId,
          admin_user_id: adminUserId,
          billing_type: 'parish_' + (tierKey || 'medium'),
        },
      },
      success_url: returnUrl(req, `/pastor-verification-pending?parish_id=${parishId}`),
      cancel_url:  returnUrl(req, `/parish/${parishId}`),
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Parish checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
