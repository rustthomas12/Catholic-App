import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellIcon } from '@heroicons/react/24/outline'
import { isToday, isYesterday, isThisWeek } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../hooks/useNotifications'
import NotificationItem from '../components/notifications/NotificationItem'

// ── Skeleton row ─────────────────────────────────────────
function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-3/4 bg-gray-200 rounded" />
        <div className="h-3 w-1/2 bg-gray-100 rounded" />
      </div>
      <div className="w-2 h-2 rounded-full bg-gray-200 mt-1.5 flex-shrink-0" />
    </div>
  )
}

// ── Group notifications by day ────────────────────────────
function getGroup(dateStr) {
  const d = new Date(dateStr)
  if (isToday(d))      return 'today'
  if (isYesterday(d))  return 'yesterday'
  if (isThisWeek(d))   return 'this_week'
  return 'earlier'
}

const GROUP_ORDER = ['today', 'yesterday', 'this_week', 'earlier']

function groupNotifications(notifications) {
  const groups = {}
  for (const n of notifications) {
    const g = getGroup(n.created_at)
    if (!groups[g]) groups[g] = []
    groups[g].push(n)
  }
  return GROUP_ORDER.filter(g => groups[g]).map(g => ({ key: g, items: groups[g] }))
}

// ── Navigate by type ──────────────────────────────────────
function getDestination(notification) {
  const { type, reference_id } = notification
  switch (type) {
    case 'group_request':
    case 'group_request_response':
    case 'group_invite':
      return reference_id ? `/group/${reference_id}` : '/'
    case 'parish_post':
      return reference_id ? `/parish/${reference_id}` : '/'
    case 'prayer_response':
      return '/faith/prayer'
    case 'confession_reminder':
      return '/premium/confession-tracker'
    case 'like':
    case 'comment':
    case 'direct_message':
    case 'event_reminder':
    default:
      return '/'
  }
}

// ── Page ─────────────────────────────────────────────────
export default function NotificationsPage() {
  document.title = 'Notifications | Communio'

  const { t } = useTranslation('common')
  const navigate = useNavigate()

  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  // ── Infinite scroll ───────────────────────────────────
  const sentinelRef = useRef(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  // ── Handlers ─────────────────────────────────────────
  const handleTap = useCallback((notification) => {
    if (!notification.is_read) markAsRead(notification.id)
    navigate(getDestination(notification))
  }, [markAsRead, navigate])

  const handleDismiss = useCallback((id) => {
    markAsRead(id)
  }, [markAsRead])

  const grouped = groupNotifications(notifications)

  const groupLabels = {
    today:     t('notifications.today'),
    yesterday: t('notifications.yesterday'),
    this_week: t('notifications.this_week'),
    earlier:   t('notifications.earlier'),
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60 pb-20">

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-cream border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-navy">
            {t('notifications.title')}
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm font-semibold text-gold hover:underline min-h-[44px] px-2"
            >
              {t('notifications.mark_all_read')}
            </button>
          )}
        </div>

        {/* Unread pill */}
        {unreadCount > 0 && (
          <div className="flex justify-center pb-2">
            <span className="bg-gold text-navy text-xs font-bold px-3 py-1 rounded-full">
              {t('notifications.unread_count', { count: unreadCount })}
            </span>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto">

        {/* ── Loading ── */}
        {loading && (
          <div className="mt-2 bg-white md:rounded-xl md:border md:border-gray-100 md:shadow-sm overflow-hidden">
            {[1,2,3,4,5].map(i => <NotificationSkeleton key={i} />)}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-lightbg rounded-full flex items-center justify-center mb-4">
              <BellIcon className="w-8 h-8 text-gold" />
            </div>
            <p className="text-base font-semibold text-navy mb-2">
              {t('notifications.empty_title')}
            </p>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              {t('notifications.empty_body')}
            </p>
          </div>
        )}

        {/* ── Grouped list ── */}
        {!loading && grouped.length > 0 && (
          <div className="mt-2">
            {grouped.map(({ key, items }) => (
              <div key={key}>
                <p className="px-4 pt-4 pb-1 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {groupLabels[key]}
                </p>
                <div className="bg-white md:rounded-xl md:border md:border-gray-100 md:shadow-sm overflow-hidden mb-2">
                  {items.map((n, idx) => (
                    <div key={n.id}>
                      {idx > 0 && <div className="h-px bg-gray-50 mx-4" />}
                      <NotificationItem
                        notification={n}
                        onTap={handleTap}
                        onDismiss={handleDismiss}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Load more skeleton ── */}
        {loadingMore && (
          <div className="bg-white md:rounded-xl md:border md:border-gray-100 md:shadow-sm overflow-hidden mb-2">
            <NotificationSkeleton />
            <NotificationSkeleton />
          </div>
        )}

        {/* ── Sentinel ── */}
        <div ref={sentinelRef} className="h-1" />

        {/* ── Caught up ── */}
        {!hasMore && notifications.length > 0 && !loading && (
          <p className="text-center text-xs text-gray-400 py-6">
            {t('notifications.all_caught_up')}
          </p>
        )}
      </div>
    </div>
  )
}
