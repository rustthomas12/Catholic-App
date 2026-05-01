import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'
import { createNotification } from '../lib/notifications'
import { toast } from '../components/shared/Toast'

// ── Memberships module-level cache (shared across all hook instances) ──────
let _membershipsCache = null        // { userId, data, ts }
let _membershipsPromise = null      // in-flight request
const MEMBERSHIPS_TTL = 60_000     // 1 minute

// ── User access cache (followed parishes + member orgs) ──────────────────
let _accessCache = null             // { userId, parishIds, orgIds, ts }
let _accessPromise = null
const ACCESS_TTL = 60_000

async function _fetchUserAccess(userId, profileParishId) {
  if (_accessPromise) return _accessPromise

  _accessPromise = Promise.all([
    supabase.from('parish_follows').select('parish_id').eq('user_id', userId),
    supabase.from('organization_members').select('org_id').eq('user_id', userId),
  ]).then(([pRes, oRes]) => {
    const parishIds = new Set((pRes.data ?? []).map(r => r.parish_id))
    if (profileParishId) parishIds.add(profileParishId)
    const orgIds = new Set((oRes.data ?? []).map(r => r.org_id))
    const result = { userId, parishIds, orgIds, ts: Date.now() }
    _accessCache = result
    _accessPromise = null
    return result
  }).catch(() => {
    _accessPromise = null
    return { userId, parishIds: new Set(), orgIds: new Set(), ts: Date.now() }
  })

  return _accessPromise
}

function _invalidateAccess() {
  _accessCache = null
  _accessPromise = null
}

function _invalidateMemberships() {
  _membershipsCache = null
  _membershipsPromise = null
}

export function clearGroupCaches() {
  _membershipsCache = null
  _membershipsPromise = null
  _invalidateAccess()
}

async function _fetchMemberships(userId) {
  if (_membershipsPromise) return _membershipsPromise

  _membershipsPromise = Promise.race([
    supabase
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
      .then(({ data, error }) => {
        if (error) {
          console.error('[_fetchMemberships] error:', error.message)
          _membershipsPromise = null
          return []
        }
        const result = (data ?? []).filter(d => d.groups).map(d => ({ group: d.groups, role: d.role }))
        _membershipsCache = { userId, data: result, ts: Date.now() }
        _membershipsPromise = null
        return result
      })
      .catch(err => {
        console.error('[_fetchMemberships] error:', err)
        _membershipsPromise = null
        return []
      }),

    new Promise(resolve => setTimeout(() => {
      _membershipsPromise = null
      resolve([])
    }, 8000)),
  ])

  return _membershipsPromise
}

// ── useGroupMemberships ────────────────────────────────────
export function useGroupMemberships() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    _invalidateMemberships()
    const result = await _fetchMemberships(userId)
    setMemberships(result)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setMemberships([])
      setLoading(false)
      return
    }
    const cached = _membershipsCache
    const isFresh = cached && cached.userId === userId && Date.now() - cached.ts < MEMBERSHIPS_TTL
    if (isFresh) {
      setMemberships(cached.data)
      setLoading(false)
      return
    }
    _fetchMemberships(userId)
      .then(result => { setMemberships(result) })
      .catch(() => { setMemberships([]) })
      .finally(() => { setLoading(false) })
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
  const { user, profile } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!user) { setGroups([]); setLoading(false); return }
      setLoading(true)
      setError(null)

      // Fetch user's access in parallel with the group query
      const accessCached = _accessCache
      const accessFresh = accessCached && accessCached.userId === user.id && Date.now() - accessCached.ts < ACCESS_TTL
      const [access, queryResult] = await Promise.all([
        accessFresh ? Promise.resolve(accessCached) : _fetchUserAccess(user.id, profile?.parish_id),
        (() => {
          let q = supabase
            .from('groups')
            .select(`
              id, name, category, avatar_url, description,
              is_private, parish_id, org_id, member_count,
              parishes(name, city)
            `)
            .order('member_count', { ascending: false })
            .limit(100)

          if (query.trim().length >= 2) q = q.ilike('name', `%${query.trim()}%`)
          if (categoryFilter) q = q.eq('category', categoryFilter)
          return q
        })(),
      ])

      if (queryResult.error) { setError(queryResult.error.message); setLoading(false); return }

      // Only show groups the user has access to (follows parish or member of org)
      const filtered = (queryResult.data ?? []).filter(g =>
        (g.parish_id && access.parishIds.has(g.parish_id)) ||
        (g.org_id && access.orgIds.has(g.org_id))
      )
      setGroups(filtered)
      setLoading(false)
    }, 350)

    return () => clearTimeout(debounceRef.current)
  }, [query, categoryFilter, user?.id, profile?.parish_id]) // eslint-disable-line react-hooks/exhaustive-deps

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
      // Get user's accessible parishes + orgs
      const accessCached = _accessCache
      const accessFresh = accessCached && accessCached.userId === user.id && Date.now() - accessCached.ts < ACCESS_TTL
      const access = accessFresh ? accessCached : await _fetchUserAccess(user.id, profile?.parish_id)

      const queries = []

      // Groups from followed parishes
      if (access.parishIds.size > 0) {
        queries.push(
          supabase.from('groups')
            .select('id, name, category, avatar_url, description, is_private, parish_id, org_id, member_count, parishes(name, city)')
            .in('parish_id', Array.from(access.parishIds))
            .order('member_count', { ascending: false })
            .limit(6)
        )
      }

      // Groups from member orgs
      if (access.orgIds.size > 0) {
        queries.push(
          supabase.from('groups')
            .select('id, name, category, avatar_url, description, is_private, parish_id, org_id, member_count, parishes(name, city)')
            .in('org_id', Array.from(access.orgIds))
            .order('member_count', { ascending: false })
            .limit(6)
        )
      }

      if (queries.length === 0) { setSuggested([]); return }

      const results = await Promise.all(queries)
      const seen = new Set()
      const combined = []
      for (const res of results) {
        for (const g of res.data ?? []) {
          if (!seen.has(g.id)) { seen.add(g.id); combined.push(g) }
        }
      }
      // Sort by member_count descending
      combined.sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0))

      setSuggested(combined.slice(0, 8))
    }

    load()
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id, profile?.parish_id]) // eslint-disable-line react-hooks/exhaustive-deps

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

    _invalidateMemberships()
    onSuccess?.()

    // Fire-and-forget: notify group admins of new member
    ;(async () => {
      const { data: admins } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('role', 'admin')
        .neq('user_id', user.id)
      if (admins?.length) {
        const { data: grp } = await supabase.from('groups').select('name').eq('id', groupId).single()
        await supabase.from('notifications').insert(
          admins.map(a => ({
            user_id: a.user_id,
            type: 'new_group_member',
            reference_id: groupId,
            message: `Someone joined ${grp?.name || 'your group'}`,
            actor_id: user.id,
            is_read: false,
          }))
        )
      }
    })()

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

    // If a rejected record exists, delete it before re-inserting
    // (upsert requires UPDATE permission which RLS may not grant)
    if (existing) {
      await supabase.from('group_join_requests').delete().eq('id', existing.id)
    }

    const { error } = await supabase
      .from('group_join_requests')
      .insert({ group_id: groupId, user_id: user.id, status: 'pending' })

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
