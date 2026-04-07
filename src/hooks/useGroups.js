import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'
import { createNotification } from '../lib/notifications'
import { toast } from '../components/shared/Toast'

// ── Memberships module-level cache (shared across all hook instances) ──────
let _membershipsCache = null        // { userId, data, ts }
let _membershipsPromise = null      // in-flight request
const MEMBERSHIPS_TTL = 60_000     // 1 minute

function _invalidateMemberships() {
  _membershipsCache = null
  _membershipsPromise = null
}

async function _fetchMemberships(userId) {
  if (_membershipsPromise) return _membershipsPromise
  _membershipsPromise = supabase
    .from('group_members')
    .select(`
      group_id, role,
      groups(
        id, name, category, avatar_url, description,
        is_private, parish_id, member_count,
        parishes(name, city)
      )
    `)
    .eq('user_id', userId)
    .then(({ data }) => {
      const result = (data ?? []).filter(d => d.groups).map(d => ({ group: d.groups, role: d.role }))
      _membershipsCache = { userId, data: result, ts: Date.now() }
      _membershipsPromise = null
      return result
    })
    .catch(() => {
      _membershipsPromise = null
      return []
    })
  return _membershipsPromise
}

// ── useGroupMemberships ────────────────────────────────────
export function useGroupMemberships() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [memberships, setMemberships] = useState(() => {
    // Serve cache immediately on mount if valid
    if (_membershipsCache && _membershipsCache.userId === userId &&
        Date.now() - _membershipsCache.ts < MEMBERSHIPS_TTL) {
      return _membershipsCache.data
    }
    return []
  })
  const [loading, setLoading] = useState(
    !(_membershipsCache && _membershipsCache.userId === userId &&
      Date.now() - _membershipsCache.ts < MEMBERSHIPS_TTL)
  )

  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    _invalidateMemberships()
    const result = await _fetchMemberships(userId)
    setMemberships(result)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    const cached = _membershipsCache
    const isFresh = cached && cached.userId === userId && Date.now() - cached.ts < MEMBERSHIPS_TTL
    if (isFresh) {
      setMemberships(cached.data)
      setLoading(false)
      return
    }
    _fetchMemberships(userId).then(result => {
      setMemberships(result)
      setLoading(false)
    })
  }, [userId])

  const memberGroupIds = useMemo(
    () => new Set(memberships.map(m => m.group.id)),
    [memberships]
  )
  const adminGroupIds = useMemo(
    () => new Set(memberships.filter(m => m.role === 'admin').map(m => m.group.id)),
    [memberships]
  )

  return { memberships, memberGroupIds, adminGroupIds, loading, refresh }
}

// ── useGroupSearch ─────────────────────────────────────────
export function useGroupSearch(query = '', categoryFilter = null) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)

      let q = supabase
        .from('groups')
        .select(`
          id, name, category, avatar_url, description,
          is_private, parish_id, member_count,
          parishes(name, city)
        `)
        .order('member_count', { ascending: false })
        .limit(50)

      if (query.trim().length >= 2) {
        q = q.ilike('name', `%${query.trim()}%`)
      }
      if (categoryFilter) {
        q = q.eq('category', categoryFilter)
      }

      const { data, error: err } = await q
      if (err) setError(err.message)
      else setGroups(data ?? [])
      setLoading(false)
    }, 350)

    return () => clearTimeout(debounceRef.current)
  }, [query, categoryFilter])

  return { groups, loading, error }
}

// ── useSuggestedGroups ─────────────────────────────────────
export function useSuggestedGroups() {
  const { user, profile } = useAuth()
  const [suggested, setSuggested] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    async function load() {
      const queries = []

      // 1. Groups from user's parish
      if (profile?.parish_id) {
        queries.push(
          supabase.from('groups')
            .select('id, name, category, avatar_url, description, is_private, parish_id, member_count, parishes(name, city)')
            .eq('parish_id', profile.parish_id)
            .order('member_count', { ascending: false })
            .limit(4)
        )
      }

      // 2. Groups by vocation
      const vocationCategory = {
        married: 'families',
        single: 'young_adults',
        ordained: 'parish',
        religious: 'parish',
      }[profile?.vocation_state]

      if (vocationCategory) {
        queries.push(
          supabase.from('groups')
            .select('id, name, category, avatar_url, description, is_private, parish_id, member_count, parishes(name, city)')
            .eq('category', vocationCategory)
            .order('member_count', { ascending: false })
            .limit(4)
        )
      }

      // 3. Popular fallback
      queries.push(
        supabase.from('groups')
          .select('id, name, category, avatar_url, description, is_private, parish_id, member_count, parishes(name, city)')
          .order('member_count', { ascending: false })
          .limit(6)
      )

      const results = await Promise.all(queries)
      const seen = new Set()
      const combined = []
      for (const res of results) {
        for (const g of res.data ?? []) {
          if (!seen.has(g.id)) { seen.add(g.id); combined.push(g) }
          if (combined.length >= 6) break
        }
        if (combined.length >= 6) break
      }

      setSuggested(combined)
      setLoading(false)
    }

    load()
  }, [user?.id, profile?.parish_id, profile?.vocation_state]) // eslint-disable-line react-hooks/exhaustive-deps

  return { suggested, loading }
}

// ── useGroup ───────────────────────────────────────────────
export function useGroup(groupId) {
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('groups')
      .select(`
        *,
        parish:parishes!parish_id(id, name, city, state),
        creator:profiles!creator_id(id, full_name, avatar_url),
        group_members(count)
      `)
      .eq('id', groupId)
      .single()

    if (err) setError(err.message)
    else setGroup(data)
    setLoading(false)
  }, [groupId])

  useEffect(() => { fetch() }, [fetch])

  return { group, loading, error, refresh: fetch }
}

