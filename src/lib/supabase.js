import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// ── Lock-free token reader ─────────────────────────────────
// The Supabase JS data client calls auth.getSession() before every .from()
// request to inject the Authorization header. That call acquires an exclusive
// navigator.locks lock. When autoRefreshToken fires concurrently and holds
// that same lock (waiting on a network response), every data query hangs.
//
// Providing a custom accessToken to the DATA client bypasses this entirely:
// we read the token straight from localStorage (where the AUTH client already
// persists it) with no lock, no network call. autoRefreshToken still runs on
// the auth client and updates localStorage; our next call picks up the new
// token automatically.
function _readStoredSession() {
  try {
    const raw = localStorage.getItem('parish-app-auth')
    if (!raw) return null
    const session = JSON.parse(raw)
    return session?.access_token ? session : null
  } catch { return null }
}

async function _getAccessToken() {
  const session = _readStoredSession()
  if (!session) return null // signed out
  if (!session.expires_at || session.expires_at * 1000 - Date.now() >= 30_000) {
    return session.access_token
  }
  // Expired or about to (e.g. the app reopened after an hour). Sending the
  // request signed-out made every permission-checked query come back empty —
  // no admin links, no notifications — until a reload. Wait for the auth
  // client's refresh instead, bounded so a stuck refresh can't hang the app.
  try {
    const result = await Promise.race([
      supabaseAuth.auth.getSession(),
      new Promise(resolve => setTimeout(() => resolve(null), 8000)),
    ])
    return result?.data?.session?.access_token ?? null
  } catch { return null }
}

// ── Auth client ────────────────────────────────────────────
// Owns the session lifecycle: signIn, signOut, getSession,
// onAuthStateChange, autoRefreshToken.
// ONLY imported by useAuth.jsx — nowhere else.
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'parish-app-auth',
  },
})

// ── Connectivity signal ────────────────────────────────────
// Every data request reports whether the server was reachable, so the UI
// can say "you're offline" instead of showing misleading empty states.
export const NETWORK_EVENT = 'infold:network'
let _lastOnline = true
function _report(online) {
  if (online === _lastOnline) return
  _lastOnline = online
  try { window.dispatchEvent(new CustomEvent(NETWORK_EVENT, { detail: { online } })) } catch {}
}
async function trackedFetch(input, init) {
  try {
    const res = await fetch(input, init)
    _report(true)
    return res
  } catch (err) {
    if (err?.name !== 'AbortError') _report(false)
    throw err
  }
}

// ── Data client ────────────────────────────────────────────
// Used everywhere for .from(), .rpc(), and .channel() (Realtime).
// The custom accessToken reads the JWT from localStorage without
// acquiring the auth lock, so data requests never hang behind a
// concurrent token refresh.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  accessToken: _getAccessToken,
  global: { fetch: trackedFetch },
})

/** JSON headers carrying the user's session token, for our /api routes. */
export async function authJsonHeaders() {
  const { data: { session } } = await supabaseAuth.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}
