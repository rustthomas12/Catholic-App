/**
 * Bounce page used as the Stripe success/cancel/return URL for checkouts
 * started from the iOS / Android apps. It hands control back to the app via
 * the communio:// URL scheme; the app then closes the browser sheet and
 * navigates to `to`.
 *
 * GET /api/native-return?to=/settings
 */

const APP_URL = process.env.APP_URL || 'https://app.getcommunio.app'

export default function handler(req, res) {
  const raw = typeof req.query.to === 'string' ? req.query.to : '/'
  // Only allow in-app relative paths (no protocol-relative or absolute URLs)
  const to = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'

  const appLink = `communio:/${to}`
  const webLink = `${APP_URL}${to}`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Returning to Communio…</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
           font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
           background: #FAF7F2; color: #1B2A4A; text-align: center; padding: 24px; box-sizing: border-box; }
    a.btn { display: inline-block; margin-top: 16px; background: #1B2A4A; color: #fff; text-decoration: none;
            padding: 14px 24px; border-radius: 14px; font-weight: 600; }
    p { color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div>
    <h1 style="font-size:20px;margin:0 0 8px">All set!</h1>
    <p>Returning you to the Communio app…</p>
    <a class="btn" href="${escapeHtml(appLink)}">Open Communio</a>
    <p style="margin-top:24px"><a href="${escapeHtml(webLink)}" style="color:#1B2A4A">Continue on the web instead</a></p>
  </div>
  <script>
    // Supabase auth links append the session to the URL fragment, which the
    // server never sees — carry it over to both links.
    var hash = window.location.hash || ''
    var appLink = ${JSON.stringify(appLink).replace(/</g, '\\u003c')} + hash
    document.querySelectorAll('a').forEach(function (a) { a.href = a.href.split('#')[0] + hash })
    window.location.replace(appLink)
  </script>
</body>
</html>`)
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
