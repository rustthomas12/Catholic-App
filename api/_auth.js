/**
 * Shared auth helpers for /api routes (underscore files aren't deployed as routes).
 *
 * Never trust a user / parish / org id sent in the request body — resolve the
 * caller from their Supabase session and check their role server-side.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Service-role REST read; returns the parsed rows or []. */
export async function serviceSelect(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  return r.ok ? r.json() : []
}

/** Returns { id, email } for the request's Bearer session token, or null. */
export async function getSessionUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return null
  const u = await r.json()
  return u?.id ? { id: u.id, email: u.email } : null
}

const q = encodeURIComponent

export async function isPlatformAdmin(userId) {
  const [p] = await serviceSelect(`profiles?id=eq.${q(userId)}&select=is_admin`)
  return p?.is_admin === true
}

export async function isParishAdmin(userId, parishId) {
  return (await serviceSelect(`parish_admins?parish_id=eq.${q(parishId)}&user_id=eq.${q(userId)}&select=id`)).length > 0
}

export async function parishHasAdmin(parishId) {
  return (await serviceSelect(`parish_admins?parish_id=eq.${q(parishId)}&select=id&limit=1`)).length > 0
}

export async function isOrgAdmin(userId, orgId) {
  return (await serviceSelect(
    `organization_members?org_id=eq.${q(orgId)}&user_id=eq.${q(userId)}&role=eq.admin&select=id`
  )).length > 0
}
