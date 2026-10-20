import { applyNativeCors, returnUrl } from './_native.js'
import Stripe from 'stripe'
import { getSessionUser, isOrgAdmin, isPlatformAdmin } from './_auth.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const STANDALONE_PRICES = {
  starter:     process.env.STRIPE_PRICE_ORG_STARTER,
  growth:      process.env.STRIPE_PRICE_ORG_GROWTH,
  established: process.env.STRIPE_PRICE_ORG_ESTABLISHED,
  large:       process.env.STRIPE_PRICE_ORG_LARGE,
}

const NATIONAL_PRICES = {
  national_starter:     process.env.STRIPE_PRICE_NATIONAL_STARTER,
  national_growth:      process.env.STRIPE_PRICE_NATIONAL_GROWTH,
  national_established: process.env.STRIPE_PRICE_NATIONAL_ESTABLISHED,
}

function getPriceId(billingTrack, tier) {
  if (billingTrack === 'national') return NATIONAL_PRICES[tier]
  return STANDALONE_PRICES[tier]
}

export default async function handler(req, res) {
  if (applyNativeCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const caller = await getSessionUser(req)
  if (!caller) return res.status(401).json({ error: 'Please sign in again' })

  const { orgId, billingTrack = 'standalone', tier } = req.body || {}
  if (!orgId || !tier) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (!['standalone', 'national'].includes(billingTrack)) {
    return res.status(400).json({ error: 'Invalid billing track' })
  }
  if (!(await isOrgAdmin(caller.id, orgId)) && !(await isPlatformAdmin(caller.id))) {
    return res.status(403).json({ error: 'Only an admin of this organization can manage its billing' })
  }
  const adminUserId = caller.id
  const adminEmail  = caller.email

  if (tier === 'national_network') {
    return res.status(400).json({
      error: 'National Network (51+ chapters) requires a custom contract. Please contact us at info@getinfold.app.'
    })
  }

  const priceId = getPriceId(billingTrack, tier)
  if (!priceId) {
    return res.status(400).json({ error: `Invalid tier: ${tier}` })
  }


  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: adminEmail,
      metadata: {
        org_id: orgId,
        admin_user_id: adminUserId,
        billing_type: 'org_base',
        billing_track: billingTrack,
        tier,
      },
      subscription_data: {
        trial_period_days: 90,
        metadata: {
          org_id: orgId,
          admin_user_id: adminUserId,
          billing_type: 'org_base',
          billing_track: billingTrack,
          tier,
        },
      },
      success_url: returnUrl(req, `/org-admin/${orgId}?tab=billing&subscribed=true`),
      cancel_url:  returnUrl(req, `/org-admin/${orgId}?tab=billing`),
    })
    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Org checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
