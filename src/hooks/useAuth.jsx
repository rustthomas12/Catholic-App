import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import i18n from '../utils/i18n'

const AuthContext = createContext(null)

function t(key) {
  return i18n.t(key)
}

// ── localStorage helpers ───────────────────────────────────
const _projectRef = (import.meta.env.VITE_SUPABASE_URL || '')
  .match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] ?? ''
const _sessionKey = 'sb-' + _projectRef + '-auth-token'

function getStoredUser() {
  try {
    const raw = localStorage.getItem(_sessionKey)
    if (!raw) return null
    return JSON.parse(raw)?.user ?? null
  } catch { return null }
}

function getStoredProfile(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem('parish_profile_' + userId)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function setStoredProfile(userId, profile) {
  if (!userId || !profile) return
  try {
    localStorage.setItem('parish_profile_' + userId, JSON.stringify(profile))
  } catch {}
}

function clearStoredProfile(userId) {
  if (!userId) return
  try { localStorage.removeItem('parish_profile_' + userId) } catch {}
}

export function AuthProvider({ children }) {
  const storedUser = getStoredUser()

  // Optimistic sync from localStorage, verified async by getSession().
  // loading=true so ProtectedRoute waits until session is confirmed.
  // getSession() resolves in <50ms for valid sessions (reads localStorage).
  const [user,    setUser]    = useState(() => storedUser)
  const [profile, setProfile] = useState(() => getStoredProfile(storedUser?.id))
  const [loading, setLoading] = useState(true)

  // Track current userId in a ref to avoid stale closures in async callbacks
  const userIdRef = useRef(storedUser?.id ?? null)

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ id: userId })
          .select()
          .single()
        if (newProfile) setStoredProfile(userId, newProfile)
        return newProfile ?? null
      }
      return null
    }
    setStoredProfile(userId, data)
    return data
  }, [])

  useEffect(() => {
    let cancelled = false

    // Safety timeout: if getSession() hangs (network issue, Supabase outage,
    // wrong env vars), stop the spinner after 5 s so the user sees the login
    // page instead of an infinite spinner.
    const timeoutId = setTimeout(() => setLoading(false), 5000)

    // Use getSession() instead of relying on the INITIAL_SESSION event.
    // In React StrictMode, useEffect runs twice. The first subscription is
    // cleaned up (cancelled=true) before INITIAL_SESSION can resolve, so
    // profile never loads. getSession() reads the session from localStorage
    // and works correctly on both StrictMode mounts with no extra network call.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeoutId)

      // Always stop the spinner, even if this effect instance was cancelled by
      // StrictMode cleanup. Loading state is global — it must not depend on
      // which effect instance resolves first.
      if (cancelled) {
        setLoading(false)
        return
      }

      if (session?.user) {
        userIdRef.current = session.user.id
        setUser(session.user)

        const cached = getStoredProfile(session.user.id)
        if (cached && cached.id === session.user.id) {
          // Serve cached profile immediately — no spinner for returning users
          setProfile(cached)
          setLoading(false)
          // Background revalidate to pick up server-side changes (e.g. suspended_at)
          fetchProfile(session.user.id).then(p => {
            if (!cancelled && p) setProfile(p)
          })
        } else {
          // No cached profile — fetch before unlocking protected routes
          const p = await fetchProfile(session.user.id)
          setProfile(p)
          setLoading(false)
        }
      } else {
        // No valid session — clear stale optimistic state
        if (userIdRef.current) clearStoredProfile(userIdRef.current)
        userIdRef.current = null
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return

        if (event === 'SIGNED_OUT') {
          clearStoredProfile(userIdRef.current)
          userIdRef.current = null
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        // Skip INITIAL_SESSION — handled by getSession() above.
        // This prevents double profile fetches and the StrictMode race condition
        // where cancelled=true by the time INITIAL_SESSION fires.
        if (event === 'INITIAL_SESSION') return

        if (session?.user && (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        )) {
          userIdRef.current = session.user.id
          setUser(session.user)
          const p = await fetchProfile(session.user.id)
          if (!cancelled && p) setProfile(p)
        }
      }
    )

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login credentials')) return { error: t('auth:login.error_invalid') }
        if (error.message.includes('network') || error.message.includes('fetch')) return { error: t('auth:login.error_network') }
        return { error: t('common:status.error') }
      }
      if (data.user) {
        supabase.from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', data.user.id)
          .then(() => {})
      }
      return { error: null }
    } catch {
      return { error: t('auth:login.error_network') }
    }
  }

  async function signUp(email, password, { fullName, parishId, vocationState }) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered'))
          return { error: t('auth:signup.error_email_taken') }
        if (error.message.includes('Password should be at least'))
          return { error: t('auth:signup.error_password_weak') }
        return { error: t('common:status.error') }
      }

      const newUser = data.user
      if (!newUser) return { error: t('common:status.error') }

      await supabase.from('profiles').update({
        full_name: fullName,
        parish_id: parishId || null,
        vocation_state: vocationState || null,
      }).eq('id', newUser.id)

      if (parishId) {
        await supabase.from('parish_follows').insert({
          user_id: newUser.id,
          parish_id: parishId,
        })
      }

      return { error: null }
    } catch {
      return { error: t('auth:login.error_network') }
    }
  }

  async function signOut() {
    clearStoredProfile(userIdRef.current)
    userIdRef.current = null
    setUser(null)
    setProfile(null)
    await supabase.auth.signOut()
  }

  async function updateProfile(updates) {
    if (!user) return { error: 'Not authenticated' }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()
      if (error) return { error: t('common:status.error') }
      setStoredProfile(user.id, data)
      setProfile(data)
      return { error: null }
    } catch {
      return { error: t('common:status.error') }
    }
  }

  async function refreshProfile() {
    if (!user) return
    const p = await fetchProfile(user.id)
    if (p) setProfile(p)
  }

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isPremium: !!profile?.is_premium,
    isPatron: !!profile?.is_patron,
    isAdmin: !!profile?.is_admin,
    isVerifiedClergy: !!profile?.is_verified_clergy,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default useAuth
