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
  'id, name, diocese, city, state, zip, address, phone, website, email, latitude, longitude, is_official, mass_times, data_source, data_quality, created_at'

// ── useParishSearch ────────────────────────────────────────
export function useParishSearch() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  // search(query, userLocation?, stateFilter?)
  // stateFilter: two-letter state code e.g. 'CA', or null/'' for all states
  const search = useCallback((query, userLocation = null, stateFilter = null) => {
    clearTimeout(debounceRef.current)

    const trimmed = (query ?? '').trim()
    const state   = stateFilter ? stateFilter.trim().toUpperCase() : null

    // Allow empty query when a state filter is selected
    if (trimmed.length < 2 && !state) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)

      // Strip punctuation so "St Stanislaus" matches "St. Stanislaus"
      const normalized = trimmed.replace(/['.,-]/g, '').replace(/\s+/g, ' ')

      let query = supabase
        .from('parishes')
        .select(PARISH_SELECT)
        .limit(50)

      if (state) {
        query = query.eq('state', state)
      }

      if (trimmed.length >= 2) {
        query = query.or(
          `name.ilike.%${trimmed}%,city.ilike.%${trimmed}%,zip.ilike.%${trimmed}%,diocese.ilike.%${trimmed}%,name.ilike.%${normalized}%`
        )
      }

      const { data, error: err } = await query

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

// ── useNearbyParishes — bounding box + Haversine ──────────
// Fetches only parishes within a lat/lng bounding box (~50 mi radius),
// then sorts by exact Haversine distance. Safe at 15,000+ parish scale.
let _nearbyCache = null  // { parishes, lat, lng }

function locationKey(lat, lng) {
  return `${Math.round(lat * 100) / 100},${Math.round(lng * 100) / 100}`
}

// Degrees of latitude per mile (constant); degrees of longitude per mile varies by latitude
function miToDegLat(miles) { return miles / 69.0 }
function miToDegLng(miles, lat) { return miles / (69.0 * Math.cos((lat * Math.PI) / 180)) }

export function useNearbyParishes(userLocation, radiusMiles = 50) {
  const cachedForLocation =
    _nearbyCache &&
    userLocation &&
    locationKey(_nearbyCache.lat, _nearbyCache.lng) === locationKey(userLocation.lat, userLocation.lng)

  const [parishes, setParishes] = useState(() => (cachedForLocation ? _nearbyCache.parishes : []))
  const [loading, setLoading] = useState(() => !!userLocation && !cachedForLocation)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userLocation) return

    const key = locationKey(userLocation.lat, userLocation.lng)
    if (_nearbyCache && locationKey(_nearbyCache.lat, _nearbyCache.lng) === key) {
      setParishes(_nearbyCache.parishes)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const { lat, lng } = userLocation
    const latDelta = miToDegLat(radiusMiles)
    const lngDelta = miToDegLng(radiusMiles, lat)

    // Bounding box pre-filter — hits indexed latitude/longitude columns
    supabase
      .from('parishes')
      .select(PARISH_SELECT)
      .gte('latitude',  lat - latDelta)
      .lte('latitude',  lat + latDelta)
      .gte('longitude', lng - lngDelta)
      .lte('longitude', lng + lngDelta)
      .limit(500)
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(err.message)
          setLoading(false)
          return
        }

        const nearby = (data ?? [])
          .map((p) => ({
            ...p,
            distance: haversineMiles(lat, lng, p.latitude, p.longitude),
          }))
          .filter((p) => p.distance < radiusMiles)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 25)

        _nearbyCache = { parishes: nearby, lat, lng }
        setParishes(nearby)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [userLocation?.lat, userLocation?.lng, radiusMiles]) // eslint-disable-line react-hooks/exhaustive-deps

  return { parishes, loading, error }
}

// ── useFollowedParishes — module-level cache ───────────────
let _followedCache = null    // { parishes, userId }
let _followedPromise = null  // in-flight fetch

export function invalidateFollowedParishesCache() {
  _followedCache = null
}

export function useFollowedParishes() {
  const { user } = useAuth()

  const cachedForUser = _followedCache?.userId === user?.id

  const [parishes, setParishes] = useState(() => (cachedForUser ? _followedCache.parishes : []))
  const [loading, setLoading] = useState(() => !!user && !cachedForUser)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    if (_followedCache?.userId === user.id) {
      setParishes(_followedCache.parishes)
      setLoading(false)
      return
    }

    if (!_followedPromise) {
      _followedPromise = supabase
        .from('parish_follows')
        .select(`parish:parishes(${PARISH_SELECT})`)
        .eq('user_id', user.id)
        .then(({ data }) => {
          const result = (data ?? []).map((d) => d.parish).filter(Boolean)
          _followedCache = { parishes: result, userId: user.id }
          _followedPromise = null
          return result
        })
        .catch(() => {
          _followedPromise = null
          return []
        })
    }

    _followedPromise.then((result) => {
      setParishes(result)
      setLoading(false)
    })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const userId = user?.id
  const profileParishId = profile?.parish_id

  useEffect(() => {
    if (!parishId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const followCheck = userId
      ? supabase
          .from('parish_follows')
          .select('id')
          .eq('parish_id', parishId)
          .eq('user_id', userId)
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
      setIsMyParish(profileParishId === parishId)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [parishId, userId, profileParishId])

  const follow = useCallback(async () => {
    if (!userId || followLoading) return
    setFollowLoading(true)

    if (isFollowing) {
      const { error: err } = await supabase
        .from('parish_follows')
        .delete()
        .eq('parish_id', parishId)
        .eq('user_id', userId)
      if (!err) {
        setIsFollowing(false)
        setFollowerCount((c) => Math.max(0, c - 1))
        invalidateFollowedParishesCache()
      }
    } else {
      const { error: err } = await supabase
        .from('parish_follows')
        .insert({ parish_id: parishId, user_id: userId })
      if (!err) {
        setIsFollowing(true)
        setFollowerCount((c) => c + 1)
        invalidateFollowedParishesCache()
      }
    }

    setFollowLoading(false)
  }, [userId, parishId, isFollowing, followLoading])

  const setAsMyParish = useCallback(async () => {
    if (!userId) return { error: 'Not authenticated' }
    const { error: err } = await updateProfile({ parish_id: parishId })
    if (!err) {
      setIsMyParish(true)
      if (!isFollowing) {
        const { error: fErr } = await supabase
          .from('parish_follows')
          .insert({ parish_id: parishId, user_id: userId })
        if (!fErr) {
          setIsFollowing(true)
          setFollowerCount((c) => c + 1)
          invalidateFollowedParishesCache()
        }
      }
    }
    return { error: err }
  }, [userId, parishId, updateProfile, isFollowing])

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
