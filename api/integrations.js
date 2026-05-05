/**
 * Consolidated integrations handler.
 * Routes via ?action= query param:
 *   facebook-auth       GET  — initiates OAuth popup
 *   facebook-callback   GET  — OAuth code exchange
 *   flocknote-connect   POST — saves API key credentials
 *   webhook-connect     POST — saves webhook URL + secret
 */
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.APP_URL || 'https://app.getcommunio.app'

export default async function handler(req, res) {
  const { action } = req.query

  switch (action) {
    case 'facebook-auth':     return facebookAuth(req, res)
    case 'facebook-callback': return facebookCallback(req, res)
    case 'flocknote-connect': return flocknoteConnect(req, res)
    case 'webhook-connect':   return webhookConnect(req, res)
    default:
      return res.status(400).json({ error: `Unknown action: ${action}` })
  }
}

// ── Facebook Auth ───────────────────────────────────────────

function facebookAuth(req, res) {
  const { parish_id, admin_user_id } = req.query

  if (!parish_id || !admin_user_id) {
    return res.status(400).json({ error: 'Missing parish_id or admin_user_id' })
  }
  if (!process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID === 'pending') {
    return res.send(closePopup('facebook', 'not_configured'))
  }

  const state = Buffer.from(JSON.stringify({ parish_id, admin_user_id })).toString('base64url')

  const params = new URLSearchParams({
    client_id:     process.env.FACEBOOK_APP_ID,
    redirect_uri:  `${APP_URL}/api/integrations?action=facebook-callback`,
    scope:         'pages_manage_posts,pages_read_engagement,pages_show_list',
    state,
    response_type: 'code',
  })

  res.redirect(`https://www.facebook.com/dialog/oauth?${params}`)
}

// ── Facebook Callback ───────────────────────────────────────

async function facebookCallback(req, res) {
  const { code, state, error } = req.query

  if (error) return res.send(closePopup('facebook', 'denied'))

  let parish_id, admin_user_id
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    parish_id = decoded.parish_id
    admin_user_id = decoded.admin_user_id
  } catch {
    return res.status(400).send('Invalid state')
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
  if (!tokenData.access_token) return res.send(closePopup('facebook', 'token_error'))

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

  if (!pages || pages.length === 0) return res.send(closePopup('facebook', 'no_pages'))

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
    return res.send(closePopup('facebook', 'connected'))
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

  return res.send(closePopup('facebook', 'select_page'))
}

// ── Flocknote Connect ───────────────────────────────────────

async function flocknoteConnect(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

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
  if (req.method !== 'POST') return res.status(405).end()

  const { parish_id, platform, webhook_url, webhook_secret } = req.body
  if (!parish_id || !webhook_url || !['website_webhook', 'email_webhook'].includes(platform)) {
    return res.status(400).json({ error: 'parish_id, platform, and webhook_url are required' })
  }

  try {
    const url = new URL(webhook_url)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
  } catch {
    return res.status(400).json({ error: 'Invalid webhook URL' })
  }

  const secret = webhook_secret || crypto.randomBytes(32).toString('hex')

  try {
    const pingRes = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Communio-Event': 'ping' },
      body: JSON.stringify({ event: 'ping', timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
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

// ── Helper ──────────────────────────────────────────────────

function closePopup(platform, result) {
  return `<!DOCTYPE html><html><body>
    <script>
      try { window.opener?.postMessage({ type: 'INTEGRATION_RESULT', platform: '${platform}', result: '${result}' }, '*'); } catch(e) {}
      window.close();
    </script>
    <p>You can close this window.</p>
    </body></html>`
}
