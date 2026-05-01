import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { getLiturgicalSeason, isMajorFeastDay, getTodayReadingsDate } from '../utils/liturgical'

// ── Module-level cache ─────────────────────────────────────
// Keyed per language so switching language doesn't serve stale data.
const _caches   = { en: null, es: null }
const _promises = { en: null, es: null }
const _errors   = { en: false, es: false }

function getFromLocalStorage(cacheKey) {
  try {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null
    const parsed = JSON.parse(cached)
    const cachedDate = parsed.fetchedAt ? new Date(parsed.fetchedAt).toDateString() : null
    // v:6 — bumped from v:5 to invalidate null-text cache entries (api.bible key now live)
    if (cachedDate === new Date().toDateString() && parsed.v === 7) return parsed
  } catch {}
  return null
}

function fetchReadingsOnce(dateStr, lang = 'en') {
  if (_promises[lang]) return _promises[lang]
  _errors[lang] = false

  const controller = new AbortController()
  const fetchTimeout = setTimeout(() => controller.abort(), 5000)
  const endpoint = lang === 'es' ? `/api/readings-es?date=${dateStr}` : `/api/readings?date=${dateStr}`

  _promises[lang] = fetch(endpoint, { signal: controller.signal })
    .then(res => {
      if (!res.ok) throw new Error('Proxy error')
      return res.json()
    })
    .then(data => {
      clearTimeout(fetchTimeout)
      if (!data.success || !data.readings) {
        _promises[lang] = null
        _errors[lang] = true
        return null
      }
      const withMeta = {
        ...data.readings,
        liturgicalInfo: data.liturgicalInfo ?? null,
        feastInfo:      data.feastInfo      ?? null,
        date: dateStr,
        fetchedAt: new Date().toISOString(),
        v: 7,
      }
      try { localStorage.setItem(`readings_${lang}_${dateStr}`, JSON.stringify(withMeta)) } catch {}
      _caches[lang] = withMeta
      return withMeta
    })
    .catch(() => {
      clearTimeout(fetchTimeout)
      _promises[lang] = null
      _errors[lang] = true
      return null
    })

  return _promises[lang]
}

// ── useReadings ────────────────────────────────────────────
export function useReadings(language = 'en') {
  const lang = language === 'es' ? 'es' : 'en'
  const dateStr = getTodayReadingsDate()
  const cacheKey = `readings_${lang}_${dateStr}`

  const [state, setState] = useState(() => {
    const ls = getFromLocalStorage(cacheKey)
    if (ls) { _caches[lang] = ls }
    return {
      readings: _caches[lang],
      loading: !_caches[lang] && !_errors[lang],
      error: _errors[lang],
    }
  })

  const todayFormatted = format(new Date(), 'EEEE, MMMM d')

  useEffect(() => {
    if (_caches[lang]) {
      setState({ readings: _caches[lang], loading: false, error: false })
      return
    }
    fetchReadingsOnce(dateStr, lang).then(result => {
      setState({ readings: result, loading: false, error: _errors[lang] })
    })
  }, [dateStr, lang])

  // Prefer authoritative data from the API; fall back to local computation
  const liturgicalInfo = state.readings?.liturgicalInfo ?? getLiturgicalSeason(new Date())
  const feastInfo      = state.readings?.feastInfo      ?? isMajorFeastDay(new Date())

  return {
    readings: state.readings,
    loading: state.loading,
    error: state.error,
    liturgicalInfo,
    feastInfo,
    todayFormatted,
  }
}

// ── TLM module-level cache ─────────────────────────────────
let _tlmCache = null
let _tlmPromise = null
let _tlmError = false

function fetchTLMOnce(dateParam) {
  if (_tlmPromise) return _tlmPromise
  _tlmError = false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  _tlmPromise = fetch(`/api/tlm-readings?date=${dateParam}`, { signal: controller.signal })
    .then(res => { if (!res.ok) throw new Error(); return res.json() })
    .then(data => {
      clearTimeout(timeout)
      if (!data.success || !data.readings) { _tlmError = true; return null }
      const withMeta = {
        ...data.readings,
        massName:       data.massName       ?? null,
        liturgicalColor: data.liturgicalColor ?? null,
        fetchedAt: new Date().toISOString(),
      }
      try { localStorage.setItem(`tlm_readings_${dateParam}`, JSON.stringify(withMeta)) } catch {}
      _tlmCache = withMeta
      return withMeta
    })
    .catch(() => {
      clearTimeout(timeout)
      _tlmPromise = null
      _tlmError = true
      return null
    })

  return _tlmPromise
}

// ── useTLMReadings ─────────────────────────────────────────
export function useTLMReadings(enabled = false) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const lsKey = `tlm_readings_${today}`

  const [state, setState] = useState(() => {
    if (!enabled) return { readings: null, loading: false, error: false }
    try {
      const raw = localStorage.getItem(lsKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.fetchedAt && new Date(parsed.fetchedAt).toDateString() === new Date().toDateString()) {
          _tlmCache = parsed
          return { readings: parsed, loading: false, error: false }
        }
      }
    } catch { /* ignore */ }
    if (_tlmCache) return { readings: _tlmCache, loading: false, error: false }
    return { readings: null, loading: true, error: false }
  })

  useEffect(() => {
    if (!enabled) return
    if (_tlmCache) {
      setState({ readings: _tlmCache, loading: false, error: false })
      return
    }
    fetchTLMOnce(today).then(result => {
      setState({ readings: result, loading: false, error: _tlmError })
    })
  }, [enabled, today])

  return { readings: state.readings, loading: state.loading, error: state.error }
}
