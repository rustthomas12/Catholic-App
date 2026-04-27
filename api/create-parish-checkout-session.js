import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { parishId, parishName, adminUserId, adminEmail } = req.body

  if (!parishId || !adminUserId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_PARISH_BASE,
        quantity: 1,
      }],
      customer_email: adminEmail,
      metadata: {
        parish_id: parishId,
        admin_user_id: adminUserId,
        billing_type: 'parish_base',
      },
      subscription_data: {
        trial_period_days: parseInt(process.env.STRIPE_PARISH_TRIAL_DAYS || '90'),
        metadata: {
          parish_id: parishId,
          admin_user_id: adminUserId,
          billing_type: 'parish_base',
        },
      },
      success_url: `${process.env.VITE_APP_URL || 'https://communio.app'}/parish-admin/${parishId}?tab=billing&subscribed=true`,
      cancel_url: `${process.env.VITE_APP_URL || 'https://communio.app'}/parish-admin/${parishId}?tab=billing`,
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Parish checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
