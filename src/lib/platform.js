import { Capacitor } from '@capacitor/core'

// ── Platform detection ─────────────────────────────────────
// The same bundle runs on the web (Vercel) and inside the iOS / Android
// Capacitor shells. Native builds load the app from capacitor://localhost
// (iOS) or https://localhost (Android), so anything that relied on the
// page's own origin (relative /api calls, auth redirect URLs, share links)
// has to point at the hosted app instead.

export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() // 'web' | 'ios' | 'android'
export const isIOS = platform === 'ios'
export const isAndroid = platform === 'android'

// Public origin of the hosted web app. Used for API calls from native
// builds and for any URL that leaves the device (emails, share links).
export const APP_ORIGIN = (
  import.meta.env.VITE_PUBLIC_APP_ORIGIN || 'https://app.getinfold.app'
).replace(/\/$/, '')

/**
 * Resolves an /api/... path. On the web it stays relative (same origin,
 * proxied by Vite in dev). In native builds it targets the hosted app.
 * @param {string} path
 */
export function apiUrl(path) {
  return isNative ? `${APP_ORIGIN}${path}` : path
}

/**
 * Origin to use for URLs that are opened outside this device or WebView
 * (auth email redirects, share links, invite links).
 */
export function publicOrigin() {
  return isNative ? APP_ORIGIN : window.location.origin
}

/**
 * Redirect URL for Supabase auth emails (signup confirmation, password reset).
 * Web: unchanged (this origin + path).
 * Native: a bounce page that reopens the app via infold:// with the
 * session tokens, so the link lands in the app where signup data was saved.
 * Must be allow-listed in Supabase → Auth → URL Configuration.
 * @param {string} path e.g. '/onboarding'
 */
export function authRedirectUrl(path) {
  if (!isNative) return window.location.origin + path
  return `${APP_ORIGIN}/api/native-return?to=${encodeURIComponent(path)}`
}

/**
 * Public URL for the current in-app route (for sharing).
 */
export function currentPublicUrl() {
  if (!isNative) return window.location.href
  const { pathname, search, hash } = window.location
  return `${APP_ORIGIN}${pathname}${search}${hash}`
}

// Resolvers for openExternal() calls waiting on the browser sheet to close
const pendingExternal = new Set()

/**
 * Sends the user to an external URL (e.g. Stripe Checkout). On the web this
 * is a normal navigation, exactly as before. In native builds it opens the
 * in-app browser sheet (SFSafariViewController / Chrome Custom Tab) so the
 * app's WebView is not replaced by a third-party page. Server return pages
 * bounce back into the app via the infold:// scheme (see
 * api/native-return.js), which closes the sheet.
 *
 * On native the promise resolves once the browser sheet is closed, whether
 * by the user or by closeExternal().
 * @param {string} url
 */
export async function openExternal(url) {
  if (!isNative) {
    window.location.href = url
    return
  }
  const { Browser } = await import('@capacitor/browser')
  let onFinished
  const finished = new Promise((resolve) => { onFinished = resolve })
  // 'browserFinished' only fires when the user closes the sheet, so
  // closeExternal() resolves pending waits itself.
  pendingExternal.add(onFinished)
  const handle = await Browser.addListener('browserFinished', () => onFinished())
  try {
    await Browser.open({ url, presentationStyle: 'popover' })
    await finished
  } catch {
    // Browser failed to open — nothing to wait for
  } finally {
    pendingExternal.delete(onFinished)
    handle.remove()
  }
}

/**
 * Closes the in-app browser sheet if one is open (no-op otherwise).
 */
export async function closeExternal() {
  if (!isNative) return
  const { Browser } = await import('@capacitor/browser')
  try { await Browser.close() } catch { /* nothing open */ }
  pendingExternal.forEach((resolve) => resolve())
}

/**
 * Converts an incoming deep link / universal link into an in-app route,
 * or null if it does not belong to this app.
 * Accepts https://app.getinfold.app/... and infold://...
 * @param {string} url
 * @returns {string|null} path + search + hash
 */
export function deepLinkToPath(url) {
  if (!url) return null
  let parsed
  try { parsed = new URL(url) } catch { return null }

  if (parsed.protocol === 'infold:') {
    // infold://group/123 → host "group", pathname "/123"
    const path = '/' + [parsed.host, parsed.pathname.replace(/^\/+|\/+$/g, '')].filter(Boolean).join('/')
    return `${path}${parsed.search}${parsed.hash}`
  }

  const appHost = new URL(APP_ORIGIN).host
  if (parsed.host !== appHost) return null
  // /api/* is server-only — never route it inside the app
  if (parsed.pathname.startsWith('/api/')) return null
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

/**
 * Extracts Supabase auth tokens from an email-confirmation / recovery link.
 * Supabase (implicit flow) puts them in the URL fragment.
 * @param {string} url
 * @returns {{access_token: string, refresh_token: string, type: string|null}|null}
 */
export function parseAuthTokens(url) {
  if (!url) return null
  const hashIndex = url.indexOf('#')
  if (hashIndex === -1) return null
  const params = new URLSearchParams(url.slice(hashIndex + 1))
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return null
  return { access_token, refresh_token, type: params.get('type') }
}
