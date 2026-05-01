import { useRef, useState } from 'react'
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  HandRaisedIcon,
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldExclamationIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import Avatar from '../shared/Avatar'
import { formatRelativeTime } from '../../utils/dates'

// ── Type → icon mapping ───────────────────────────────────
function TypeIcon({ type, message }) {
  const base = 'w-5 h-5'

  if (type === 'like') return <HeartIcon className={`${base} text-gold`} />
  if (type === 'comment') return <ChatBubbleLeftIcon className={`${base} text-navy`} />
  if (type === 'group_request' || type === 'group_invite') return <UserGroupIcon className={`${base} text-navy`} />
  if (type === 'group_request_response') {
    const approved = message?.toLowerCase().includes('approved')
    return approved
      ? <CheckCircleIcon className={`${base} text-gold`} />
      : <XCircleIcon className={`${base} text-red-500`} />
  }
  if (type === 'parish_post') return <BuildingLibraryIcon className={`${base} text-navy`} />
  if (type === 'prayer_response') return <HandRaisedIcon className={`${base} text-gold`} />
  if (type === 'confession_reminder') return <ClipboardDocumentCheckIcon className={`${base} text-navy`} />
  if (type === 'event_reminder') return <CalendarIcon className={`${base} text-navy`} />
  if (type === 'direct_message') return <EnvelopeIcon className={`${base} text-navy`} />
  if (type === 'post_flagged') return <ShieldExclamationIcon className={`${base} text-red-500`} />
  if (type === 'new_parish_member') return <UserPlusIcon className={`${base} text-gold`} />
  return <HandRaisedIcon className={`${base} text-navy`} />
}

// ── NotificationItem ─────────────────────────────────────
export default function NotificationItem({ notification, onTap, onDismiss }) {
  const { id, type, message, is_read, created_at, actor } = notification

  // ── Swipe to dismiss ──────────────────────────────────
  const touchStartX = useRef(null)
  const [swipeX, setSwipeX] = useState(0)
  const [swiping, setSwiping] = useState(false)

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    setSwiping(false)
  }

  function handleTouchMove(e) {
    if (touchStartX.current === null) return
    const dx = touchStartX.current - e.touches[0].clientX
    if (dx > 0) {
      setSwiping(true)
      setSwipeX(Math.min(dx, 200))
    }
  }

  function handleTouchEnd() {
    if (swipeX > 160) {
      onDismiss?.(id)
    }
    setSwipeX(0)
    setSwiping(false)
    touchStartX.current = null
  }

  const showDismissBg = swipeX > 80

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Red dismiss background shown during swipe */}
      {showDismissBg && (
        <div className="absolute inset-y-0 right-0 w-full bg-red-500 flex items-center justify-end pr-5">
          <span className="text-white text-sm font-semibold">Dismiss</span>
        </div>
      )}

      {/* Main row */}
      <button
        onClick={() => onTap?.(notification)}
        style={{ transform: swiping ? `translateX(-${swipeX}px)` : 'translateX(0)', transition: swiping ? 'none' : 'transform 0.2s ease' }}
        className={[
          'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
          'active:bg-lightbg',
          is_read
            ? 'bg-white'
            : 'bg-lightbg border-l-4 border-gold',
        ].join(' ')}
      >
        {/* Left: actor avatar or type icon */}
        <div className="flex-shrink-0 mt-0.5">
          {actor ? (
            <Avatar
              src={actor.avatar_url}
              name={actor.full_name}
              size="sm"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center">
              <TypeIcon type={type} message={message} />
            </div>
          )}
        </div>

        {/* Center: message + time */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug text-gray-800 ${is_read ? 'font-normal' : 'font-medium'}`}>
            {message}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatRelativeTime(created_at)}
          </p>
        </div>

        {/* Right: unread dot */}
        {!is_read && (
          <div className="flex-shrink-0 mt-1.5">
            <div className="w-2 h-2 rounded-full bg-gold" />
          </div>
        )}
      </button>
    </div>
  )
}
