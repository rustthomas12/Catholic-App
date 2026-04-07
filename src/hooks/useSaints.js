import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

// Columns safe to fetch for free users (excludes biography)
const SAINT_LIST_SELECT =
  'id, name, feast_day, birth_year, death_year, summary, patron_of, image_url'

// Full select — used when isPremium or on detail page
const SAINT_FULL_SELECT = '*'

// ── useTodaySaint — module-level cache ─────────────────────
let _todaySaintCache = null   // { data, date }
let _todaySaintPromise = null // in-flight fetch

export function useTodaySaint() {
  const todayMMDD = format(new Date(), 'MM-dd')
  const cachedToday = _todaySaintCache?.date === todayMMDD

  const [saint, setSaint] = useState(() => (cachedToday ? _todaySaintCache.data : null))
  const [loading, setLoading] = useState(() => !cachedToday)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (_todaySaintCache?.date === todayMMDD) {
      setSaint(_todaySaintCache.data)
      setLoading(false)
      return
    }

    if (!_todaySaintPromise) {
      _todaySaintPromise = supabase
        .from('saints')
        .select(SAINT_LIST_SELECT)
        .eq('feast_day', todayMMDD)
        .limit(1)
        .maybeSingle()
        .then(({ data, error: err }) => {
          _todaySaintCache = { data: data ?? null, date: todayMMDD }
          _todaySaintPromise = null
          return { data, err }
        })
        .catch((err) => {
          _todaySaintPromise = null
          return { data: null, err }
        })
    }

    _todaySaintPromise.then(({ data, err }) => {
      if (err) setError(err.message)
      else setSaint(data)
      setLoading(false)
    })
  }, [todayMMDD])

  return { saint, loading, error }
}

// ── useSaintLibrary ────────────────────────────────────────
export function useSaintLibrary(searchQuery = '', filter = null) {
  const [saints, setSaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)

    const delay = searchQuery.trim().length > 0 ? 300 : 0

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)

      let q = supabase
        .from('saints')
        .select(SAINT_LIST_SELECT)
        .order('feast_day')
        .limit(60)

      if (searchQuery.trim().length >= 1) {
        q = q.ilike('name', `%${searchQuery.trim()}%`)
      }

      if (filter?.month) {
        q = q.like('feast_day', `${filter.month}-%`)
      }

      const { data, error: err } = await q

      if (err) {
        setError(err.message)
      } else {
        setSaints(data ?? [])
      }
      setLoading(false)
    }, delay)

    return () => clearTimeout(debounceRef.current)
  }, [searchQuery, filter?.month])

  return { saints, loading, error }
}

// ── useSaint ───────────────────────────────────────────────
export function useSaint(saintId) {
  const [saint, setSaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!saintId) return

    setLoading(true)
    supabase
      .from('saints')
      .select(SAINT_FULL_SELECT)
      .eq('id', saintId)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setSaint(data)
        setLoading(false)
      })
  }, [saintId])

  return { saint, loading, error }
}

// ── useSaintFavorites ──────────────────────────────────────
export function useSaintFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    supabase
      .from('saint_favorites')
      .select(`saint_id, saint:saints(${SAINT_LIST_SELECT})`)
      .eq('user_id', user.id)
      .then(({ data }) => {
        setFavorites((data ?? []).map((d) => d.saint).filter(Boolean))
        setLoading(false)
      })
  }, [user])

  const favoriteIds = useMemo(() => new Set(favorites.map((s) => s.id)), [favorites])

  const isFavorite = useCallback((saintId) => favoriteIds.has(saintId), [favoriteIds])

  const addFavorite = useCallback(
    async (saintId) => {
      if (!user) return
      // Optimistic
      const saint = favorites.find((s) => s.id === saintId)

      setFavorites((prev) => {
        if (prev.some((s) => s.id === saintId)) return prev
        return saint ? [...prev, saint] : prev
      })

      const { error } = await supabase
        .from('saint_favorites')
        .insert({ user_id: user.id, saint_id: saintId })

      if (error) {
        // Revert
        setFavorites((prev) => prev.filter((s) => s.id !== saintId))
      } else if (!saint) {
        // Fetch the saint if we didn't have it
        const { data } = await supabase
          .from('saints')
          .select(SAINT_LIST_SELECT)
          .eq('id', saintId)
          .single()
        if (data) setFavorites((prev) => [...prev.filter((s) => s.id !== saintId), data])
      }
    },
    [user, favorites]
  )

  const removeFavorite = useCallback(
    async (saintId) => {
      if (!user) return
      // Optimistic
      setFavorites((prev) => prev.filter((s) => s.id !== saintId))

      const { error } = await supabase
        .from('saint_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('saint_id', saintId)

      if (error) {
        // Revert — refetch to restore
        const { data } = await supabase
          .from('saint_favorites')
          .select(`saint:saints(${SAINT_LIST_SELECT})`)
          .eq('user_id', user.id)
        setFavorites((data ?? []).map((d) => d.saint).filter(Boolean))
      }
    },
    [user]
  )

  return {
    favorites,
    favoriteIds,
    isFavorite,
    addFavorite,
    removeFavorite,
    loading,
  }
}
