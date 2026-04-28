import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { stripeCustomerId } = req.body

  if (!stripeCustomerId) {
    return res.status(400).json({ error: 'Missing stripeCustomerId' })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.VITE_APP_URL || 'https://getcommunio.app'}/settings`,
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    res.status(500).json({ error: err.message })
  }
}
