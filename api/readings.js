/**
 * Vercel serverless function — Catholic Readings API proxy.
 * References: https://cpbjr.github.io/catholic-readings-api/
 * Text:       https://bible-api.com/ (WEB translation, public domain, no key required)
 */

// Fetch full reading text from bible-api.com given a reference like "Acts 13:26-33"
async function fetchBibleText(reference) {
  if (!reference) return null
  try {
    // bible-api.com accepts references as path, spaces as +
    const path = reference.trim().replace(/\s+/g, '+')
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(path)}?translation=web`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    // bible-api returns verses array or a text block; prefer text
    const text = data.text?.trim()
    return text || null
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
    const raw = data.readings ?? data

    // Extract reference strings from the cpbjr payload (may be string or object)
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

    // Fetch all texts in parallel — psalm and gospel acclamation are often short verses
    // For psalm, bible-api may not handle comma-separated multi-sections well; fetch first section only
    function psalmRef(ref) {
      if (!ref) return null
      // "Psalm 2:6-7, 8-9, 10-11" → take up to the first comma for the lookup
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
      date: isoDate,
      season:      data.season      ?? null,
      celebration: data.celebration ?? null,
      usccbLink:   data.usccbLink   ?? `https://bible.usccb.org/bible/readings/${mm}${dd}${yyyy.slice(2)}.cfm`,
    })
  } catch {
    return res.status(200).json({ success: false, readings: null })
  }
}
