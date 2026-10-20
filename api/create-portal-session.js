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
