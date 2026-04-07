import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import i18n from '../utils/i18n'

const AuthContext = createContext(null)

function t(key) {
  return i18n.t(key)
}

// ── localStorage helpers ───────────────────────────────────
const _projectRef = (import.meta.env.VITE_SUPABASE_URL || '')
  .match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] ?? ''
const _sessionKey = `sb-${_projectRef}-auth-token`

function getStoredUser() {
  try {
    const raw = localStorage.getItem(_sessionKey)
    if (!raw) return null
    return JSON.parse(raw)?.user ?? null
  } catch {
    return null
  }
}

function getStoredProfile(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(`parish_profile_${userId}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function setStoredProfile(userId, profile) {
  if (!userId || !profile) return
  try {
    localStorage.setItem(`parish_profile_${userId}`, JSON.stringify(profile))
  } catch { /* quota */ }
}

function clearStoredProfile(userId) {
  if (!userId) return
  try {
    localStorage.removeItem(`parish_profile_${userId}`)
  } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const storedUser = getStoredUser()

  // Both user and profile initialize synchronously from localStorage.
  // No network call, no loading state, no spinner on refresh.
  const [user, setUser] = useState(() => storedUser)
  const [profile, setProfile] = useState(() => getStoredProfile(storedUser?.id))
  const [loading, setLoading] = useState(false)

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return

        if (event === 'SIGNED_OUT') {
          if (user) clearStoredProfile(user.id)
          setUser(null)
          setProfile(null)
          return
        }

        if (session?.user) {
          setUser(session.user)

          if (
            event === 'INITIAL_SESSION' ||
            event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED'
          ) {
            const p = await fetchProfile(session.user.id)
            if (!cancelled && p) setProfile(p)
          }
        }
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [fetchProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: t('auth:login.error_invalid') }
        }
        if (error.message.includes('network') || error.message.includes('fetch')) {
          return { error: t('auth:login.error_network') }
        }
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
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          return { error: t('auth:signup.error_email_taken') }
        }
        if (error.message.includes('Password should be at least')) {
          return { error: t('auth:signup.error_password_weak') }
        }
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
    if (user) clearStoredProfile(user.id)
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
