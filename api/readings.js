/**
 * Vercel serverless function — Catholic Readings API proxy.
 * References: https://cpbjr.github.io/catholic-readings-api/
 * Text:       https://bible-api.com/ (WEB translation, public domain, no key required)
 * Liturgical: http://calapi.inadiutorium.cz/ (Church Calendar API, free, no key required)
 */

// ── Liturgical colour → display values ──────────────────────
const COLOUR_MAP = {
  green:  { color: '#15803D', textColor: '#ffffff' },
  violet: { color: '#6B21A8', textColor: '#ffffff' },
  white:  { color: '#F5F0E8', textColor: '#1B2A4A' },
  red:    { color: '#DC2626', textColor: '#ffffff' },
  rose:   { color: '#DB2777', textColor: '#ffffff' },
}

const SEASON_LABEL = {
  ordinary:  'Ordinary Time',
  advent:    'Advent',
  christmas: 'Christmas',
  lent:      'Lent',
  easter:    'Easter',
}

// Fetch authoritative liturgical day data from calapi
async function fetchLiturgicalDay(yyyy, mm, dd) {
  // Drop leading zeros for calapi path (it accepts both but plain numbers are safer)
  const m = parseInt(mm, 10)
  const d = parseInt(dd, 10)
  const url = `http://calapi.inadiutorium.cz/api/v0/en/calendars/general-en/${yyyy}/${m}/${d}`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Fetch full reading text from bible-api.com given a reference like "Acts 13:26-33"
async function fetchBibleText(reference) {
  if (!reference) return null
  try {
    const path = reference.trim().replace(/\s+/g, '+')
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(path)}?translation=web`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    return data.text?.trim() || null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const { date } = req.query

  // Accept YYYYMMDD (legacy) or YYYY-MM-DD
  let isoDate
  if (/^\d{8}$/.test(date)) {
    isoDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    isoDate = date
  } else {
    return res.status(400).json({ success: false, error: 'Invalid date format' })
  }

  const [yyyy, mm, dd] = isoDate.split('-')

  // Fetch readings references + liturgical day data in parallel
  const cpbjrUrl = `https://cpbjr.github.io/catholic-readings-api/readings/${yyyy}/${mm}-${dd}.json`

  const [cpbjrRes, litDay] = await Promise.all([
    fetch(cpbjrUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null),
    fetchLiturgicalDay(yyyy, mm, dd),
  ])

  // ── Build liturgicalInfo from calapi data ──────────────────
  let liturgicalInfo = null
  let feastInfo = { isFeast: false, feastName: null }

  if (litDay) {
    // Celebrations are ordered by rank_num ascending (lowest = highest priority)
    const primary = litDay.celebrations?.[0] ?? null
    const colour = primary?.colour ?? 'green'
    const displayColors = COLOUR_MAP[colour] ?? COLOUR_MAP.green
    liturgicalInfo = {
      season:    litDay.season,
      label:     SEASON_LABEL[litDay.season] ?? litDay.season,
      weekNum:   litDay.season_week,
      colour,
      ...displayColors,
    }

    // It's a feast if the top celebration has a title and isn't just ferial
    if (primary?.title && primary.rank !== 'ferial') {
      feastInfo = { isFeast: true, feastName: primary.title }
    }
  }

  // ── Build readings if cpbjr returned data ──────────────────
  if (!cpbjrRes) {
    return res.status(200).json({
      success: false,
      readings: null,
      liturgicalInfo,
      feastInfo,
    })
  }

  const raw = cpbjrRes.readings ?? cpbjrRes

  function getRef(r) {
    if (!r) return null
    if (typeof r === 'string') return r
    return r.reference ?? r.ref ?? null
  }

  const refs = {
    firstReading:      getRef(raw.firstReading),
    psalm:             getRef(raw.psalm),
    secondReading:     getRef(raw.secondReading),
    gospelAcclamation: getRef(raw.gospelAcclamation),
    gospel:            getRef(raw.gospel),
  }

  // For psalms, bible-api struggles with comma-separated multi-sections — use first section only
  function psalmRef(ref) {
    if (!ref) return null
    return ref.split(',')[0].trim()
  }

  const [firstText, psalmText, secondText, gospelText] = await Promise.all([
    fetchBibleText(refs.firstReading),
    fetchBibleText(psalmRef(refs.psalm)),
    fetchBibleText(refs.secondReading),
    fetchBibleText(refs.gospel),
  ])

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600')
  return res.status(200).json({
    success: true,
    readings: {
      firstReading:      refs.firstReading      ? { reference: refs.firstReading,      text: firstText }  : null,
      psalm:             refs.psalm             ? { reference: refs.psalm,             text: psalmText }  : null,
      secondReading:     refs.secondReading     ? { reference: refs.secondReading,     text: secondText } : null,
      gospelAcclamation: refs.gospelAcclamation ? { reference: refs.gospelAcclamation, text: null }       : null,
      gospel:            refs.gospel            ? { reference: refs.gospel,            text: gospelText } : null,
    },
    liturgicalInfo,
    feastInfo,
    date: isoDate,
    usccbLink: cpbjrRes.usccbLink ?? `https://bible.usccb.org/bible/readings/${mm}${dd}${yyyy.slice(2)}.cfm`,
  })
}
