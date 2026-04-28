import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const TIER_PRICE_MAP = () => ({
  [process.env.STRIPE_PRICE_SUPPORTER]: 'supporter',
  [process.env.STRIPE_PRICE_MEMBER]:    'member',
  [process.env.STRIPE_PRICE_PATRON]:    'patron',
})

function getTierForPrice(priceId) {
  return TIER_PRICE_MAP()[priceId] || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { priceId, userId, userEmail, mode, oneTimeAmount } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  const appUrl = process.env.VITE_APP_URL || 'https://getcommunio.app'

  try {
    let session

    if (mode === 'payment') {
      // One-time donation
      if (!oneTimeAmount || oneTimeAmount < 100) {
        return res.status(400).json({ error: 'Minimum donation is $1.00' })
      }

      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: oneTimeAmount,
            product_data: {
              name: 'Communio — One-Time Donation',
              description: 'Thank you for supporting the mission of Communio.',
            },
          },
          quantity: 1,
        }],
        customer_email: userEmail,
        metadata: {
          user_id: userId,
          billing_type: 'individual_donation',
          donation_type: 'one_time',
          amount_cents: String(oneTimeAmount),
        },
        success_url: `${appUrl}/premium/success?type=one_time`,
        cancel_url: `${appUrl}/premium`,
      })

    } else {
      // Recurring subscription tier
      if (!priceId) {
        return res.status(400).json({ error: 'Missing priceId' })
      }

      // Block parish price from hitting this endpoint
      if (priceId === process.env.STRIPE_PRICE_PARISH_BASE) {
        return res.status(400).json({ error: 'Use parish checkout endpoint' })
      }

      const tier = getTierForPrice(priceId)
      if (!tier) {
        return res.status(400).json({ error: 'Invalid price' })
      }

      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: userEmail,
        metadata: {
          user_id: userId,
          billing_type: 'individual_donation',
          donation_type: 'recurring',
          tier,
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            billing_type: 'individual_donation',
            tier,
          },
        },
        success_url: `${appUrl}/premium/success?tier=${tier}`,
        cancel_url: `${appUrl}/premium`,
      })
    }

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
