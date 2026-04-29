import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDaysIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabase'
import { format, isPast, isSameDay } from 'date-fns'
import EventRsvpButtons from '../shared/EventRsvpButtons'

export default function ParishEvents({ parishId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    if (!parishId) return
    setLoading(true)

    supabase
      .from('events')
      .select('id, title, description, start_time, end_time, location, visibility, rsvp_count, image_url')
      .eq('parish_id', parishId)
      .order('start_time', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setEvents(data ?? [])
        setLoading(false)
      })
  }, [parishId])

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 pt-4">
        <p className="text-gray-400 text-sm text-center py-8">Could not load events.</p>
      </div>
    )
  }

  const upcoming = events.filter((e) => !isPast(new Date(e.start_time)))
  const past = events.filter((e) => isPast(new Date(e.start_time)))
  const displayed = showPast ? past : upcoming

  if (events.length === 0) {
    return (
      <div className="px-4 pt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <CalendarDaysIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-navy text-sm">No upcoming events</p>
          <p className="text-gray-400 text-xs mt-1">Check back later for events from this parish.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-3">
      {/* Toggle */}
      {past.length > 0 && (
        <div className="flex bg-lightbg rounded-xl p-0.5 w-fit">
          <button
            onClick={() => setShowPast(false)}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
              !showPast ? 'bg-white text-navy shadow-sm' : 'text-gray-500'
            }`}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            onClick={() => setShowPast(true)}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
              showPast ? 'bg-white text-navy shadow-sm' : 'text-gray-500'
            }`}
          >
            Past ({past.length})
          </button>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <CalendarDaysIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-navy text-sm">No upcoming events</p>
          <p className="text-gray-400 text-xs mt-1">Check back soon.</p>
        </div>
      ) : (
        displayed.map((event) => <EventCard key={event.id} event={event} />)
      )}
    </div>
  )
}

function EventCard({ event }) {
  const start = new Date(event.start_time)
  const end = event.end_time ? new Date(event.end_time) : null
  const past = isPast(start)

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${past ? 'opacity-60' : ''}`}>
      <div className="flex">
        {/* Date block */}
        <div className="bg-navy w-16 flex-shrink-0 flex flex-col items-center justify-center py-4">
          <p className="text-gold text-xs font-bold uppercase tracking-wider">
            {format(start, 'MMM')}
          </p>
          <p className="text-white font-bold text-2xl leading-none">{format(start, 'd')}</p>
          <p className="text-gray-300 text-xs">{format(start, 'EEE')}</p>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <p className="font-bold text-navy text-sm leading-snug">{event.title}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
              {format(start, 'h:mm a')}
              {end && !isSameDay(start, end) ? ` – ${format(end, 'MMM d')}` : end ? ` – ${format(end, 'h:mm a')}` : ''}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 text-xs text-gray-500 truncate">
                <MapPinIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{event.description}</p>
          )}
          {!past && <EventRsvpButtons eventId={event.id} />}
        </div>
      </div>
    </div>
  )
}
