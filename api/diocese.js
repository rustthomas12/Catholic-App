import { applyNativeCors, returnUrl } from './_native.js'
import Stripe from 'stripe'
import { getSessionUser, isPlatformAdmin, serviceSelect } from './_auth.js'
import { dioceseCovers, endParishOwnSubscription } from './_diocese.js'

/* global process */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const q = encodeURIComponent

/**
 * Diocese plan (migration 108): $49 per covered parish per month on card
 * autopay, one Stripe subscription with quantity = covered parishes.
 *
 * POST { dioceseId, action }
 *   action 'set-parish' { parishId, on }  add or remove a covered parish
 *   action 'checkout'                     start the plan for the parishes picked
 *   action 'portal'                       Stripe billing portal (card, invoices, cancel)
 *
 * Only the diocese's admins (or platform admins) may call it.
 */
export default async function handler(req, res) {
  if (applyNativeCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const caller = await getSessionUser(req)
  if (!caller) return res.status(401).json({ error: 'Please sign in again' })

  const { dioceseId, action } = req.body || {}
  if (!dioceseId || !action) return res.status(400).json({ error: 'Missing required fields' })

  const [diocese] = await serviceSelect(`dioceses?id=eq.${q(dioceseId)}&select=id,name`)
  if (!diocese) return res.status(404).json({ error: 'Diocese not found' })
  const isAdmin = (await serviceSelect(
    `diocese_admins?diocese_id=eq.${q(dioceseId)}&user_id=eq.${q(caller.id)}&select=user_id`
  )).length > 0
  if (!isAdmin && !(await isPlatformAdmin(caller.id))) {
    return res.status(403).json({ error: 'Not an admin of this diocese' })
  }

  const [sub] = await serviceSelect(`diocese_subscriptions?diocese_id=eq.${q(dioceseId)}&select=*`)

  try {
    if (action === 'set-parish') return await setParish(req, res, caller, diocese, sub)
    if (action === 'checkout') return await checkout(req, res, caller, diocese, sub)
    if (action === 'portal') return await portal(req, res, diocese, sub)
    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('Diocese API error:', err)
    return res.status(500).json({ error: err.message || 'Something went wrong' })
  }
}

async function serviceWrite(method, path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error((await r.text()) || 'Database write failed')
}

async function coveredCount(dioceseId) {
  return (await serviceSelect(`diocese_parishes?diocese_id=eq.${q(dioceseId)}&select=parish_id`)).length
}

// Keep the Stripe quantity equal to the number of covered parishes (prorated)
async function syncQuantity(sub, count) {
  if (!sub?.stripe_subscription_id || !dioceseCovers(sub.status)) return
  const s = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
  const item = s.items.data[0]
  if (item && item.quantity !== count) {
    await stripe.subscriptions.update(s.id, {
      items: [{ id: item.id, quantity: count }],
      proration_behavior: 'create_prorations',
    })
  }
}

async function setParish(req, res, caller, diocese, sub) {
  const { parishId, on } = req.body
  if (!parishId) return res.status(400).json({ error: 'Missing parish' })

  if (on) {
    const [parish] = await serviceSelect(`parishes?id=eq.${q(parishId)}&select=id,diocese`)
    if (!parish) return res.status(404).json({ error: 'Parish not found' })
    if (parish.diocese !== diocese.name) return res.status(400).json({ error: `That parish isn't in the ${diocese.name}` })
    const [existing] = await serviceSelect(`diocese_parishes?parish_id=eq.${q(parishId)}&select=diocese_id`)
    if (existing && existing.diocese_id !== diocese.id) return res.status(409).json({ error: 'That parish is covered by another plan' })
    if (!existing) {
      await serviceWrite('POST', 'diocese_parishes', { parish_id: parishId, diocese_id: diocese.id, added_by: caller.id })
    }
    const count = await coveredCount(diocese.id)
    await syncQuantity(sub, count)
    // Once the plan is running, the parish stops paying for itself
    const ended = sub && dioceseCovers(sub.status) ? await endParishOwnSubscription(stripe, parishId) : 'plan not started'
    return res.status(200).json({ ok: true, count, ownSubscription: ended })
  }

  const count = await coveredCount(diocese.id)
  if (sub && dioceseCovers(sub.status) && count <= 1) {
    return res.status(400).json({ error: 'A running plan needs at least one parish. To stop, cancel the plan in Billing.' })
  }
  await serviceWrite('DELETE', `diocese_parishes?parish_id=eq.${q(parishId)}&diocese_id=eq.${q(diocese.id)}`)
  const after = await coveredCount(diocese.id)
  await syncQuantity(sub, after)
  return res.status(200).json({ ok: true, count: after })
}

async function checkout(req, res, caller, diocese, sub) {
  if (sub && dioceseCovers(sub.status)) return res.status(400).json({ error: 'The plan is already running' })
  const priceId = process.env.STRIPE_PRICE_DIOCESE_PARISH
  if (!priceId) return res.status(500).json({ error: 'The diocese price isn\'t set up yet' })
  const count = await coveredCount(diocese.id)
  if (count < 1) return res.status(400).json({ error: 'Add at least one parish first' })

  const meta = { billing_type: 'diocese', diocese_id: diocese.id, admin_user_id: caller.id }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: count }],
    ...(sub?.stripe_customer_id ? { customer: sub.stripe_customer_id } : { customer_email: caller.email }),
    metadata: meta,
    subscription_data: { metadata: meta },
    success_url: returnUrl(req, `/diocese-admin/${diocese.id}?plan=started`),
    cancel_url:  returnUrl(req, `/diocese-admin/${diocese.id}`),
  })
  return res.status(200).json({ url: session.url })
}

async function portal(req, res, diocese, sub) {
  if (!sub?.stripe_customer_id) return res.status(404).json({ error: 'No plan yet' })
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: returnUrl(req, `/diocese-admin/${diocese.id}`),
  })
  return res.status(200).json({ url: session.url })
}
