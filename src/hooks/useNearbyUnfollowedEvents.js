import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useNearbyUnfollowedEvents(userLocation, radiusMiles = 25) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  const userLat = userLocation?.lat ?? null
  const userLng = userLocation?.lng ?? null

  useEffect(() => {
    if (!user || !userLat || !userLng) return

    let cancelled = false

    async function fetchEvents() {
      setLoading(true)

      // 1. Get parishes the user already follows
      const { data: followed } = await supabase
        .from('parish_follows')
        .select('parish_id')
        .eq('user_id', user.id)

      const followedIds = (followed ?? []).map(f => f.parish_id)

      // 2. Get parishes within bounding box
      const latDelta = radiusMiles / 69.0
      const lngDelta = radiusMiles / (69.0 * Math.cos(userLat * Math.PI / 180))

      const { data: nearbyParishes } = await supabase
        .from('parishes')
        .select('id, name, latitude, longitude, city, state')
        .gte('latitude', userLat - latDelta)
        .lte('latitude', userLat + latDelta)
        .gte('longitude', userLng - lngDelta)
        .lte('longitude', userLng + lngDelta)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(100)

      // 3. Filter to unfollowed parishes within precise radius
      const unfollowedNearby = (nearbyParishes ?? [])
        .filter(p => !followedIds.includes(p.id))
        .map(p => ({
          ...p,
          distance: haversine(userLat, userLng, p.latitude, p.longitude),
        }))
        .filter(p => p.distance <= radiusMiles)
        .sort((a, b) => a.distance - b.distance)

      if (unfollowedNearby.length === 0) {
        if (!cancelled) { setEvents([]); setLoading(false) }
        return
      }

      const nearbyParishIds = unfollowedNearby.map(p => p.id)

      // 4. Get upcoming public events from those parishes
      // Events table uses start_time (timestamptz), not start_date
      const now = new Date().toISOString()

      const { data: upcomingEvents } = await supabase
        .from('events')
        .select('id, title, description, start_time, location, parish_id')
        .in('parish_id', nearbyParishIds)
        .eq('visibility', 'public')
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(20)

      if (cancelled) return

      // 5. Merge with parish info, filter dismissed
      const dismissedKey = `communio-dismissed-events-${user.id}`
      let dismissed = []
      try {
        dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]')
      } catch { dismissed = [] }

      const parishLookup = Object.fromEntries(
        unfollowedNearby.map(p => [p.id, p])
      )

      const enriched = (upcomingEvents ?? [])
        .filter(e => !dismissed.includes(e.id))
        .map(e => ({
          ...e,
          parish: parishLookup[e.parish_id] ?? null,
        }))
        .filter(e => e.parish !== null)
        .slice(0, 5)

      setEvents(enriched)
      setLoading(false)
    }

    fetchEvents()
    return () => { cancelled = true }
  }, [user?.id, userLat, userLng]) // eslint-disable-line react-hooks/exhaustive-deps

  return { events, loading }
}
