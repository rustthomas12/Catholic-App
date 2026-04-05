import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { getLiturgicalSeason, isMajorFeastDay, getTodayReadingsDate } from '../utils/liturgical'

// ── HTML Parser ────────────────────────────────────────────
function parseReadingsHtml(html) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const result = {
      firstReading: null,
      psalm: null,
      secondReading: null,
      gospelAcclamation: null,
      gospel: null,
    }

    const sectionMap = [
      { key: 'firstReading', patterns: ['first reading', 'reading i\b', '1st reading'] },
      { key: 'psalm', patterns: ['responsorial psalm'] },
      { key: 'secondReading', patterns: ['second reading', 'reading ii\b', '2nd reading'] },
      { key: 'gospelAcclamation', patterns: ['gospel acclamation', 'alleluia verse'] },
      { key: 'gospel', patterns: ['^gospel$', 'the gospel'] },
    ]

    function detectSection(text) {
      const lower = text.toLowerCase().trim()
      for (const { key, patterns } of sectionMap) {
        for (const p of patterns) {
          if (new RegExp(p, 'i').test(lower)) return key
        }
      }
      return null
    }

    // Strategy 1: USCCB-specific classes
    const readingWrappers = doc.querySelectorAll(
      '.content-body, [class*="reading"], [class*="Reading"], article section, .reading'
    )

    if (readingWrappers.length >= 2) {
      readingWrappers.forEach((wrapper) => {
        const heading =
          wrapper.querySelector('h3, h4, h2, [class*="heading"], [class*="title"]')?.textContent?.trim() ?? ''
        const section = detectSection(heading)
        if (!section) return

        const ref =
          wrapper.querySelector('cite, [class*="ref"], [class*="cite"], h4')?.textContent?.trim() ?? ''
        const textEls = wrapper.querySelectorAll('p')
        const text = Array.from(textEls)
          .map((p) => p.textContent?.trim())
          .filter(Boolean)
          .join(' ')

        if (section === 'gospelAcclamation') {
          result.gospelAcclamation = { text: text || ref }
        } else if (text || ref) {
          result[section] = { reference: ref, text }
        }
      })

      if (result.gospel || result.firstReading) return result
    }

    // Strategy 2: walk headings to detect section boundaries
    const allEls = doc.querySelectorAll('h1, h2, h3, h4, h5, p, cite')
    let activeSec = null
    let refBuf = null
    let textBuf = []

    function flush() {
      if (!activeSec) return
      const text = textBuf.join(' ')
      if (activeSec === 'gospelAcclamation') {
        result.gospelAcclamation = { text: refBuf ?? text }
      } else if (refBuf || text) {
        result[activeSec] = { reference: refBuf ?? '', text }
      }
    }

    for (const el of allEls) {
      const raw = el.textContent?.trim()
      if (!raw) continue

      if (/^H[1-5]$/.test(el.tagName)) {
        const sec = detectSection(raw)
        if (sec) {
          flush()
          activeSec = sec
          refBuf = null
          textBuf = []
          continue
        }
      }

      if (!activeSec) continue

      if (el.tagName === 'CITE' && !refBuf) {
        refBuf = raw
      } else if (el.tagName === 'P' && raw.length > 20) {
        textBuf.push(raw)
      }
    }
    flush()

    const hasContent = result.firstReading || result.psalm || result.gospel
    return hasContent ? result : null
  } catch {
    return null
  }
}

// ── Module-level cache ─────────────────────────────────────
// Shared across all useReadings() calls in the same session so
// HomePage and FaithPage don't each trigger a separate network request.
let _cache = null          // resolved readings object
let _promise = null        // in-flight fetch promise
let _error = false

function getFromLocalStorage(cacheKey) {
  try {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null
    const parsed = JSON.parse(cached)
    const cachedDate = parsed.fetchedAt ? new Date(parsed.fetchedAt).toDateString() : null
    if (cachedDate === new Date().toDateString()) return parsed
  } catch {
    // ignore
  }
  return null
}

function fetchReadingsOnce(dateStr) {
  if (_promise) return _promise

  const controller = new AbortController()
  const fetchTimeout = setTimeout(() => controller.abort(), 5000)

  _promise = fetch(`/api/readings?date=${dateStr}`, { signal: controller.signal })
    .then(res => {
      if (!res.ok) throw new Error('Proxy error')
      return res.json()
    })
    .then(data => {
      clearTimeout(fetchTimeout)
      if (!data.success || !data.html) { _error = true; return null }
      const parsed = parseReadingsHtml(data.html)
      if (!parsed) { _error = true; return null }
      const withMeta = { ...parsed, date: dateStr, fetchedAt: new Date().toISOString() }
      try { localStorage.setItem(`readings_${dateStr}`, JSON.stringify(withMeta)) } catch { /* quota */ }
      _cache = withMeta
      return withMeta
    })
    .catch(() => {
      clearTimeout(fetchTimeout)
      _error = true
      return null
    })

  return _promise
}

// ── useReadings ────────────────────────────────────────────
export function useReadings() {
  const dateStr = getTodayReadingsDate()
  const cacheKey = `readings_${dateStr}`

  // Synchronous initializer: hit localStorage before first render
  const [state, setState] = useState(() => {
    const ls = getFromLocalStorage(cacheKey)
    if (ls) { _cache = ls }
    return {
      readings: _cache,
      loading: !_cache && !_error,
      error: _error,
    }
  })

  const liturgicalInfo = getLiturgicalSeason(new Date())
  const feastInfo = isMajorFeastDay(new Date())
  const todayFormatted = format(new Date(), 'EEEE, MMMM d')

  useEffect(() => {
    // Already have data or already errored — nothing to do
    if (_cache || _error) {
      setState({ readings: _cache, loading: false, error: _error })
      return
    }

    fetchReadingsOnce(dateStr).then(result => {
      setState({ readings: result, loading: false, error: _error })
    })
  }, [dateStr])

  return {
    readings: state.readings,
    loading: state.loading,
    error: state.error,
    liturgicalInfo,
    feastInfo,
    todayFormatted,
  }
}