// ── useGroupMembers ────────────────────────────────────────
export function useGroupMembers(groupId) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('group_members')
      .select(`
        user_id, role, joined_at,
        profiles(id, full_name, avatar_url, is_verified_clergy, vocation_state)
      `)
      .eq('group_id', groupId)
      .order('joined_at')

    if (err) setError(err.message)
    else {
      // Sort: admins first, then moderators, then members
      const order = { admin: 0, moderator: 1, member: 2 }
      setMembers((data ?? []).sort((a, b) => (order[a.role] ?? 2) - (order[b.role] ?? 2)))
    }
    setLoading(false)
  }, [groupId])

  useEffect(() => { fetch() }, [fetch])

  return { members, loading, error, refresh: fetch }
}

// ── useGroupJoin ───────────────────────────────────────────
export function useGroupJoin() {
  const { user, profile } = useAuth()
  const [pendingRequests, setPendingRequests] = useState([])
  const [requestedGroupIds, setRequestedGroupIds] = useState(new Set())

  // Load pending requests (for groups where user is admin)
  const loadPendingRequests = useCallback(async (adminGroupIds) => {
    if (!user || adminGroupIds.size === 0) return
    const ids = Array.from(adminGroupIds)
    const { data } = await supabase
      .from('group_join_requests')
      .select(`
        id, created_at, group_id,
        user:profiles!user_id(id, full_name, avatar_url, vocation_state)
      `)
      .eq('status', 'pending')
      .in('group_id', ids)

    setPendingRequests(data ?? [])
  }, [user])

  // Load groups where current user has pending requests
  const loadMyRequests = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('group_join_requests')
      .select('group_id')
      .eq('user_id', user.id)
      .eq('status', 'pending')

    setRequestedGroupIds(new Set((data ?? []).map(r => r.group_id)))
  }, [user])

  useEffect(() => { loadMyRequests() }, [loadMyRequests])

  const joinGroup = useCallback(async (groupId, onSuccess) => {
    if (!user) return
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: user.id, role: 'member' })

    if (error) {
      toast.error('Could not join group. Please try again.')
      return { error }
    }

    // Increment member_count
    await supabase.rpc('increment_member_count', { group_id_param: groupId }).catch(() => {})
    _invalidateMemberships()
    onSuccess?.()
    return { error: null }
  }, [user])

  const leaveGroup = useCallback(async (groupId, adminGroupIds, onSuccess) => {
    if (!user) return

    // Block if only admin
    if (adminGroupIds?.has(groupId)) {
      const { data } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', groupId)
        .eq('role', 'admin')
      if ((data ?? []).length <= 1) {
        toast.error('You are the only admin. Promote another member before leaving.')
        return { error: 'only_admin' }
      }
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    if (error) {
      toast.error('Could not leave group. Please try again.')
      return { error }
    }

    _invalidateMemberships()
    onSuccess?.()
    return { error: null }
  }, [user])

  const requestToJoin = useCallback(async (groupId, groupName) => {
    if (!user) return

    // Check for existing
    const { data: existing } = await supabase
      .from('group_join_requests')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing?.status === 'pending') {
      toast.error('Request already sent.')
      return { error: 'already_requested' }
    }

    const { error } = await supabase
      .from('group_join_requests')
      .upsert({ group_id: groupId, user_id: user.id, status: 'pending' }, { onConflict: 'group_id,user_id' })

    if (error) {
      toast.error('Could not send request. Please try again.')
      return { error }
    }

    // Optimistic update
    setRequestedGroupIds(prev => new Set([...prev, groupId]))

    // Notify group admins
    const { data: admins } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('role', 'admin')

    for (const admin of admins ?? []) {
      await createNotification({
        userId: admin.user_id,
        type: 'group_request',
        referenceId: groupId,
        message: `${profile?.full_name ?? 'Someone'} requested to join ${groupName}`,
        actorId: user.id,
      })
    }

    return { error: null }
  }, [user, profile])

  const approveRequest = useCallback(async (requestId, requestUserId, groupId, groupName, onSuccess) => {
    if (!user) return

    // Update request status
    await supabase
      .from('group_join_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)

    // Insert into group_members
    await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: requestUserId, role: 'member' })

    _invalidateMemberships()
    // Remove from pending list
    setPendingRequests(prev => prev.filter(r => r.id !== requestId))

    // Notify approved user
    await createNotification({
      userId: requestUserId,
      type: 'group_request_response',
      referenceId: groupId,
      message: `Your request to join ${groupName} was approved`,
      actorId: user.id,
    })

    onSuccess?.()
  }, [user])

  const denyRequest = useCallback(async (requestId, requestUserId, groupId, groupName) => {
    if (!user) return

    await supabase
      .from('group_join_requests')
      .update({ status: 'denied' })
      .eq('id', requestId)

    setPendingRequests(prev => prev.filter(r => r.id !== requestId))

    await createNotification({
      userId: requestUserId,
      type: 'group_request_response',
      referenceId: groupId,
      message: `Your request to join ${groupName} was not approved`,
      actorId: user.id,
    })
  }, [user])

  const hasRequested = useCallback((groupId) => {
    return requestedGroupIds.has(groupId)
  }, [requestedGroupIds])

  return {
    joinGroup,
    leaveGroup,
    requestToJoin,
    approveRequest,
    denyRequest,
    hasRequested,
    pendingRequests,
    loadPendingRequests,
    requestedGroupIds,
  }
}
