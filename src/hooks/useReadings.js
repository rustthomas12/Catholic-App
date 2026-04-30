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

// ── HTML Parser (Universalis) ──────────────────────────────
// Structure: <table class="each"><tr><th>Section Label</th><th>Reference</th></tr></table>
// followed by <div class="p"> and <div class="pi"> for paragraph text,
// <h4> for the reading title, until the next <table class="each">.
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

    // Map Universalis section labels to result keys
    function detectSection(label) {
      const l = label.toLowerCase().trim()
      if (l.includes('first reading')) return 'firstReading'
      if (l.includes('second reading')) return 'secondReading'
      if (l.includes('responsorial psalm') || l === 'psalm') return 'psalm'
      if (l.includes('gospel acclamation') || l === 'sequence') return 'gospelAcclamation'
      if (l === 'gospel') return 'gospel'
      return null
    }

    // Find all <table class="each"> section headers
    const sectionTables = Array.from(doc.querySelectorAll('table.each'))

    sectionTables.forEach((table, idx) => {
      const ths = table.querySelectorAll('th')
      if (ths.length < 1) return
      const label = ths[0]?.textContent?.trim() ?? ''
      const reference = ths[1]?.textContent?.trim() ?? ''
      const key = detectSection(label)
      if (!key) return

      // Collect all sibling nodes between this table and the next section table
      const textParts = []
      let node = table.nextElementSibling
      const nextTable = sectionTables[idx + 1] ?? null

      while (node && node !== nextTable) {
        const tag = node.tagName?.toLowerCase()
        // <div class="p"> and <div class="pi"> hold the reading paragraphs
        // <h4> holds the reading title (skip — it's the subtitle, not scripture)
        if ((tag === 'div') && (node.className === 'p' || node.className === 'pi')) {
          const t = node.textContent?.trim()
          if (t) textParts.push(t)
        }
        node = node.nextElementSibling
      }

      const text = textParts.join('\n\n')

      if (key === 'gospelAcclamation') {
        result.gospelAcclamation = { text: reference ? `${label} ${reference}` : text }
      } else {
        result[key] = { reference, text }
      }
    })

    const hasContent = result.firstReading || result.gospel
    return hasContent ? result : null
  } catch {
    return null
  }
}

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
    if (cachedDate === new Date().toDateString() && parsed.v === 3) return parsed
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
      if (!data.success || !data.html) {
        _promises[lang] = null
        _errors[lang] = true
        return null
      }
      const parsed = parseReadingsHtml(data.html)
      if (!parsed) {
        _promises[lang] = null
        _errors[lang] = true
        return null
      }
      const withMeta = { ...parsed, date: dateStr, fetchedAt: new Date().toISOString(), v: 3 }
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

  const liturgicalInfo = getLiturgicalSeason(new Date())
  const feastInfo = isMajorFeastDay(new Date())
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
  _tlmError = false  // reset so a fresh attempt can succeed

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
    if (_tlmCache) {
      setState({ readings: _tlmCache, loading: false, error: false })
      return
    }
    // Allow retry on error (fetchTLMOnce resets _tlmError and _tlmPromise was cleared)
    fetchTLMOnce(today).then(result => {
      setState({ readings: result, loading: false, error: _tlmError })
    })
  }, [enabled, today])

  return { readings: state.readings, loading: state.loading, error: state.error }
}
