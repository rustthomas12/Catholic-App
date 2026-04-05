import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

const DEFAULT_PAGE_SIZE = 20

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

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Tracks followed parish IDs and joined group IDs
  const followedParishIds = useRef([])
  const joinedGroupIds = useRef([])

  // Pagination offset — useRef avoids spurious re-renders
  const offsetRef = useRef(0)

  // Channel ref for cleanup
  const channelRef = useRef(null)
  const channelIdRef = useRef(0)

  // ── Fetch user's social graph once ────────────────────────
  const loadSocialGraph = useCallback(async () => {
    if (!user) return

    const [parishRes, groupRes] = await Promise.all([
      supabase.from('parish_follows').select('parish_id').eq('user_id', user.id),
      supabase.from('group_members').select('group_id').eq('user_id', user.id),
    ])

    followedParishIds.current = (parishRes.data ?? []).map((r) => r.parish_id)
    joinedGroupIds.current = (groupRes.data ?? []).map((r) => r.group_id)
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
  const fetchPage = useCallback(
    async (offset, append = false) => {
      if (!user) return

      const query = buildQuery(offset)
      if (query === null) {
        setPosts([])
        setHasMore(false)
        setLoading(false)
        setLoadingMore(false)
        return
      }

      const { data, error: queryError } = await query

      if (queryError) {
        setError(queryError.message)
        setLoading(false)
        setLoadingMore(false)
        return
      }

      const normalised = (data ?? []).map((p) => normalisePost(p, user.id))

      setPosts((prev) => (append ? [...prev, ...normalised] : normalised))
      setHasMore(normalised.length === pageSize)
      setError(null)

      if (!append) setTotalCount(normalised.length)
      else setTotalCount((c) => c + normalised.length)

      setLoading(false)
      setLoadingMore(false)
    },
    [user, buildQuery, pageSize]
  )

  // ── Initial load ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    setLoading(true)
    offsetRef.current = 0

    loadSocialGraph().then(() => {
      fetchPage(0, false)
    })
  }, [user, filter, parishId, groupId, userId, loadSocialGraph, fetchPage])

  // ── Real-time subscription ─────────────────────────────────
  useEffect(() => {
    if (!user) return

    // Clean up existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    channelIdRef.current += 1
    const channelName = `feed-${filter}-${parishId ?? ''}-${groupId ?? ''}-${userId ?? ''}-${channelIdRef.current}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const newPostId = payload.new?.id
          if (!newPostId) return

          // Fetch full post with all joins before adding to feed
          const { data, error: fetchError } = await supabase
            .from('posts')
            .select(POST_SELECT)
            .eq('id', newPostId)
            .is('deleted_at', null)
            .eq('is_removed', false)
            .single()

          if (fetchError || !data) return

          const normalised = normalisePost(data, user.id)

          // Only add if it matches the current scope
          const matchesFilter = checkPostMatchesFilter(normalised, {
            filter,
            parishId,
            groupId,
            userId,
            followedParishIds: followedParishIds.current,
            joinedGroupIds: joinedGroupIds.current,
          })
          if (!matchesFilter) return

          setPosts((prev) => {
            // Avoid duplicates (optimistic post already added)
            if (prev.some((p) => p.id === normalised.id)) return prev
            return [normalised, ...prev]
          })
          setTotalCount((c) => c + 1)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [user, filter, parishId, groupId, userId])

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
      return [post, ...prev]
    })
    setTotalCount((c) => c + 1)
  }, [])

  const updatePost = useCallback((id, updates) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }, [])

  const removePost = useCallback((id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    setTotalCount((c) => Math.max(0, c - 1))
  }, [])

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

// ── Helper — filter check for real-time inserts ────────────
function checkPostMatchesFilter(post, { filter, parishId, groupId, userId, followedParishIds, joinedGroupIds }) {
  if (userId) return post.author?.id === userId
  if (groupId) return post.group?.id === groupId
  if (parishId) return post.parish?.id === parishId

  switch (filter) {
    case 'parish':
      return post.parish && followedParishIds.includes(post.parish.id)
    case 'groups':
      return post.group && joinedGroupIds.includes(post.group.id)
    case 'prayer':
      return (
        post.is_prayer_request &&
        ((post.parish && followedParishIds.includes(post.parish.id)) ||
          (post.group && joinedGroupIds.includes(post.group.id)))
      )
    case 'events':
      return false
    case 'all':
    default:
      return (
        (post.parish && followedParishIds.includes(post.parish.id)) ||
        (post.group && joinedGroupIds.includes(post.group.id))
      )
  }
}
