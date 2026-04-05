import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

// Haversine distance in miles
function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

const PARISH_SELECT =
  'id, name, diocese, city, state, zip, address, phone, website, email, latitude, longitude, is_official, mass_times, created_at'

// ── useParishSearch ────────────────────────────────────────
export function useParishSearch() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  const search = useCallback((query, userLocation = null) => {
    clearTimeout(debounceRef.current)

    const trimmed = (query ?? '').trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('parishes')
        .select(PARISH_SELECT)
        .or(
          `name.ilike.%${trimmed}%,city.ilike.%${trimmed}%,zip.ilike.%${trimmed}%,diocese.ilike.%${trimmed}%`
        )
        .limit(30)

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      let parishes = data ?? []

      if (userLocation && parishes.length > 0) {
        parishes = parishes
          .map((p) => ({
            ...p,
            distance:
              p.latitude && p.longitude
                ? haversineMiles(userLocation.lat, userLocation.lng, p.latitude, p.longitude)
                : null,
          }))
          .sort((a, b) => {
            if (a.distance === null) return 1
            if (b.distance === null) return -1
            return a.distance - b.distance
          })
      }

      setResults(parishes)
      setLoading(false)
    }, 300)
  }, [])

  const clear = useCallback(() => {
    clearTimeout(debounceRef.current)
    setResults([])
    setError(null)
    setLoading(false)
  }, [])

  return { results, loading, error, search, clear }
}

// ── useNearbyParishes ──────────────────────────────────────
export function useNearbyParishes(userLocation) {
  const [parishes, setParishes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userLocation) return

    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('parishes')
      .select(PARISH_SELECT)
      .limit(200)
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(err.message)
          setLoading(false)
          return
        }

        const { lat, lng } = userLocation
        const nearby = (data ?? [])
          .map((p) => ({
            ...p,
            distance:
              p.latitude && p.longitude
                ? haversineMiles(lat, lng, p.latitude, p.longitude)
                : null,
          }))
          .filter((p) => p.distance !== null && p.distance < 50)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 25)

        setParishes(nearby)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [userLocation])

  return { parishes, loading, error }
}

// ── useFollowedParishes ────────────────────────────────────
export function useFollowedParishes() {
  const { user } = useAuth()
  const [parishes, setParishes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    supabase
      .from('parish_follows')
      .select(`parish:parishes(${PARISH_SELECT})`)
      .eq('user_id', user.id)
      .then(({ data }) => {
        setParishes((data ?? []).map((d) => d.parish).filter(Boolean))
        setLoading(false)
      })
  }, [user])

  return { parishes, loading }
}

// ── useParish ──────────────────────────────────────────────
export function useParish(parishId) {
  const { user, profile, updateProfile } = useAuth()

  const [parish, setParish] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isMyParish, setIsMyParish] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (!parishId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const followCheck = user
      ? supabase
          .from('parish_follows')
          .select('id')
          .eq('parish_id', parishId)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null })

    Promise.all([
      supabase.from('parishes').select(PARISH_SELECT).eq('id', parishId).single(),
      supabase
        .from('parish_follows')
        .select('user_id', { count: 'exact', head: true })
        .eq('parish_id', parishId),
      followCheck,
    ]).then(([parishRes, countRes, followRes]) => {
      if (cancelled) return
      if (parishRes.error) {
        setError(parishRes.error.message)
      } else {
        setParish(parishRes.data)
      }
      setFollowerCount(countRes.count ?? 0)
      setIsFollowing(!!followRes.data)
      setIsMyParish(profile?.parish_id === parishId)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [parishId, user, profile])

  const follow = useCallback(async () => {
    if (!user || followLoading) return
    setFollowLoading(true)

    if (isFollowing) {
      const { error: err } = await supabase
        .from('parish_follows')
        .delete()
        .eq('parish_id', parishId)
        .eq('user_id', user.id)
      if (!err) {
        setIsFollowing(false)
        setFollowerCount((c) => Math.max(0, c - 1))
      }
    } else {
      const { error: err } = await supabase
        .from('parish_follows')
        .insert({ parish_id: parishId, user_id: user.id })
      if (!err) {
        setIsFollowing(true)
        setFollowerCount((c) => c + 1)
      }
    }

    setFollowLoading(false)
  }, [user, parishId, isFollowing, followLoading])

  const setAsMyParish = useCallback(async () => {
    if (!user) return { error: 'Not authenticated' }
    const { error: err } = await updateProfile({ parish_id: parishId })
    if (!err) {
      setIsMyParish(true)
      if (!isFollowing) {
        const { error: fErr } = await supabase
          .from('parish_follows')
          .insert({ parish_id: parishId, user_id: user.id })
        if (!fErr) {
          setIsFollowing(true)
          setFollowerCount((c) => c + 1)
        }
      }
    }
    return { error: err }
  }, [user, parishId, updateProfile, isFollowing])

  return {
    parish,
    loading,
    error,
    followerCount,
    isFollowing,
    isMyParish,
    followLoading,
    follow,
    setAsMyParish,
  }
}
