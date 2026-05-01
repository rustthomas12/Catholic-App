import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

const DEFAULT_PAGE_SIZE = 20
const FEED_TTL   = 3  * 60 * 1000  // 3 min
const GRAPH_TTL  = 10 * 60 * 1000  // 10 min

// ── Module-level caches (same-session navigation) ──────────
const _feedCache  = new Map() // cacheKey → { posts, hasMore, ts }
const _graphCache = new Map() // userId   → { parishIds, groupIds, ts }

export function clearFeedCaches() {
  _feedCache.clear()
  _graphCache.clear()
  // Clear localStorage feed/graph entries
  try {
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('parish_feed_') || key.startsWith('parish_graph_'))) {
        toRemove.push(key)
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k))
  } catch { /* ignore */ }
}

function getFeedKey(userId, filter, parishId, groupId, orgId) {
  return `${userId}-${filter}-${parishId}-${groupId}-${orgId}`
}

// ── localStorage helpers ───────────────────────────────────
// Persist feed + graph across page refreshes so content shows instantly.

function _lsFeedKey(cacheKey)    { return `parish_feed_${cacheKey}` }
function _lsGraphKey(userId)     { return `parish_graph_${userId}` }

function _getStoredFeed(cacheKey) {
  try {
    const raw = localStorage.getItem(_lsFeedKey(cacheKey))
    if (!raw) return null
    const p = JSON.parse(raw)
    if (Date.now() - p.ts > FEED_TTL) return null
    return p
  } catch { return null }
}

function _setStoredFeed(cacheKey, posts, hasMore) {
  try {
    localStorage.setItem(_lsFeedKey(cacheKey), JSON.stringify({ posts, hasMore, ts: Date.now() }))
  } catch { /* storage quota */ }
}

function _clearStoredFeed(cacheKey) {
  try { localStorage.removeItem(_lsFeedKey(cacheKey)) } catch { /* ignore */ }
}

function _getStoredGraph(userId) {
  try {
    const raw = localStorage.getItem(_lsGraphKey(userId))
    if (!raw) return null
    const p = JSON.parse(raw)
    if (Date.now() - p.ts > GRAPH_TTL) return null
    return p
  } catch { return null }
}

function _setStoredGraph(userId, parishIds, groupIds, parentOrgIds) {
  try {
    localStorage.setItem(_lsGraphKey(userId), JSON.stringify({ parishIds, groupIds, parentOrgIds, ts: Date.now() }))
  } catch { /* storage quota */ }
}

// ── Post shape ─────────────────────────────────────────────
const POST_SELECT = `
  *,
  author:profiles!author_id(
    id, full_name, username, avatar_url,
    is_verified_clergy, is_premium, is_patron
  ),
  parish:parishes!parish_id(id, name, city, state),
  group:groups!group_id(id, name),
  org:organizations!org_id(id, name, org_type),
  likes(user_id),
  comments(id)
`

function normalisePost(raw, currentUserId) {
  const likes    = raw.likes    ?? []
  const comments = raw.comments ?? []
  return {
    id:               raw.id,
    content:          raw.content,
    image_url:        raw.image_url        ?? null,
    is_prayer_request: raw.is_prayer_request ?? false,
    is_announcement:  raw.is_announcement  ?? false,
    is_anonymous:     raw.is_anonymous     ?? false,
    is_removed:       raw.is_removed       ?? false,
    created_at:       raw.created_at,
    author:           raw.author           ?? null,
    parish:           raw.parish           ?? null,
    group:            raw.group            ?? null,
    org:              raw.org              ?? null,
    org_id:           raw.org_id           ?? null,
    like_count:       likes.length,
    comment_count:    comments.length,
    is_liked_by_me:   likes.some((l) => l.user_id === currentUserId),
  }
}

