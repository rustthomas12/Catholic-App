import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'
import { haversineMiles } from './useParish.js'

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

      const latDelta = radiusMiles / 69.0
      const lngDelta = radiusMiles / (69.0 * Math.cos(userLat * Math.PI / 180))

      // Upcoming public events whose parish is inside the box. Filtering the
      // events (few) rather than first taking 100 parishes (many, unordered)
      // means busy areas no longer miss events from parishes past the 100th.
      const [{ data: followed }, { data: upcoming }] = await Promise.all([
        supabase.from('parish_follows').select('parish_id').eq('user_id', user.id),
        supabase
          .from('events')
          .select('id, title, description, start_time, location, parish_id, parish:parishes!inner(id, name, latitude, longitude, city, state)')
          .eq('visibility', 'public')
          .gte('start_time', new Date().toISOString())
          .gte('parish.latitude', userLat - latDelta)
          .lte('parish.latitude', userLat + latDelta)
          .gte('parish.longitude', userLng - lngDelta)
          .lte('parish.longitude', userLng + lngDelta)
          .order('start_time', { ascending: true })
          .limit(50),
      ])

      if (cancelled) return

      const followedIds = new Set((followed ?? []).map(f => f.parish_id))
      let dismissed = []
      try {
        dismissed = JSON.parse(localStorage.getItem(`infold-dismissed-events-${user.id}`) || '[]')
      } catch { dismissed = [] }

      const nearby = (upcoming ?? [])
        .filter(e => !followedIds.has(e.parish_id) && !dismissed.includes(e.id))
        .map(e => ({
          ...e,
          parish: { ...e.parish, distance: haversineMiles(userLat, userLng, e.parish.latitude, e.parish.longitude) },
        }))
        .filter(e => e.parish.distance <= radiusMiles)
        .slice(0, 5)

      setEvents(nearby)
      setLoading(false)
    }

    fetchEvents()
    return () => { cancelled = true }
  }, [user?.id, userLat, userLng]) // eslint-disable-line react-hooks/exhaustive-deps

  return { events, loading }
}
