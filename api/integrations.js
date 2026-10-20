import { applyNativeCors } from './_native.js'
/**
 * Consolidated integrations handler.
 * Routes via ?action= query param:
 *   facebook-start      POST — (signed-in parish admin) returns the Facebook
 *                              OAuth URL with a signed, expiring state
 *   facebook-callback   GET  — OAuth code exchange (verifies the state)
 *   flocknote-connect   POST — saves API key credentials
 *   webhook-connect     POST — saves webhook URL + secret
 */
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { getSessionUser, isParishAdmin, isPlatformAdmin } from './_auth.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.APP_URL || 'https://app.getinfold.app'

export default async function handler(req, res) {
  if (applyNativeCors(req, res)) return
  const { action } = req.query

  switch (action) {
    case 'facebook-start':    return withParishAdmin(req, res, facebookStart)
    case 'facebook-callback': return facebookCallback(req, res)
    case 'flocknote-connect': return withParishAdmin(req, res, flocknoteConnect)
    case 'webhook-connect':   return withParishAdmin(req, res, webhookConnect)
    default:
      return res.status(400).json({ error: `Unknown action: ${action}` })
  }
}

// ── Auth + signed OAuth state ───────────────────────────────

// Every action that changes a parish's integrations needs a signed-in admin
// of that parish (never trust parish_id / user ids from the request alone).
async function withParishAdmin(req, res, next) {
  if (req.method !== 'POST') return res.status(405).end()
  const caller = await getSessionUser(req)
  if (!caller) return res.status(401).json({ error: 'Please sign in again' })
  const parishId = req.body?.parish_id
  if (!parishId) return res.status(400).json({ error: 'parish_id is required' })
  if (!(await isParishAdmin(caller.id, parishId)) && !(await isPlatformAdmin(caller.id))) {
    return res.status(403).json({ error: 'Only an admin of this parish can manage its integrations' })
  }
  return next(req, res, caller)
}

const STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
const STATE_TTL_MS = 15 * 60 * 1000

function signState(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + STATE_TTL_MS })).toString('base64url')
  const sig = crypto.createHmac('sha256', STATE_SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verifyState(state) {
  const [body, sig] = String(state || '').split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', STATE_SECRET).update(body).digest('base64url')
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString())
    return data.exp > Date.now() ? data : null
  } catch { return null }
}

// ── Facebook Start ──────────────────────────────────────────

function facebookStart(req, res, caller) {
  const { parish_id, native } = req.body
  const nativeFlow = native === true || native === '1'
  if (!process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID === 'pending') {
    return res.status(200).json({ result: 'not_configured' })
  }

  const state = signState({ parish_id, admin_user_id: caller.id, native: nativeFlow })
  const params = new URLSearchParams({
    client_id:     process.env.FACEBOOK_APP_ID,
    redirect_uri:  `${APP_URL}/api/integrations?action=facebook-callback`,
    scope:         'pages_manage_posts,pages_read_engagement,pages_show_list',
    state,
    response_type: 'code',
  })
  return res.status(200).json({ url: `https://www.facebook.com/dialog/oauth?${params}` })
}

// ── Facebook Callback ───────────────────────────────────────

async function facebookCallback(req, res) {
  const { code, state, error } = req.query
  const nativeFlow = readNativeFlag(state)

  if (error) return res.send(closePopup('facebook', 'denied', nativeFlow))

  // State must be one we signed in facebook-start, unexpired, and its user
  // must still administer the parish
  const decoded = verifyState(state)
  if (!decoded) return res.status(400).send('Invalid or expired link — start the connection again from inFold.')
  const { parish_id, admin_user_id } = decoded
  if (!(await isParishAdmin(admin_user_id, parish_id)) && !(await isPlatformAdmin(admin_user_id))) {
    return res.status(403).send('Not an admin of this parish')
  }

  // Exchange code for short-lived token
  const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri:  `${APP_URL}/api/integrations?action=facebook-callback`,
      code,
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) return res.send(closePopup('facebook', 'token_error', nativeFlow))

  // Exchange for long-lived token (~60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${process.env.FACEBOOK_APP_ID}` +
    `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
    `&fb_exchange_token=${tokenData.access_token}`
  )
  const { access_token: longToken, expires_in } = await longRes.json()

  const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${longToken}`)
  const { data: pages } = await pagesRes.json()

  if (!pages || pages.length === 0) return res.send(closePopup('facebook', 'no_pages', nativeFlow))

  const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000).toISOString()

  if (pages.length === 1) {
    const page = pages[0]
    await supabase.from('parish_integrations').upsert({
      parish_id,
      platform: 'facebook',
      access_token: page.access_token,
      token_expires_at: expiresAt,
      config: { page_id: page.id, page_name: page.name },
      is_enabled: true,
      last_error: null,
      error_count: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'parish_id,platform' })
    return res.send(closePopup('facebook', 'connected', nativeFlow))
  }

  // Multiple pages — let admin pick in-app
  await supabase.from('parish_integrations').upsert({
    parish_id,
    platform: 'facebook',
    access_token: longToken,
    token_expires_at: expiresAt,
    config: { pages, awaiting_page_selection: true },
    is_enabled: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'parish_id,platform' })

  return res.send(closePopup('facebook', 'select_page', nativeFlow))
}

