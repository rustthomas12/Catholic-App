import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

const DEFAULT_PAGE_SIZE = 20

// ── Module-level cache ─────────────────────────────────────
const FEED_TTL = 3 * 60 * 1000
const GRAPH_TTL = 10 * 60 * 1000

const _feedCache = new Map()  // cacheKey → { posts, hasMore, ts }
const _graphCache = new Map() // userId → { parishIds, groupIds, ts }

// ── localStorage-backed social graph ──────────────────────
// Persists across page refreshes so the feed can load in one round-trip
// instead of two (graph fetch → then feed fetch sequentially).
function _lsGraphKey(userId) { return `parish_graph_${userId}` }

function _getStoredGraph(userId) {
  try {
    const raw = localStorage.getItem(_lsGraphKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.ts > GRAPH_TTL) return null
    return parsed
  } catch { return null }
}

function _setStoredGraph(userId, parishIds, groupIds) {
  try {
    localStorage.setItem(_lsGraphKey(userId), JSON.stringify({
      parishIds, groupIds, ts: Date.now()
    }))
  } catch { /* quota */ }
}

function getFeedKey(userId, filter, parishId, groupId) {
  return `${userId}-${filter}-${parishId}-${groupId}`
}

const POST_SELECT = `
  *,
  author:profiles!author_id(
    id, full_name, avatar_url,
    is_verified_clergy, is_premium, is_patron
  ),
  parish:parishes!parish_id(id, name, city, state),
  group:groups!group_id(id, name),
  likes(user_id),
  comments(id)
`

/**
 * Normalises a raw Supabase post row into the shape
 * that PostCard and Feed components expect.
 */
function normalisePost(raw, currentUserId) {
  const likes = raw.likes ?? []
  const comments = raw.comments ?? []
  return {
    id: raw.id,
    content: raw.content,
    image_url: raw.image_url ?? null,
    is_prayer_request: raw.is_prayer_request ?? false,
    is_anonymous: raw.is_anonymous ?? false,
    is_removed: raw.is_removed ?? false,
    created_at: raw.created_at,
    author: raw.author ?? null,
    parish: raw.parish ?? null,
    group: raw.group ?? null,
    like_count: likes.length,
    comment_count: comments.length,
    is_liked_by_me: likes.some((l) => l.user_id === currentUserId),
  }
}

/**
 * useFeed — powers the entire feed system.
 *
 * @param {object} options
 * @param {'all'|'parish'|'groups'|'prayer'|'events'} [options.filter='all']
 * @param {string|null} [options.parishId]    — scope to a specific parish
 * @param {string|null} [options.groupId]     — scope to a specific group
 * @param {string|null} [options.userId]      — scope to a specific author
 * @param {number}      [options.pageSize=20]
 */
