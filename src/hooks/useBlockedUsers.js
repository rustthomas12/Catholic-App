import { useEffect, useSyncExternalStore, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

// ── Blocked users ──────────────────────────────────────────
// The database already hides blocked users' content (migration 028), so a
// refetch is always correct. This shared store lets screens that are already
// on display (feed cards, comments) hide that content immediately too.

let state = { userId: null, ids: new Set(), loaded: false }
const listeners = new Set()

function setState(next) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let loading = null
async function load(userId) {
  if (state.userId === userId && (state.loaded || loading)) return loading
  setState({ userId, ids: new Set(), loaded: false })
  loading = supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId)
    .then(({ data }) => {
      if (state.userId !== userId) return
      setState({ ids: new Set((data ?? []).map((r) => r.blocked_id)), loaded: true })
    })
    .finally(() => { loading = null })
  return loading
}

export function useBlockedUsers() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const snapshot = useSyncExternalStore(subscribe, () => state)

  useEffect(() => {
    if (userId) load(userId)
    else setState({ userId: null, ids: new Set(), loaded: false })
  }, [userId])

  const isBlocked = useCallback((id) => !!id && snapshot.ids.has(id), [snapshot])

  const block = useCallback(async (targetId) => {
    if (!userId || !targetId || targetId === userId) return { error: 'invalid' }
    const { error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: userId, blocked_id: targetId })
    // 23505 = already blocked — treat as success
    if (error && error.code !== '23505') return { error: error.message }
    setState({ ids: new Set([...state.ids, targetId]) })
    return { error: null }
  }, [userId])

  const unblock = useCallback(async (targetId) => {
    if (!userId || !targetId) return { error: 'invalid' }
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', userId)
      .eq('blocked_id', targetId)
    if (error) return { error: error.message }
    const ids = new Set(state.ids)
    ids.delete(targetId)
    setState({ ids })
    return { error: null }
  }, [userId])

  return { blockedIds: snapshot.ids, loaded: snapshot.loaded, isBlocked, block, unblock }
}
