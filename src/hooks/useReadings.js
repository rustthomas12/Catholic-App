import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { getLiturgicalSeason, isMajorFeastDay, getTodayReadingsDate } from '../utils/liturgical'

// ── TLM HTML Parser ────────────────────────────────────────
// Parses Divinum Officium POST response.
// Structure: two-column table — Latin (TD with ID attr) | English (TD without ID).
// Section headers: <FONT SIZE='+1' COLOR="red"><B><I>Section</I></B></FONT>
// References:      <FONT COLOR="red"><I>1 Cor 5:7-8</I></FONT>
function parseTLMHtml(html) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const result = { massName: null, epistle: null, gradual: null, gospel: null }

    // English content is in TDs without an ID attribute (Latin TDs have ID='1', '2', etc.)
    // Select those TDs, then extract sections from each.
    const allTds = Array.from(doc.querySelectorAll('td[width="50%"], td[WIDTH="50%"]'))
    const englishTds = allTds.filter(td => !td.hasAttribute('id') && !td.hasAttribute('ID'))

    // Section names as they appear in the English column
    const SECTION_KEYS = {
      'lesson': 'epistle',
      'epistle': 'epistle',
      'graduale': 'gradual',
      'gradual': 'gradual',
      'alleluia': 'gradual',
      'tract': 'gradual',
      'gospel': 'gospel',
    }

    function isSectionHeader(el) {
      // DO marks section headers as <FONT SIZE='+1' COLOR="red"><B><I>text</I></B></FONT>
      const tag = el.tagName?.toLowerCase()
      if (tag !== 'font') return false
      const size = el.getAttribute('size') || el.getAttribute('SIZE') || ''
      const color = (el.getAttribute('color') || el.getAttribute('COLOR') || '').toLowerCase()
      return size.includes('+1') && color === 'red'
    }

    function isReference(el) {
      const tag = el.tagName?.toLowerCase()
      if (tag !== 'font') return false
      const size = el.getAttribute('size') || el.getAttribute('SIZE') || ''
      const color = (el.getAttribute('color') || el.getAttribute('COLOR') || '').toLowerCase()
      return !size && color === 'red'
    }

    // Extract text content from a TD, skipping navigation links and rubric markers
    function extractTdContent(td) {
      const sections = []
      let currentKey = null
      let currentRef = null
      let currentText = []

      function flush() {
        if (!currentKey) return
        const text = currentText.join(' ').trim()
        if (!result[currentKey] && (currentRef || text)) {
          result[currentKey] = { reference: currentRef ?? '', text }
        }
        currentKey = null
        currentRef = null
        currentText = []
      }

      // Walk child nodes
      const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.textContent.trim()
          // Skip liturgical response markers like ℟. ℣. S.
          if (t && !['℟.', '℣.', 'S.', 'R.', 'V.'].includes(t) && currentKey) {
            currentText.push(t)
          }
          return
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return

        if (isSectionHeader(node)) {
          const name = node.textContent.trim().toLowerCase()
          const key = SECTION_KEYS[name]
          if (key) {
            flush()
            currentKey = key
          }
          return
        }

        if (isReference(node) && currentKey) {
          const inner = node.querySelector('i, I')
          const ref = inner ? inner.textContent.trim() : node.textContent.trim()
          // Only use it as a reference if it looks like a scripture citation
          if (/[0-9]/.test(ref) || ref.includes('Ps')) {
            currentRef = ref
            return
          }
        }

        // Skip navigation divs
        if (node.tagName === 'DIV' && node.querySelector('a[href="#top"]')) return

        for (const child of node.childNodes) walk(child)
      }

      for (const child of td.childNodes) walk(child)
      flush()
    }

    englishTds.forEach(extractTdContent)

    // Try to get the gospel label (it starts "Continuation of the Holy Gospel according to X")
    if (result.gospel) {
      const gospelText = result.gospel.text
      const match = gospelText.match(/(?:Holy Gospel according to|Gospel according to)\s+(\w+)/)
      if (match) {
        // Clean up the gospel text — remove the header line
        result.gospel.text = gospelText.replace(/^.*?(?:Glory be to Thee, O Lord\.|℟\. Glory.*?)\s*/i, '').trim()
      }
    }

    const hasContent = result.epistle || result.gospel
    return hasContent ? result : null
  } catch {
    return null
  }
}

// ── Strip USCCB copyright / footer boilerplate from reading text ──
const COPYRIGHT_PATTERNS = [
  /Lectionary for Mass for Use in the Dioceses[\s\S]*/i,
  /©\s*20\d\d United States Conference[\s\S]*/i,
  /United States Conference of Catholic Bishops'?[\s\S]*/i,
  /Neither this work nor any part[\s\S]*/i,
  /Made possible by funding from[\s\S]*/i,
]

function stripCopyright(text) {
  if (!text) return text
  let t = text
  for (const pat of COPYRIGHT_PATTERNS) {
    t = t.replace(pat, '').trim()
  }
  return t
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
          result.gospelAcclamation = { text: stripCopyright(text || ref) }
        } else if (text || ref) {
          result[section] = { reference: ref, text: stripCopyright(text) }
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
      const text = stripCopyright(textBuf.join(' '))
      if (activeSec === 'gospelAcclamation') {
        result.gospelAcclamation = { text: stripCopyright(refBuf ?? text) }
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
    // v:2 ensures old cached entries missing copyright strip are ignored
    if (cachedDate === new Date().toDateString() && parsed.v === 2) return parsed
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
      if (!data.success || !data.html) {
        _promise = null // allow retry
        _error = true
        return null
      }
      const parsed = parseReadingsHtml(data.html)
      if (!parsed) {
        _promise = null // allow retry
        _error = true
        return null
      }
      const withMeta = { ...parsed, date: dateStr, fetchedAt: new Date().toISOString(), v: 2 }
      try { localStorage.setItem(`readings_${dateStr}`, JSON.stringify(withMeta)) } catch { /* quota */ }
      _cache = withMeta
      return withMeta
    })
    .catch(() => {
      clearTimeout(fetchTimeout)
      _promise = null // allow retry on next render
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
