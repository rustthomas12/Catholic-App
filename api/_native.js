/**
 * Helpers for requests coming from the iOS / Android apps.
 *
 * Files in /api that start with an underscore are not deployed as routes.
 *
 * The native apps load the UI from a local origin (capacitor://localhost on
 * iOS, https://localhost on Android) and call these endpoints cross-origin,
 * so they need CORS. Web requests are same-origin and are unaffected.
 */

// APP_URL must always point to the app subdomain, not the marketing site.
// VITE_APP_URL in Vercel is often set to the marketing domain — don't use it here.
const APP_URL = process.env.APP_URL || 'https://app.getcommunio.app'

export const NATIVE_ORIGINS = [
  'capacitor://localhost', // iOS
  'https://localhost',     // Android
  'http://localhost',      // Android (if androidScheme is ever set to http)
]

export function isNativeRequest(req) {
  return NATIVE_ORIGINS.includes(req.headers?.origin)
}

/**
 * Adds CORS headers for native-app origins and answers preflight requests.
 * Returns true when the request was a preflight that has been fully handled.
 */
export function applyNativeCors(req, res) {
  const origin = req.headers?.origin
  if (NATIVE_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Max-Age', '86400')
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

/**
 * URL that Stripe (or any other hosted flow) should send the user back to.
 * Web: the normal app URL, unchanged.
 * Native: a small bounce page that reopens the app at the same path via the
 * communio:// scheme and closes the in-app browser sheet.
 * @param {object} req
 * @param {string} path  e.g. '/settings' or '/org-admin/123?tab=billing'
 */
export function returnUrl(req, path) {
  if (!isNativeRequest(req)) return `${APP_URL}${path}`
  return `${APP_URL}/api/native-return?to=${encodeURIComponent(path)}`
}