// ── Flocknote Connect ───────────────────────────────────────

async function flocknoteConnect(req, res) {

  const { parish_id, api_key, network_id, group_id } = req.body
  if (!parish_id || !api_key || !network_id) {
    return res.status(400).json({ error: 'parish_id, api_key, and network_id are required' })
  }

  let networkName
  try {
    const testRes = await fetch(`https://flocknote.com/api/v2/networks/${network_id}`, {
      headers: { 'Authorization': `Bearer ${api_key}`, 'Content-Type': 'application/json' },
    })
    if (!testRes.ok) return res.status(400).json({ error: 'Invalid credentials. Check your API key and Network ID.' })
    const data = await testRes.json()
    networkName = data.name
  } catch {
    return res.status(500).json({ error: 'Could not reach Flocknote. Try again.' })
  }

  await supabase.from('parish_integrations').upsert({
    parish_id,
    platform: 'flocknote',
    access_token: api_key,
    config: { network_id, group_id: group_id || null, network_name: networkName },
    is_enabled: true,
    last_error: null,
    error_count: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'parish_id,platform' })

  res.status(200).json({ success: true, network_name: networkName })
}

// ── Webhook Connect ─────────────────────────────────────────

async function webhookConnect(req, res) {

  const { parish_id, platform, webhook_url, webhook_secret } = req.body
  if (!parish_id || !webhook_url || !['website_webhook', 'email_webhook'].includes(platform)) {
    return res.status(400).json({ error: 'parish_id, platform, and webhook_url are required' })
  }

  // Public https endpoints only — the server calls this URL, so block
  // loopback / private / link-local targets
  try {
    const url = new URL(webhook_url)
    if (url.protocol !== 'https:' || isPrivateHost(url.hostname)) throw new Error()
  } catch {
    return res.status(400).json({ error: 'Webhook URL must be a public https:// address' })
  }

  const secret = webhook_secret || crypto.randomBytes(32).toString('hex')

  try {
    const pingRes = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-inFold-Event': 'ping' },
      body: JSON.stringify({ event: 'ping', timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
      redirect: 'manual',
    })
    if (pingRes.status >= 400) {
      return res.status(400).json({ error: `Webhook returned ${pingRes.status}. Check the URL.` })
    }
  } catch {
    return res.status(400).json({ error: 'Could not reach that URL. Make sure it is publicly accessible.' })
  }

  await supabase.from('parish_integrations').upsert({
    parish_id,
    platform,
    config: { webhook_url, webhook_secret: secret },
    is_enabled: true,
    last_error: null,
    error_count: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'parish_id,platform' })

  res.status(200).json({ success: true, webhook_secret: secret })
}

// ── Helpers ─────────────────────────────────────────────────

function isPrivateHost(host) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
}

function closePopup(platform, result, nativeFlow = false) {
  if (nativeFlow) {
    // Started from the iOS / Android app in an in-app browser sheet: hand the
    // result back through the infold:// scheme (the app closes the sheet).
    const appLink = `infold://oauth-complete?platform=${encodeURIComponent(platform)}&result=${encodeURIComponent(result)}`
    return `<!DOCTYPE html><html><body>
    <script>window.location.replace('${appLink}');</script>
    <p>You can close this window and return to inFold.</p>
    </body></html>`
  }
  return `<!DOCTYPE html><html><body>
    <script>
      try { window.opener?.postMessage({ type: 'INTEGRATION_RESULT', platform: '${platform}', result: '${result}' }, '*'); } catch(e) {}
      window.close();
    </script>
    <p>You can close this window.</p>
    </body></html>`
}

// Reads the `native` flag from the OAuth state without failing the request
function readNativeFlag(state) {
  try {
    return JSON.parse(Buffer.from(String(state).split('.')[0], 'base64url').toString()).native === true
  } catch {
    return false
  }
}
