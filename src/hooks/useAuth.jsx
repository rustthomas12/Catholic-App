import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase, supabaseAuth } from '../lib/supabase'
import i18n from '../utils/i18n'
import { clearParishCaches } from './useParish.js'
import { clearFeedCaches } from './useFeed.js'
import { clearGroupCaches } from './useGroups.js'

const AuthContext = createContext(null)

function t(key) {
  return i18n.t(key)
}

// ── localStorage helpers ───────────────────────────────────
// Must match the storageKey set in src/lib/supabase.js
const _sessionKey = 'parish-app-auth'

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
  const storedUser    = getStoredUser()
  const storedProfile = getStoredProfile(storedUser?.id)

  const [user,    setUser]    = useState(storedUser)
  const [profile, setProfile] = useState(storedProfile)

  // If we have a stored user, start with loading=false so the app renders
  // immediately without waiting for the token refresh network call.
  // getSession() runs in the background to verify / silently refresh the token.
  // If no stored user, start with loading=true and wait for session check
  // (fast path — no expired token to refresh for brand-new visitors).
  const [loading, setLoading] = useState(!storedUser)

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

    // If account is suspended, force sign-out immediately
    if (data?.suspended_at) {
      await supabaseAuth.auth.signOut()
      return null
    }

    setStoredProfile(userId, data)

    // Sync language preference from profile to local state
    if (data?.language && (data.language === 'en' || data.language === 'es')) {
      try {
        const stored = localStorage.getItem('communio-language')
        if (stored !== data.language) {
          i18n.changeLanguage(data.language)
          localStorage.setItem('communio-language', data.language)
        }
      } catch {}
    }

    // Fire-and-forget: track return visit for parish-sponsored users (once per session)
    if (
      data?.premium_source === 'parish_sponsored' &&
      !sessionStorage.getItem('communio-return-tracked')
    ) {
      sessionStorage.setItem('communio-return-tracked', 'true')
      fetch('/api/track-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch(() => {})
    }

    return data
  }, [])

  useEffect(() => {
    let cancelled = false

    // Fallback: if getSession() hangs (only relevant when storedUser=null and
    // loading=true), stop the spinner after 8 s so the user sees login instead
    // of an infinite spinner. For returning users loading is already false so
    // this timeout is a no-op.
    const timeoutId = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 8000)

    // getSession() may make a network call to refresh an expired token.
    // For returning users this is fine — they already see their content
    // (loading=false). For new users this resolves quickly (no token to refresh).
    supabaseAuth.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeoutId)
      if (cancelled) return

      if (session?.user) {
        userIdRef.current = session.user.id
        setUser(session.user)

        const cached = getStoredProfile(session.user.id)
        if (cached && cached.id === session.user.id) {
          setProfile(cached)
          setLoading(false)
          // Silent background revalidation — picks up suspended_at etc.
          fetchProfile(session.user.id).then(p => {
            if (!cancelled && p) setProfile(p)
          })
        } else {
          const p = await fetchProfile(session.user.id)
          if (!cancelled) {
            setProfile(p)
            setLoading(false)
          }
        }
      } else {
        // No valid session — clear stale optimistic state and show login
        if (userIdRef.current) clearStoredProfile(userIdRef.current)
        userIdRef.current = null
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return

        // Skip INITIAL_SESSION — handled by getSession() above
        if (event === 'INITIAL_SESSION') return

        if (event === 'SIGNED_OUT') {
          clearStoredProfile(userIdRef.current)
          userIdRef.current = null
          setUser(null)
          setProfile(null)
          setLoading(false)
          clearParishCaches()
          clearFeedCaches()
          clearGroupCaches()
          return
        }

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
      const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login credentials')) return { error: t('auth:login.error_invalid') }
        if (error.message.includes('network') || error.message.includes('fetch')) return { error: t('auth:login.error_network') }
        return { error: t('common:status.error') }
      }
      if (data.user) {
        // Check suspension before allowing access
        const { data: profile } = await supabase
          .from('profiles')
          .select('suspended_at')
          .eq('id', data.user.id)
          .single()
        if (profile?.suspended_at) {
          await supabaseAuth.auth.signOut()
          return { error: 'Your account has been suspended. Please contact support.' }
        }
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

  async function signUp(email, password, { fullName, username, parishId, vocationState }) {
    try {
      const { data, error } = await supabaseAuth.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin + '/onboarding',
        },
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
        username: username || null,
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

  async function updatePassword(newPassword) {
    try {
      const { error } = await supabaseAuth.auth.updateUser({ password: newPassword })
      if (error) return { error: error.message }
      return { error: null }
    } catch {
      return { error: t('auth:login.error_network') }
    }
  }

  async function resetPassword(email) {
    try {
      const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      })
      return { error: error ? t('common:status.error') : null }
    } catch {
      return { error: t('auth:login.error_network') }
    }
  }

  async function resendVerification(email) {
    try {
      const { error } = await supabaseAuth.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: window.location.origin + '/onboarding' },
      })
      return { error: error ? t('common:status.error') : null }
    } catch {
      return { error: t('auth:login.error_network') }
    }
  }

  async function signOut() {
    clearStoredProfile(userIdRef.current)
    userIdRef.current = null
    setUser(null)
    setProfile(null)
    clearParishCaches()
    clearFeedCaches()
    clearGroupCaches()
    await supabaseAuth.auth.signOut()
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
    isAdmin: !!profile?.is_admin,
    isVerifiedClergy: !!profile?.is_verified_clergy,
    signIn,
    signUp,
    signOut,
    resetPassword,
    resendVerification,
    updatePassword,
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
