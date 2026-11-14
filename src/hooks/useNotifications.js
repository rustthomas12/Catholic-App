import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

const PAGE_SIZE = 20

const NOTIFICATION_SELECT = `
  id, type, reference_id, message, is_read, created_at,
  actor:profiles!actor_id(id, full_name, avatar_url)
`

// Fired after this tab marks notifications read so every mounted
// useNotifications() instance (page list, nav badge) re-syncs its count.
export const READ_EVENT = 'infold:notifications-read'

// Last first page, shared by every instance (nav badge, page) so opening
// Notifications shows the list at once and refreshes it in the background
let _cache = null // { userId, rows, hasMore }

export function useNotifications() {
  const { user } = useAuth()
  // Depend on the id, not the object: the session refresh at startup swaps in
  // an identical user object, which refetched everything a second time.
  const userId = user?.id

  const cached = _cache && _cache.userId === userId ? _cache : null
  const [notifications, setNotifications] = useState(cached?.rows ?? [])
  const [unreadCount,   setUnreadCount]   = useState(cached ? cached.rows.filter(n => !n.is_read).length : 0)
  const [loading,       setLoading]       = useState(!cached)
  const [loadingMore,   setLoadingMore]   = useState(false)
  const [hasMore,       setHasMore]       = useState(cached?.hasMore ?? false)

  useEffect(() => {
    if (userId && !loading) _cache = { userId, rows: notifications.slice(0, PAGE_SIZE), hasMore }
  }, [userId, loading, notifications, hasMore])

  const listRef      = useRef([])
  useEffect(() => { listRef.current = notifications }, [notifications])
  const offsetRef    = useRef(0)
  const channelRef   = useRef(null)
  const channelSuffix = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`)

  // ── Fetch a page ─────────────────────────────────────────
  const fetchNotifications = useCallback(async (reset = false) => {
    if (!userId) return
    const offset = reset ? 0 : offsetRef.current
    // With something already on screen, refresh quietly instead of flashing skeletons
    if (reset) { if (listRef.current.length === 0) setLoading(true) }
    else       setLoadingMore(true)

    const timeoutId = setTimeout(() => {
      console.warn('[useNotifications] fetch timeout after 8s')
      setLoading(false)
      setLoadingMore(false)
    }, 8000)

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_SELECT)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      clearTimeout(timeoutId)

      if (error) {
        console.error('Failed to fetch notifications:', error.message)
        return
      }

      const rows = data ?? []
      if (reset) {
        setNotifications(rows)
        setUnreadCount(rows.filter(n => !n.is_read).length)
        offsetRef.current = rows.length
      } else {
        setNotifications(prev => [...prev, ...rows])
        setUnreadCount(prev => prev + rows.filter(n => !n.is_read).length)
        offsetRef.current = offsetRef.current + rows.length
      }

      setHasMore(rows.length === PAGE_SIZE)
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('[useNotifications] fetch error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userId])

  // ── Initial load ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }
    fetchNotifications(true)
  }, [userId, fetchNotifications])

  // ── Real-time subscription ────────────────────────────────
  // Each mount increments mountIdRef so the channel name is unique.
  // This prevents the StrictMode double-invoke from hitting the same
  // already-subscribed channel object before removeChannel completes.
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications-${userId}-${channelSuffix.current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          // Fetch the full row with actor join
          const { data } = await supabase
            .from('notifications')
            .select(NOTIFICATION_SELECT)
            .eq('id', payload.new.id)
            .single()

          // A refresh may already have it, and it may already be read (an
          // open conversation clears its message alert right away)
          if (data && !listRef.current.some(n => n.id === data.id)) {
            setNotifications(prev => prev.some(n => n.id === data.id) ? prev : [data, ...prev])
            if (!data.is_read) setUnreadCount(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev =>
            prev.map(n =>
              n.id === payload.new.id ? { ...n, is_read: payload.new.is_read } : n
            )
          )
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId])

  // ── Mark one as read ─────────────────────────────────────
  const markAsRead = useCallback(async (notificationId) => {
    if (!userId) return
    // Swiping away an already-read item used to lower the badge as well
    if (notifications.find(n => n.id === notificationId)?.is_read) return
    // Optimistic
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    // Tell the other instances (nav badge) now rather than after the round trip
    window.dispatchEvent(new CustomEvent(READ_EVENT, { detail: { source: channelSuffix.current, readId: notificationId } }))

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
    window.dispatchEvent(new CustomEvent(READ_EVENT, { detail: channelSuffix.current }))
  }, [userId, notifications])

  // ── Mark all as read ─────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    window.dispatchEvent(new CustomEvent(READ_EVENT, { detail: { source: channelSuffix.current, allRead: true } }))

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    window.dispatchEvent(new CustomEvent(READ_EVENT, { detail: channelSuffix.current }))
  }, [userId])

  // ── Load more ────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) fetchNotifications(false)
  }, [loadingMore, hasMore, fetchNotifications])

  // ── Refresh ──────────────────────────────────────────────
  const refresh = useCallback(() => {
    offsetRef.current = 0
    fetchNotifications(true)
  }, [fetchNotifications])

  // ── Keep other hook instances (e.g. the nav badge) in sync ──
  useEffect(() => {
    if (!userId) return
    const handleRead = (e) => {
      const d = e.detail
      const source = typeof d === 'string' ? d : d?.source
      if (source === channelSuffix.current) return
      // Optimistic notices from another instance: apply locally, no refetch
      if (d?.allRead) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
        return
      }
      if (d?.readId) {
        const wasUnread = listRef.current.some(n => n.id === d.readId && !n.is_read)
        if (wasUnread) {
          setNotifications(prev => prev.map(n => n.id === d.readId ? { ...n, is_read: true } : n))
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
        return
      }
      refresh()
    }
    window.addEventListener(READ_EVENT, handleRead)
    return () => window.removeEventListener(READ_EVENT, handleRead)
  }, [userId, refresh])

  // ── Foreground refresh (iOS / PWA background→foreground) ──
  useEffect(() => {
    if (!userId) return
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [userId, refresh])

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
  }
}
