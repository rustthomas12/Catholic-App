// Initiates Facebook OAuth flow for parish integration
// Opens as a popup from the Integrations tab
export default function handler(req, res) {
  const { parish_id, admin_user_id } = req.query

  if (!parish_id || !admin_user_id) {
    return res.status(400).json({ error: 'Missing parish_id or admin_user_id' })
  }

  if (!process.env.FACEBOOK_APP_ID) {
    return res.status(500).json({ error: 'Facebook app not configured' })
  }

  const state = Buffer.from(JSON.stringify({ parish_id, admin_user_id }))
    .toString('base64url')

  const params = new URLSearchParams({
    client_id:     process.env.FACEBOOK_APP_ID,
    redirect_uri:  `${process.env.APP_URL || 'https://app.getcommunio.app'}/api/integrations/facebook/callback`,
    scope:         'pages_manage_posts,pages_read_engagement,pages_show_list',
    state,
    response_type: 'code',
  })

  res.redirect(`https://www.facebook.com/dialog/oauth?${params}`)
}
