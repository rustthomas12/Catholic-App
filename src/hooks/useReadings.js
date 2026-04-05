import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { getLiturgicalSeason, isMajorFeastDay, getTodayReadingsDate } from '../utils/liturgical'

// ── TLM HTML Parser ────────────────────────────────────────
// Parses Divinum Officium HTML for the key TLM Mass propers.
function parseTLMHtml(html) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const result = {
      massName: null,
      epistle: null,
      gradual: null,
      gospel: null,
    }

    // Mass name is typically in the page title or a main heading
    const title = doc.querySelector('h1, h2, .title, #title')
    if (title) result.massName = title.textContent.trim()

    // Divinum Officium wraps each section in a <div class="section"> or similar,
    // with a header. We look for key Latin/English section identifiers.
    const sectionMap = [
      { key: 'epistle', patterns: ['epistola', 'lectio', 'epistle', 'lesson'] },
      { key: 'gradual', patterns: ['graduale', 'alleluia', 'tractus', 'gradual', 'tract'] },
      { key: 'gospel', patterns: ['evangelium', 'gospel'] },
    ]

    function detectTLMSection(text) {
      const lower = text.toLowerCase().trim()
      for (const { key, patterns } of sectionMap) {
        if (patterns.some(p => lower.includes(p))) return key
      }
      return null
    }

    // Strategy 1: look for bold/heading elements that label sections
    const headings = doc.querySelectorAll('b, strong, h2, h3, h4, .rubric, .section-title')
    let activeSec = null
    let refBuf = null
    let textBuf = []

    function flush() {
      if (!activeSec || (!refBuf && textBuf.length === 0)) return
      const text = textBuf.join(' ').trim()
      if (!result[activeSec]) {
        result[activeSec] = { reference: refBuf ?? '', text }
      }
    }

    // Walk all content nodes
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT)
    let node = walker.nextNode()
    while (node) {
      const tag = node.tagName
      const text = node.textContent?.trim() ?? ''

      if (!text) { node = walker.nextNode(); continue }

      if (['B', 'STRONG', 'H2', 'H3', 'H4'].includes(tag) && text.length < 60) {
        const sec = detectTLMSection(text)
        if (sec) {
          flush()
          activeSec = sec
          refBuf = null
          textBuf = []
          node = walker.nextNode()
          continue
        }
      }

      if (activeSec && tag === 'P') {
        const inner = text
        // Scripture reference is usually short and in parentheses or starts with a book name
        if (!refBuf && inner.length < 80 && /^[A-Z]/.test(inner) && !/[.]{2}/.test(inner)) {
          refBuf = inner
        } else if (inner.length > 30) {
          textBuf.push(inner)
        }
      }

      node = walker.nextNode()
    }
    flush()

    // Strategy 2: if strategy 1 got nothing, try <td> cells (DO uses table layout)
    if (!result.epistle && !result.gospel) {
      const cells = doc.querySelectorAll('td')
      activeSec = null
      refBuf = null
      textBuf = []

      cells.forEach(cell => {
        const inner = cell.textContent?.trim() ?? ''
        if (!inner) return

        const sec = detectTLMSection(inner)
        if (sec && inner.length < 80) {
          flush()
          activeSec = sec
          refBuf = null
          textBuf = []
          return
        }

        if (!activeSec) return

        if (!refBuf && inner.length < 80) refBuf = inner
        else if (inner.length > 30) textBuf.push(inner)
      })
      flush()
    }

    const hasContent = result.epistle || result.gospel
    return hasContent ? result : null
  } catch {
    return null
  }
}

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

// ── TLM module-level cache ─────────────────────────────────
let _tlmCache = null
let _tlmPromise = null
let _tlmError = false

function fetchTLMOnce(dateParam) {
  if (_tlmPromise) return _tlmPromise

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  _tlmPromise = fetch(`/api/tlm-readings?date=${dateParam}`, { signal: controller.signal })
    .then(res => { if (!res.ok) throw new Error(); return res.json() })
    .then(data => {
      clearTimeout(timeout)
      if (!data.success || !data.html) { _tlmError = true; return null }
      const parsed = parseTLMHtml(data.html)
      if (!parsed) { _tlmError = true; return null }
      const withMeta = { ...parsed, fetchedAt: new Date().toISOString() }
      try { localStorage.setItem(`tlm_readings_${dateParam}`, JSON.stringify(withMeta)) } catch { /* quota */ }
      _tlmCache = withMeta
      return withMeta
    })
    .catch(() => {
      clearTimeout(timeout)
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
    // Check localStorage
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
    if (_tlmCache || _tlmError) {
      setState({ readings: _tlmCache, loading: false, error: _tlmError })
      return
    }
    fetchTLMOnce(today).then(result => {
      setState({ readings: result, loading: false, error: _tlmError })
    })
  }, [enabled, today])

  return { readings: state.readings, loading: state.loading, error: state.error }
}
