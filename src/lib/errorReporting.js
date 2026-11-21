import { supabase } from './supabase'
import { platform } from './platform'
import pkg from '../../package.json'

/**
 * Sends crashes and unhandled errors to the client_errors table
 * (migration 089), where the platform admin sees them under
 * Admin → App errors. Nothing goes to a third party.
 *
 * Privacy: only the page path is sent (never the query string or #hash,
 * which can hold sign-in tokens), plus the error text, its stack and the
 * browser name. Each distinct error is sent once per page load, and at
 * most 10 per page load.
 */

const MAX_PER_LOAD = 10
const sent = new Set()

// Errors that are not bugs in the app
const IGNORE = [
  /ResizeObserver loop/i,                         // harmless browser warning
  /Failed to fetch dynamically imported module/i, // old build after a deploy; the app reloads itself
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /^(TypeError: )?(Failed to fetch|Load failed|NetworkError when attempting to fetch resource\.?)$/i, // offline
  /^Script error\.?$/i,                           // cross-origin script, no details
  /AbortError/i,
]

const clip = (s, n) => (s == null ? null : String(s).slice(0, n))

// Dev servers and local builds (hot reloads cause false crashes) stay out of
// the production log. Error boundaries call reportError directly, so the
// check lives here rather than only in installErrorReporting.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost|.+\.test)$/i
export const isLocalHost = (hostname) => LOCAL_HOST.test(hostname || '')
// Unit tests (MODE 'test') exercise the reporter, so they aren't skipped
const isLocal = () => import.meta.env.MODE !== 'test'
  && (import.meta.env.DEV || isLocalHost(location.hostname))

export function reportError(kind, error, extraStack) {
  try {
    if (isLocal()) return
    const message = clip(error?.message ?? error ?? 'Unknown error', 500)
    if (!message || IGNORE.some((re) => re.test(message))) return
    const key = `${kind}:${message}`
    if (sent.has(key) || sent.size >= MAX_PER_LOAD) return
    sent.add(key)
    const stack = [error?.stack, extraStack].filter(Boolean).join('\n--- component stack ---\n')
    supabase.from('client_errors').insert({
      kind,
      message,
      stack: clip(stack, 4000) || null,
      path: clip(location.pathname, 300),
      app_version: clip(pkg.version, 40),
      platform: clip(platform, 20),
      user_agent: clip(navigator.userAgent, 300),
    }).then(() => {}, () => {})
  } catch { /* reporting must never break the app */ }
}

let installed = false
export function installErrorReporting() {
  if (installed || import.meta.env.DEV) return
  installed = true
  window.addEventListener('error', (e) => reportError('error', e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => reportError('rejection', e.reason))
}
