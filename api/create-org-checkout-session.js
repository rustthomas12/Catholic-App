import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function getPriceForTier(tier) {
  const map = {
    small: process.env.STRIPE_PRICE_ORG_SMALL,
    mid:   process.env.STRIPE_PRICE_ORG_MID,
    large: process.env.STRIPE_PRICE_ORG_LARGE,
  }
  return map[tier] || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { orgId, orgName, tier, adminUserId, adminEmail } = req.body

  if (!orgId || !adminUserId || !tier) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const priceId = getPriceForTier(tier)
  if (!priceId) {
    return res.status(400).json({ error: 'Invalid tier' })
  }

  const appUrl = process.env.VITE_APP_URL || 'https://getcommunio.app'

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
        tier,
      },
      subscription_data: {
        trial_period_days: 90,
        metadata: {
          org_id: orgId,
          admin_user_id: adminUserId,
          billing_type: 'org_base',
          tier,
        },
      },
      success_url: `${appUrl}/org-admin/${orgId}?tab=billing&subscribed=true`,
      cancel_url: `${appUrl}/org-admin/${orgId}?tab=billing`,
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Org checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
