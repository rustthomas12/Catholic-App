import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { parishId, parishName, adminUserId, adminEmail, tierKey } = req.body

  if (!parishId || !adminUserId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

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
      success_url: `${process.env.VITE_APP_URL || 'https://getcommunio.app'}/parish-admin/${parishId}?tab=billing&subscribed=true`,
      cancel_url: `${process.env.VITE_APP_URL || 'https://getcommunio.app'}/parish-admin/${parishId}?tab=billing`,
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Parish checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
