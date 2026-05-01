/**
 * Vercel serverless function — Catholic Readings API proxy.
 * Source: https://cpbjr.github.io/catholic-readings-api/
 * Free JSON, NAB translation, no API key required. References only (no full text).
 * Date param: YYYYMMDD (legacy) or YYYY-MM-DD
 */
export default async function handler(req, res) {
  const { date } = req.query

  // Accept YYYYMMDD (legacy) or YYYY-MM-DD
  let isoDate
  if (/^\d{8}$/.test(date)) {
    isoDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    isoDate = date
  } else {
    return res.status(400).json({ success: false, error: 'Invalid date format, expected YYYYMMDD or YYYY-MM-DD' })
  }

  const [yyyy, mm, dd] = isoDate.split('-')
  const url = `https://cpbjr.github.io/catholic-readings-api/readings/${yyyy}/${mm}-${dd}.json`

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return res.status(200).json({ success: false, readings: null })
    }

    const data = await response.json()

    // API may return readings at top level or under a 'readings' key
    const raw = data.readings ?? data

    // API returns plain strings (references only) — normalize to { reference, text: null }
    function normalize(r) {
      if (!r) return null
      if (typeof r === 'string') return { reference: r, text: null }
      return r
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600')
    return res.status(200).json({
      success: true,
      readings: {
        firstReading:       normalize(raw.firstReading),
        psalm:              normalize(raw.psalm),
        secondReading:      normalize(raw.secondReading),
        gospelAcclamation:  normalize(raw.gospelAcclamation),
        gospel:             normalize(raw.gospel),
      },
      date: isoDate,
      season:      data.season      ?? null,
      celebration: data.celebration ?? null,
      usccbLink:   data.usccbLink   ?? `https://bible.usccb.org/bible/readings/${mm}${dd}${yyyy.slice(2)}.cfm`,
    })
  } catch {
    return res.status(200).json({ success: false, readings: null })
  }
}
