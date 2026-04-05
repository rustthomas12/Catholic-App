import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { getLiturgicalSeason, isMajorFeastDay, getTodayReadingsDate } from '../utils/liturgical'

// ── HTML Parser ────────────────────────────────────────────
// Resilient parser for USCCB readings page.
// Returns null if parsing fails — graceful fallback handles that.
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

    // ── Strategy 1: look for USCCB-specific classes ────────
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

    // ── Strategy 2: walk all elements, detect section by heading text ──
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

// ── useReadings ────────────────────────────────────────────
export function useReadings() {
  const [readings, setReadings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // These are cheap synchronous calculations — compute once
  const liturgicalInfo = getLiturgicalSeason(new Date())
  const feastInfo = isMajorFeastDay(new Date())
  const todayFormatted = format(new Date(), 'EEEE, MMMM d')

  useEffect(() => {
    const dateStr = getTodayReadingsDate()
    const cacheKey = `readings_${dateStr}`

    // Check localStorage cache
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        const cachedDate = parsed.fetchedAt ? new Date(parsed.fetchedAt).toDateString() : null
        if (cachedDate === new Date().toDateString()) {
          setReadings(parsed)
          setLoading(false)
          return
        }
      }
    } catch {
      // Ignore cache errors
    }

    // Fetch fresh via Vercel proxy
    async function fetchReadings() {
      try {
        const response = await fetch(`/api/readings?date=${dateStr}`)

        if (!response.ok) throw new Error('Proxy error')

        const data = await response.json()

        if (!data.success || !data.html) {
          setError(true)
          return
        }

        const parsed = parseReadingsHtml(data.html)
        if (parsed) {
          const withMeta = {
            ...parsed,
            date: dateStr,
            fetchedAt: new Date().toISOString(),
          }
          try {
            localStorage.setItem(cacheKey, JSON.stringify(withMeta))
          } catch {
            // Storage quota exceeded — skip caching
          }
          setReadings(withMeta)
        } else {
          // Parsed but got no content — show fallback
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchReadings()
  }, [])

  return {
    readings,
    loading,
    error,
    liturgicalInfo,
    feastInfo,
    todayFormatted,
  }
}
