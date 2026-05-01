/**
 * Vercel serverless function — Traditional Latin Mass readings proxy.
 * Source: Missale Meum API (https://www.missalemeum.com/en/api/v5/date/YYYY-MM-DD)
 * Free REST API, full 1962 missal propers, proper JSON (no scraping).
 * Date param: YYYY-MM-DD or YYYYMMDD
 */
export default async function handler(req, res) {
  const { date } = req.query

  // Accept YYYYMMDD or YYYY-MM-DD
  let isoDate
  if (/^\d{8}$/.test(date)) {
    isoDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    isoDate = date
  } else {
    return res.status(400).json({ success: false, error: 'Invalid date format, expected YYYY-MM-DD or YYYYMMDD' })
  }

  try {
    const response = await fetch(
      `https://www.missalemeum.com/en/api/v5/date/${isoDate}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!response.ok) {
      return res.status(200).json({ success: false, readings: null })
    }

    const data = await response.json()

    // API returns an array of observances; use the first (main Mass)
    const observance = Array.isArray(data) ? data[0] : data
    if (!observance) {
      return res.status(200).json({ success: false, readings: null })
    }

    // Build a lookup by section id
    const proper = observance.proper ?? []
    const sections = {}
    for (const section of proper) {
      if (section.id) sections[section.id] = section
    }

    // Extract reference and text from a proper section.
    // Missale Meum section shape: { id, label, body: string[][] | string[] }
    function extractSection(...ids) {
      for (const id of ids) {
        const s = sections[id]
        if (!s) continue
        // `label` or `title` often holds the scripture citation
        const reference = s.label ?? s.title ?? null
        let text = null
        if (Array.isArray(s.body)) {
          // body may be string[][] or string[] — flatten and join
          const parts = s.body
            .flat()
            .map(b => (typeof b === 'string' ? b.trim() : (b?.text ?? '')))
            .filter(Boolean)
          text = parts.join('\n\n') || null
        } else if (typeof s.body === 'string') {
          text = s.body.trim() || null
        }
        return { reference, text }
      }
      return null
    }

    const readings = {
      epistle: extractSection('Lectio', 'Epistola'),
      gradual: extractSection('Graduale', 'Tractus', 'Alleluia', 'Sequentia'),
      gospel:  extractSection('Evangelium'),
    }

    // Mass name from observance info or celebration array
    const massName =
      observance.info?.title ??
      (Array.isArray(observance.celebration) ? observance.celebration[0]?.title : null) ??
      null

    const liturgicalColor =
      observance.info?.color ??
      (Array.isArray(observance.celebration) ? observance.celebration[0]?.color : null) ??
      null

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600')
    return res.status(200).json({
      success: true,
      readings,
      massName,
      liturgicalColor,
      sourceUrl: `https://www.missalemeum.com/en/${isoDate}`,
    })
  } catch {
    return res.status(200).json({ success: false, readings: null })
  }
}
