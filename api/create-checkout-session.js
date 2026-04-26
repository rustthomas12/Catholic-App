import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { priceId, userId, userEmail } = req.body

  if (!priceId || !userId) {
    return res.status(400).json({ error: 'Missing priceId or userId' })
  }

  const allowedPrices = [
    process.env.STRIPE_PRICE_MONTHLY,
    process.env.STRIPE_PRICE_YEARLY,
  ]
  if (!allowedPrices.includes(priceId)) {
    return res.status(400).json({ error: 'Invalid price' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
      metadata: { user_id: userId },
      success_url: `${process.env.VITE_APP_URL || 'https://communio.app'}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_APP_URL || 'https://communio.app'}/premium`,
      subscription_data: {
        metadata: { user_id: userId },
      },
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