// ── useFeed ────────────────────────────────────────────────
export function useFeed(options = {}) {
  const {
    filter   = 'all',
    parishId = null,
    groupId  = null,
    orgId    = null,
    userId   = null,
    pageSize = DEFAULT_PAGE_SIZE,
  } = options

  const { user } = useAuth()
  const userId_stable = user?.id ?? null

  // ── Synchronous initialisation from localStorage ──────────
  // On first render (including page refresh) we try to serve cached posts
  // immediately so the UI never shows a loading skeleton.
  const _initFromStorage = () => {
    if (!userId_stable) return { posts: [], hasMore: true, loading: true }
    const cacheKey = getFeedKey(userId_stable, filter, parishId, groupId, orgId)

    // Module cache (same-session navigation)
    const mc = _feedCache.get(cacheKey)
    if (mc && Date.now() - mc.ts < FEED_TTL) {
      return { posts: mc.posts, hasMore: mc.hasMore, loading: false }
    }

    // localStorage (page refresh)
    const ls = _getStoredFeed(cacheKey)
    if (ls) {
      // Warm the module cache too
      _feedCache.set(cacheKey, ls)
      return { posts: ls.posts, hasMore: ls.hasMore, loading: false }
    }

    return { posts: [], hasMore: true, loading: true }
  }

  const _init = _initFromStorage()

  const [posts,       setPosts]       = useState(_init.posts)
  const [loading,     setLoading]     = useState(_init.loading)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,       setError]       = useState(null)
  const [hasMore,     setHasMore]     = useState(_init.hasMore)
  const [totalCount,  setTotalCount]  = useState(_init.posts.length)

  // Pre-seed social-graph refs from localStorage so buildQuery has data
  // on the very first call without waiting for loadSocialGraph to finish.
  const _storedGraph    = userId_stable ? _getStoredGraph(userId_stable) : null
  const followedParishIds = useRef(_storedGraph?.parishIds    ?? [])
  const joinedGroupIds    = useRef(_storedGraph?.groupIds     ?? [])
  const parentOrgIds      = useRef(_storedGraph?.parentOrgIds ?? [])

  const offsetRef    = useRef(_init.posts.length)

  // ── Social graph builder ──────────────────────────────────
  async function _buildGraph(uid) {
    const [pr, gr, ar, om] = await Promise.all([
      supabase.from('parish_follows').select('parish_id').eq('user_id', uid),
      supabase.from('group_members').select('group_id').eq('user_id', uid),
      supabase.from('parish_admins').select('parish_id').eq('user_id', uid),
      supabase.from('organization_members').select('org_id').eq('user_id', uid),
    ])
    const followed  = (pr.data ?? []).map(r => r.parish_id)
    const admined   = (ar.data ?? []).map(r => r.parish_id)
    const parishIds = [...new Set([...followed, ...admined])]
    const groupIds  = (gr.data ?? []).map(r => r.group_id)

    // Find parent org IDs for any chapters the user is a member of
    const memberOrgIds = (om.data ?? []).map(r => r.org_id)
    let parentOrgIdsList = []
    if (memberOrgIds.length > 0) {
      const { data: chapterOrgs } = await supabase
        .from('organizations')
        .select('parent_org_id')
        .in('id', memberOrgIds)
        .eq('org_type', 'chapter')
        .not('parent_org_id', 'is', null)
      parentOrgIdsList = [...new Set((chapterOrgs ?? []).map(o => o.parent_org_id).filter(Boolean))]
    }

    return { parishIds, groupIds, parentOrgIds: parentOrgIdsList }
  }

  // ── Social graph loader ───────────────────────────────────
  // module cache → localStorage → Supabase
  const loadSocialGraph = useCallback(async () => {
    if (!user) return

    const mc = _graphCache.get(user.id)
    if (mc && Date.now() - mc.ts < GRAPH_TTL) {
      followedParishIds.current = mc.parishIds
      joinedGroupIds.current    = mc.groupIds
      parentOrgIds.current      = mc.parentOrgIds ?? []
      return
    }

    const stored = _getStoredGraph(user.id)
    if (stored) {
      followedParishIds.current = stored.parishIds
      joinedGroupIds.current    = stored.groupIds
      parentOrgIds.current      = stored.parentOrgIds ?? []
      _graphCache.set(user.id, stored)
      // Revalidate silently in background
      _buildGraph(user.id).then(g => {
        followedParishIds.current = g.parishIds
        joinedGroupIds.current    = g.groupIds
        parentOrgIds.current      = g.parentOrgIds
        _graphCache.set(user.id, { ...g, ts: Date.now() })
        _setStoredGraph(user.id, g.parishIds, g.groupIds, g.parentOrgIds)
      })
      return
    }

    // No cache — must await
    const g = await _buildGraph(user.id)
    followedParishIds.current = g.parishIds
    joinedGroupIds.current    = g.groupIds
    parentOrgIds.current      = g.parentOrgIds
    _graphCache.set(user.id, { ...g, ts: Date.now() })
    _setStoredGraph(user.id, g.parishIds, g.groupIds, g.parentOrgIds)
  }, [user])

  // ── Query builder ─────────────────────────────────────────
  const buildQuery = useCallback((offset) => {
    let q = supabase
      .from('posts')
      .select(POST_SELECT)
      .is('deleted_at', null)
      .eq('is_removed', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (userId)   return q.eq('author_id', userId)
    if (orgId)    return q.eq('org_id',    orgId)
    if (groupId)  return q.eq('group_id',  groupId)
    if (parishId) return q.eq('parish_id', parishId)

    switch (filter) {
      case 'parish': {
        const ids = followedParishIds.current
        if (ids.length === 0) return null
        // Parish-only posts (no group context, no org context)
        return q.in('parish_id', ids).is('group_id', null).is('org_id', null)
      }
      case 'groups': {
        const ids = joinedGroupIds.current
        return ids.length === 0 ? null : q.in('group_id', ids)
      }
      case 'prayer': {
        q = q.eq('is_prayer_request', true)
        const pIds = followedParishIds.current
        const gIds = joinedGroupIds.current
        if (pIds.length === 0 && gIds.length === 0) return null
        const parts = []
        if (pIds.length > 0) parts.push(`parish_id.in.(${pIds.join(',')})`)
        if (gIds.length > 0) parts.push(`group_id.in.(${gIds.join(',')})`)
        return q.or(parts.join(','))
      }
      case 'events': return null
      case 'all':
      default: {
        const pIds = followedParishIds.current
        const gIds = joinedGroupIds.current
        const oIds = parentOrgIds.current
        if (pIds.length === 0 && gIds.length === 0 && oIds.length === 0) return null
        // Show parish posts (no group) + group posts from joined groups + inherited national org posts
        const parts = []
        if (pIds.length > 0) parts.push(`and(parish_id.in.(${pIds.join(',')}),group_id.is.null,org_id.is.null)`)
        if (gIds.length > 0) parts.push(`group_id.in.(${gIds.join(',')})`)
        if (oIds.length > 0) parts.push(`org_id.in.(${oIds.join(',')})`)
        return q.or(parts.join(','))
      }
    }
  }, [filter, parishId, groupId, orgId, userId, pageSize])

  // ── Fetch a page ──────────────────────────────────────────
  const fetchPage = useCallback(async (offset, append = false, background = false) => {
    if (!user) return

    const query = buildQuery(offset)
    if (query === null) {
      if (!background) { setPosts([]); setHasMore(false); setLoading(false); setLoadingMore(false) }
      return
    }

    const { data, error: queryError } = await query
    if (queryError) {
      if (!background) { setError(queryError.message); setLoading(false); setLoadingMore(false) }
      return
    }

    const normalised = (data ?? []).map((p) => normalisePost(p, user.id))
    const newHasMore = normalised.length === pageSize

    if (!append) {
      const cacheKey = getFeedKey(user.id, filter, parishId, groupId, orgId)
      _feedCache.set(cacheKey, { posts: normalised, hasMore: newHasMore, ts: Date.now() })
      _setStoredFeed(cacheKey, normalised, newHasMore)
    }

    setPosts((prev) => append ? [...prev, ...normalised] : normalised)
    setHasMore(newHasMore)
    setError(null)
    if (!append) setTotalCount(normalised.length)
    else         setTotalCount((c) => c + normalised.length)
    setLoading(false)
    setLoadingMore(false)
  }, [user, buildQuery, pageSize, filter, parishId, groupId, orgId])

  // ── refresh — defined here so visibilitychange useEffect can depend on it ──
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    offsetRef.current = 0
    await loadSocialGraph()
    fetchPage(0, false)
  }, [loadSocialGraph, fetchPage])

  // ── Initial load effect ───────────────────────────────────
  useEffect(() => {
    if (!userId_stable) {
      // Not authenticated or session not yet resolved — stop loading immediately.
      // ProtectedRoute will redirect unauthenticated users; authenticated users
      // will re-trigger this effect when userId_stable changes from null to a value.
      setLoading(false)
      setPosts([])
      setHasMore(false)
      return
    }

    const cacheKey = getFeedKey(userId_stable, filter, parishId, groupId, orgId)

    // Module cache hit — serve instantly, revalidate in background
    const mc = _feedCache.get(cacheKey)
    if (mc && Date.now() - mc.ts < FEED_TTL) {
      setPosts(mc.posts)
      setHasMore(mc.hasMore)
      setLoading(false)
      offsetRef.current = mc.posts.length
      loadSocialGraph().then(() => fetchPage(0, false, true))
      return
    }

    // localStorage hit — serve instantly, revalidate in background
    const ls = _getStoredFeed(cacheKey)
    if (ls) {
      _feedCache.set(cacheKey, ls)
      setPosts(ls.posts)
      setHasMore(ls.hasMore)
      setLoading(false)
      offsetRef.current = ls.posts.length
      loadSocialGraph().then(() => fetchPage(0, false, true))
      return
    }

    // Nothing cached — show skeleton and fetch
    setLoading(true)
    offsetRef.current = 0
    loadSocialGraph().then(() => fetchPage(0, false))
  }, [userId_stable, filter, parishId, groupId, orgId, loadSocialGraph, fetchPage])

  // ── Foreground refresh (iOS / PWA background→foreground) ──
  // When the app is backgrounded on iOS, module-level Maps may be GC'd and the
  // feed TTL can expire. On resume, no React lifecycle re-triggers automatically.
  // visibilitychange fires when the tab/app comes back into view so we can
  // refresh stale data without requiring a hard reload.
  useEffect(() => {
    if (!userId_stable) return

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      const cacheKey = getFeedKey(userId_stable, filter, parishId, groupId, orgId)
      const mc = _feedCache.get(cacheKey)
      const isStale = !mc || (Date.now() - mc.ts > FEED_TTL)
      if (isStale) {
        refresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [userId_stable, filter, parishId, groupId, orgId, refresh])

  // ── Public API ────────────────────────────────────────────

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    offsetRef.current += pageSize
    fetchPage(offsetRef.current, true)
  }, [loadingMore, hasMore, pageSize, fetchPage])

  const addPost = useCallback((post) => {
    setPosts((prev) => {
      if (prev.some((p) => p.id === post.id)) return prev
      const next = [post, ...prev]
      if (user) {
        const cacheKey = getFeedKey(user.id, filter, parishId, groupId, orgId)
        _feedCache.delete(cacheKey)
        _clearStoredFeed(cacheKey)
      }
      return next
    })
    setTotalCount((c) => c + 1)
  }, [user, filter, parishId, groupId, orgId])

  const updatePost = useCallback((id, updates) => {
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p))
  }, [])

  const removePost = useCallback((id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    setTotalCount((c) => Math.max(0, c - 1))
    if (userId_stable) {
      const cacheKey = getFeedKey(userId_stable, filter, parishId, groupId, orgId)
      _feedCache.delete(cacheKey)
      _clearStoredFeed(cacheKey)
    }
  }, [userId_stable, filter, parishId, groupId, orgId])

  return {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    addPost,
    updatePost,
    removePost,
  }
}