export function useFeed(options = {}) {
  const {
    filter = 'all',
    parishId = null,
    groupId = null,
    userId = null,
    pageSize = DEFAULT_PAGE_SIZE,
  } = options

  const { user } = useAuth()
  // Stable user ID reference — prevents feed re-fetch when auth fires
  // onAuthStateChange with a new object reference for the same user.
  const userId_stable = user?.id ?? null

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Tracks followed parish IDs and joined group IDs.
  // Pre-seed from localStorage so the first buildQuery call has data.
  const _storedGraph = userId_stable ? _getStoredGraph(userId_stable) : null
  const followedParishIds = useRef(_storedGraph?.parishIds ?? [])
  const joinedGroupIds = useRef(_storedGraph?.groupIds ?? [])

  // Pagination offset — useRef avoids spurious re-renders
  const offsetRef = useRef(0)

  // Channel ref for cleanup
  const channelRef = useRef(null)

  // ── Fetch user's social graph ─────────────────────────────
  // Checks module cache → localStorage → Supabase (in that order).
  // localStorage means a page refresh costs zero extra round-trips.
  const loadSocialGraph = useCallback(async () => {
    if (!user) return

    // 1. Module-level cache (same-session navigation)
    const cached = _graphCache.get(user.id)
    if (cached && Date.now() - cached.ts < GRAPH_TTL) {
      followedParishIds.current = cached.parishIds
      joinedGroupIds.current = cached.groupIds
      return
    }

    // 2. localStorage (page refresh — instant, no network)
    const stored = _getStoredGraph(user.id)
    if (stored) {
      followedParishIds.current = stored.parishIds
      joinedGroupIds.current = stored.groupIds
      _graphCache.set(user.id, stored)
      // Revalidate in background — don't await
      Promise.all([
        supabase.from('parish_follows').select('parish_id').eq('user_id', user.id),
        supabase.from('group_members').select('group_id').eq('user_id', user.id),
      ]).then(([parishRes, groupRes]) => {
        const parishIds = (parishRes.data ?? []).map((r) => r.parish_id)
        const groupIds = (groupRes.data ?? []).map((r) => r.group_id)
        followedParishIds.current = parishIds
        joinedGroupIds.current = groupIds
        _graphCache.set(user.id, { parishIds, groupIds, ts: Date.now() })
        _setStoredGraph(user.id, parishIds, groupIds)
      })
      return
    }

    // 3. Fresh fetch from Supabase
    const [parishRes, groupRes] = await Promise.all([
      supabase.from('parish_follows').select('parish_id').eq('user_id', user.id),
      supabase.from('group_members').select('group_id').eq('user_id', user.id),
    ])

    const parishIds = (parishRes.data ?? []).map((r) => r.parish_id)
    const groupIds = (groupRes.data ?? []).map((r) => r.group_id)

    followedParishIds.current = parishIds
    joinedGroupIds.current = groupIds
    _graphCache.set(user.id, { parishIds, groupIds, ts: Date.now() })
    _setStoredGraph(user.id, parishIds, groupIds)
  }, [user])

  // ── Build the filtered query ───────────────────────────────
  const buildQuery = useCallback(
    (offset) => {
      let q = supabase
        .from('posts')
        .select(POST_SELECT)
        .is('deleted_at', null)
        .eq('is_removed', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      // Scope to a specific author (ProfilePage)
      if (userId) {
        return q.eq('author_id', userId)
      }

      // Scope to a specific group
      if (groupId) {
        return q.eq('group_id', groupId)
      }

      // Scope to a specific parish
      if (parishId) {
        return q.eq('parish_id', parishId)
      }

      // Filter-based queries for home feed
      switch (filter) {
        case 'parish': {
          const ids = followedParishIds.current
          if (ids.length === 0) return null // nothing to show
          return q.in('parish_id', ids)
        }
        case 'groups': {
          const ids = joinedGroupIds.current
          if (ids.length === 0) return null
          return q.in('group_id', ids)
        }
        case 'prayer': {
          q = q.eq('is_prayer_request', true)
          const pIds = followedParishIds.current
          const gIds = joinedGroupIds.current
          if (pIds.length === 0 && gIds.length === 0) return null
          const filters = []
          if (pIds.length > 0) filters.push(`parish_id.in.(${pIds.join(',')})`)
          if (gIds.length > 0) filters.push(`group_id.in.(${gIds.join(',')})`)
          return q.or(filters.join(','))
        }
        case 'events':
          // Not implemented in Phase 3
          return null
        case 'all':
        default: {
          const pIds = followedParishIds.current
          const gIds = joinedGroupIds.current
          if (pIds.length === 0 && gIds.length === 0) return q // show nothing or all
          const filters = []
          if (pIds.length > 0) filters.push(`parish_id.in.(${pIds.join(',')})`)
          if (gIds.length > 0) filters.push(`group_id.in.(${gIds.join(',')})`)
          return q.or(filters.join(','))
        }
      }
    },
    [filter, parishId, groupId, userId, pageSize]
  )

  // ── Fetch a page of posts ──────────────────────────────────
  // background=true: update state quietly without showing spinner
  const fetchPage = useCallback(
    async (offset, append = false, background = false) => {
      if (!user) return

      const query = buildQuery(offset)
      if (query === null) {
        if (!background) {
          setPosts([])
          setHasMore(false)
          setLoading(false)
          setLoadingMore(false)
        }
        return
      }

      const { data, error: queryError } = await query

      if (queryError) {
        if (!background) {
          setError(queryError.message)
          setLoading(false)
          setLoadingMore(false)
        }
        return
      }

      const normalised = (data ?? []).map((p) => normalisePost(p, user.id))
      const newHasMore = normalised.length === pageSize

      if (!append) {
        // Write to module cache
        const cacheKey = getFeedKey(user.id, filter, parishId, groupId)
        _feedCache.set(cacheKey, { posts: normalised, hasMore: newHasMore, ts: Date.now() })
      }

      setPosts((prev) => (append ? [...prev, ...normalised] : normalised))
      setHasMore(newHasMore)
      setError(null)

      if (!append) setTotalCount(normalised.length)
      else setTotalCount((c) => c + normalised.length)

      setLoading(false)
      setLoadingMore(false)
    },
    [user, buildQuery, pageSize, filter, parishId, groupId]
  )

  // ── Initial load (with module-level cache) ────────────────
  useEffect(() => {
    if (!userId_stable) return

    const cacheKey = getFeedKey(userId_stable, filter, parishId, groupId)
    const cached = _feedCache.get(cacheKey)

    if (cached && Date.now() - cached.ts < FEED_TTL) {
      // Serve from cache immediately — no loading flash
      setPosts(cached.posts)
      setHasMore(cached.hasMore)
      setLoading(false)
      offsetRef.current = cached.posts.length

      // Revalidate in background so stale data gets refreshed
      loadSocialGraph().then(() => fetchPage(0, false, true))
      return
    }

    setLoading(true)
    offsetRef.current = 0
    loadSocialGraph().then(() => fetchPage(0, false))
  }, [userId_stable, filter, parishId, groupId, userId, loadSocialGraph, fetchPage])

  // ── Real-time: disabled in feed to avoid Supabase channel reuse errors.
  // New posts appear instantly via addPost() (optimistic update in CreatePost).
  // Real-time comment subscriptions are handled per-post in usePost.js.

  // ── Public API ─────────────────────────────────────────────

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    offsetRef.current += pageSize
    fetchPage(offsetRef.current, true)
  }, [loadingMore, hasMore, pageSize, fetchPage])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    offsetRef.current = 0
    await loadSocialGraph()
    fetchPage(0, false)
  }, [loadSocialGraph, fetchPage])

  const addPost = useCallback((post) => {
    setPosts((prev) => {
      if (prev.some((p) => p.id === post.id)) return prev
      const next = [post, ...prev]
      // Invalidate cache so next mount re-fetches fresh
      if (user) {
        const cacheKey = getFeedKey(user.id, filter, parishId, groupId)
        _feedCache.delete(cacheKey)
      }
      return next
    })
    setTotalCount((c) => c + 1)
  }, [user, filter, parishId, groupId])

  const updatePost = useCallback((id, updates) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }, [])

  const removePost = useCallback((id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    setTotalCount((c) => Math.max(0, c - 1))
    // Clear cache so the deletion persists across navigations
    if (userId_stable) {
      const cacheKey = getFeedKey(userId_stable, filter, parishId, groupId)
      _feedCache.delete(cacheKey)
    }
  }, [userId_stable, filter, parishId, groupId])

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

