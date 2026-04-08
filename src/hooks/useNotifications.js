import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

const PAGE_SIZE = 20

const NOTIFICATION_SELECT = `
  id, type, reference_id, message, is_read, created_at,
  actor:profiles!actor_id(id, full_name, avatar_url)
`

export function useNotifications() {
  const { user } = useAuth()

  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [loadingMore,   setLoadingMore]   = useState(false)
  const [hasMore,       setHasMore]       = useState(false)

  const offsetRef    = useRef(0)
  const channelRef   = useRef(null)

  // ── Fetch a page ─────────────────────────────────────────
  const fetchNotifications = useCallback(async (reset = false) => {
    if (!user) return
    const offset = reset ? 0 : offsetRef.current
    if (reset) setLoading(true)
    else       setLoadingMore(true)

    const { data, error } = await supabase
      .from('notifications')
      .select(NOTIFICATION_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      console.error('Failed to fetch notifications:', error.message)
      setLoading(false)
      setLoadingMore(false)
      return
    }

    const rows = data ?? []
    if (reset) {
      setNotifications(rows)
      // Derive unread count from fetched data — no separate query needed
      setUnreadCount(rows.filter(n => !n.is_read).length)
      offsetRef.current = rows.length
    } else {
      setNotifications(prev => [...prev, ...rows])
      setUnreadCount(prev => prev + rows.filter(n => !n.is_read).length)
      offsetRef.current = offsetRef.current + rows.length
    }

    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  }, [user])

  // ── Initial load ─────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }
    fetchNotifications(true)
  }, [user, fetchNotifications])

  // ── Real-time subscription ────────────────────────────────
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch the full row with actor join
          const { data } = await supabase
            .from('notifications')
            .select(NOTIFICATION_SELECT)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setNotifications(prev => [data, ...prev])
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
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
  }, [user])

  // ── Mark one as read ─────────────────────────────────────
  const markAsRead = useCallback(async (notificationId) => {
    if (!user) return
    // Optimistic
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)
  }, [user])

  // ── Mark all as read ─────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    if (!user) return
    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }, [user])

  // ── Load more ────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) fetchNotifications(false)
  }, [loadingMore, hasMore, fetchNotifications])

  // ── Refresh ──────────────────────────────────────────────
  const refresh = useCallback(() => {
    offsetRef.current = 0
    fetchNotifications(true)
  }, [fetchNotifications])

  // ── Foreground refresh (iOS / PWA background→foreground) ──
  useEffect(() => {
    if (!user) return
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, refresh])

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
