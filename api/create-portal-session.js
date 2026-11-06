import { applyNativeCors, returnUrl } from './_native.js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

// Service-role REST read; returns the parsed rows or [].
async function select(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  })
  return r.ok ? r.json() : []
}

/**
 * Opens the Stripe billing portal for a parish or organization subscription.
 * Body: { parishId } or { orgId }. The caller must be signed in and be an
 * admin of that parish / organization (or a platform admin); the Stripe
 * customer is looked up server-side, never taken from the request.
 */
export default async function handler(req, res) {
  if (applyNativeCors(req, res)) return
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${token}` },
  })
  if (!userRes.ok) return res.status(401).json({ error: 'Invalid session — please log out and back in' })
  const userId = (await userRes.json())?.id
  if (!userId) return res.status(401).json({ error: 'Could not identify user' })

  // Billing action routed through this function to stay within the plan's
  // function limit (see integrations.js for the same pattern)
  if (req.body?.action === 'decline-pastor') return declinePastor(req, res, userId)

  const { parishId, orgId } = req.body || {}
  if (!parishId && !orgId) {
    return res.status(400).json({ error: 'Missing parishId or orgId' })
  }

  const [profile] = await select(`profiles?id=eq.${userId}&select=is_admin`)
  const isPlatformAdmin = profile?.is_admin === true

  let customerId = null
  if (parishId) {
    const isParishAdmin = (await select(
      `parish_admins?parish_id=eq.${encodeURIComponent(parishId)}&user_id=eq.${userId}&select=id`
    )).length > 0
    if (!isParishAdmin && !isPlatformAdmin) return res.status(403).json({ error: 'Not an admin of this parish' })
    const [sub] = await select(`parish_subscriptions?parish_id=eq.${encodeURIComponent(parishId)}&select=stripe_customer_id`)
    customerId = sub?.stripe_customer_id
  } else {
    const isOrgAdmin = (await select(
      `organization_members?org_id=eq.${encodeURIComponent(orgId)}&user_id=eq.${userId}&role=eq.admin&select=id`
    )).length > 0
    if (!isOrgAdmin && !isPlatformAdmin) return res.status(403).json({ error: 'Not an admin of this organization' })
    const [sub] = await select(`org_subscriptions?org_id=eq.${encodeURIComponent(orgId)}&select=stripe_customer_id`)
    customerId = sub?.stripe_customer_id
  }

  if (!customerId) return res.status(404).json({ error: 'No subscription found' })

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl(req, `/settings`),
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    res.status(500).json({ error: err.message })
  }
}

/**
 * Platform admin declines a pastor application. The pastor started a
 * 90-day trial at checkout; declining used to only clear the application,
 * so the trial went on to bill them for a parish they can't manage.
 * Body: { action: 'decline-pastor', applicantId }.
 */
async function declinePastor(req, res, callerId) {
  const [caller] = await select(`profiles?id=eq.${callerId}&select=is_admin`)
  if (caller?.is_admin !== true) return res.status(403).json({ error: 'Platform admins only' })

  const applicantId = req.body?.applicantId
  if (typeof applicantId !== 'string') return res.status(400).json({ error: 'Missing applicantId' })
  const [applicant] = await select(`profiles?id=eq.${encodeURIComponent(applicantId)}&select=pending_pastor_parish_id`)
  const parishId = applicant?.pending_pastor_parish_id
  if (!parishId) return res.status(404).json({ error: 'No pending application' })

  // Cancel only this applicant's own trial/subscription for that parish
  let canceled = false
  const [sub] = await select(
    `parish_subscriptions?parish_id=eq.${encodeURIComponent(parishId)}&select=stripe_subscription_id,status`
  )
  if (sub?.stripe_subscription_id && ['trialing', 'active', 'past_due'].includes(sub.status)) {
    try {
      const s = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      if (s.metadata?.admin_user_id === applicantId && s.status !== 'canceled') {
        await stripe.subscriptions.cancel(s.id)
        canceled = true
      }
    } catch (err) {
      console.error('Decline pastor: Stripe cancel failed:', err.message)
      return res.status(502).json({ error: 'Could not cancel the trial in Stripe; nothing was changed.' })
    }
  }

  const patch = (path, body) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })

  // Recorded here too: the webhook endpoint may not be subscribed to
  // customer.subscription.deleted
  if (canceled) {
    await patch(`parish_subscriptions?parish_id=eq.${encodeURIComponent(parishId)}`,
      { status: 'canceled', updated_at: new Date().toISOString() })
  }

  const r = await patch(`profiles?id=eq.${encodeURIComponent(applicantId)}`, { pending_pastor_parish_id: null })
  if (!r.ok) return res.status(500).json({ error: 'Trial canceled, but the application could not be cleared.', canceled })

  return res.status(200).json({ canceled })
}
