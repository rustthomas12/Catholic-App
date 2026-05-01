import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabase'
import { invalidateFollowedParishesCache } from '../../hooks/useParish'
import { useAuth } from '../../hooks/useAuth.jsx'
import { format, parseISO } from 'date-fns'

export default function NearbyEventSuggestionCard({ event, onDismiss, onFollowed }) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [followed, setFollowed] = useState(false)

  async function handleFollowAndView() {
    if (!user || followed) return
    setFollowing(true)
    const { error } = await supabase
      .from('parish_follows')
      .upsert({ user_id: user.id, parish_id: event.parish_id }, { onConflict: 'user_id,parish_id' })
    setFollowing(false)
    if (!error) {
      invalidateFollowedParishesCache()
      setFollowed(true)
      onFollowed?.(event.parish_id)
    }
  }

  const parish = event.parish
  const distanceText = typeof parish?.distance === 'number'
    ? parish.distance < 1 ? 'Less than 1 mile away' : `${parish.distance.toFixed(1)} miles away`
    : null

  let eventDate = null
  try {
    eventDate = event.start_time ? format(parseISO(event.start_time), 'EEEE, MMMM d') : null
  } catch { eventDate = null }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <div>
        <p className="font-semibold text-navy text-sm leading-snug">{event.title}</p>
        {event.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
        <span className="font-medium text-navy">{parish?.name}</span>
        {distanceText && <span className="text-gray-400">· {distanceText}</span>}
      </div>

      {eventDate && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span>{eventDate}</span>
        </div>
      )}

      <p className="text-xs text-gray-400 italic leading-relaxed">
        You're not following {parish?.name} yet. Follow them to stay updated on this event and future ones.
      </p>

      <div className="flex gap-2 pt-1">
        {followed ? (
          <Link
            to={`/parish/${event.parish_id}`}
            className="flex-1 text-center text-xs font-semibold py-2 px-3 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
          >
            View Parish →
          </Link>
        ) : (
          <button
            onClick={handleFollowAndView}
            disabled={following}
            className="flex-1 text-xs font-semibold py-2 px-3 bg-navy text-white rounded-lg hover:bg-navy/90 disabled:opacity-60 transition-colors"
          >
            {following ? 'Following…' : 'Follow & View Event'}
          </button>
        )}
        <button
          onClick={() => onDismiss?.(event.id)}
          className="text-xs text-gray-400 py-2 px-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:text-gray-600 transition-colors"
        >
          Not interested
        </button>
      </div>
    </div>
  )
}
