import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// ── Lock-free token reader ─────────────────────────────────
// The Supabase JS client calls auth.getSession() before every data request
// to inject the Authorization header. That call acquires an exclusive
// navigator.locks lock. When autoRefreshToken fires concurrently and holds
// that same lock (waiting on a network response), every data request queues
// behind it — indefinitely if the refresh call hangs.
//
// Providing a custom accessToken function bypasses this lock entirely.
// We read the token directly from localStorage (where Supabase already
// persists it) without ever touching the auth lock. autoRefreshToken still
// runs normally and updates localStorage — our next call picks up the
// refreshed token automatically.
function _getAccessToken() {
  try {
    const raw = localStorage.getItem('parish-app-auth')
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.access_token) return null
    // If fewer than 30 s remain, return null so Supabase falls back to the
    // anon key (requests will 401; autoRefreshToken will write a new token
    // to storage within seconds, restoring access on the next call).
    if (session.expires_at && session.expires_at * 1000 - Date.now() < 30_000) return null
    return session.access_token
  } catch { return null }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'parish-app-auth',
  },
  accessToken: async () => _getAccessToken(),
})

/**
 * Returns the current authenticated user or null.
 * @returns {Promise<import('@supabase/supabase-js').User|null>}
 */
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

/**
 * Fetches the full profile record for a given user id.
 * @param {string} userId
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}
