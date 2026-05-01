import { useState, useCallback, useEffect } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useNearbyUnfollowedEvents } from '../../hooks/useNearbyUnfollowedEvents'
import NearbyEventSuggestionCard from './NearbyEventSuggestionCard'

export default function NearbyEventSuggestions({ userLocation }) {
  const { user } = useAuth()
  const { events, loading } = useNearbyUnfollowedEvents(userLocation)
  // localEvents is null until the user dismisses/follows something, then we manage locally
  const [localEvents, setLocalEvents] = useState(null)

  // Sync localEvents when the hook returns new data (e.g. on initial load)
  useEffect(() => {
    if (!loading) setLocalEvents(null)
  }, [events]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayEvents = localEvents !== null ? localEvents : events

  const handleDismiss = useCallback((eventId) => {
    const key = `communio-dismissed-events-${user?.id}`
    try {
      const dismissed = JSON.parse(localStorage.getItem(key) || '[]')
      dismissed.push(eventId)
      localStorage.setItem(key, JSON.stringify(dismissed))
    } catch { /* ignore */ }

    setLocalEvents(prev => (prev ?? events).filter(e => e.id !== eventId))
  }, [user?.id, events])

  const handleFollowed = useCallback((parishId) => {
    // Remove all events from this parish — user now follows it, they'll see them in feed
    setLocalEvents(prev => (prev ?? events).filter(e => e.parish_id !== parishId))
  }, [events])

  if (!user || !userLocation) return null
  if (!loading && displayEvents.length === 0) return null

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <SparklesIcon className="w-4 h-4 text-gold flex-shrink-0" />
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Happening near you</h2>
        <span className="text-xs text-gray-400 normal-case font-normal">· parishes you don't follow yet</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayEvents.map(event => (
            <NearbyEventSuggestionCard
              key={event.id}
              event={event}
              onDismiss={handleDismiss}
              onFollowed={handleFollowed}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 text-center italic">
        These suggestions are based on your location. They never appear in your home feed — only here in the Directory.
      </p>
    </section>
  )
}
