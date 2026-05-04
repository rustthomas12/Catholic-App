import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.APP_URL || 'https://app.getcommunio.app'

export default async function handler(req, res) {
  const { code, state, error } = req.query

  if (error) {
    return res.send(closePopup('facebook', 'denied'))
  }

  let parish_id, admin_user_id
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    parish_id = decoded.parish_id
    admin_user_id = decoded.admin_user_id
  } catch {
    return res.status(400).send('Invalid state parameter')
  }

  // Exchange code for short-lived token
  const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri:  `${APP_URL}/api/integrations/facebook/callback`,
      code,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    return res.send(closePopup('facebook', 'token_error'))
  }

  // Exchange for long-lived token (~60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${process.env.FACEBOOK_APP_ID}` +
    `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
    `&fb_exchange_token=${tokenData.access_token}`
  )
  const { access_token: longToken, expires_in } = await longRes.json()

  // Fetch the admin's managed pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${longToken}`
  )
  const { data: pages } = await pagesRes.json()

  if (!pages || pages.length === 0) {
    return res.send(closePopup('facebook', 'no_pages'))
  }

  const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000).toISOString()

  if (pages.length === 1) {
    // Auto-select the only page
    const page = pages[0]
    await supabase.from('parish_integrations').upsert({
      parish_id,
      platform: 'facebook',
      access_token: page.access_token,  // page-level token
      token_expires_at: expiresAt,
      config: { page_id: page.id, page_name: page.name },
      is_enabled: true,
      last_error: null,
      error_count: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'parish_id,platform' })

    return res.send(closePopup('facebook', 'connected'))
  }

  // Multiple pages — store token + page list, let admin pick in-app
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

function closePopup(platform, result) {
  return `
    <!DOCTYPE html><html><body>
    <script>
      try {
        window.opener?.postMessage(
          { type: 'INTEGRATION_RESULT', platform: '${platform}', result: '${result}' },
          '*'
        );
      } catch(e) {}
      window.close();
    </script>
    <p>You can close this window.</p>
    </body></html>
  `
}
