/**
 * Vercel serverless function — Traditional Latin Mass readings proxy.
 * Source: Missale Meum API (https://www.missalemeum.com/en/api/v5/proper/YYYY-MM-DD)
 * Free REST API, full 1962 missal propers, JSON.
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
      `https://www.missalemeum.com/en/api/v5/proper/${isoDate}`,
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

    // API returns an array; use the first observance (main Mass)
    const observance = Array.isArray(data) ? data[0] : data
    if (!observance) {
      return res.status(200).json({ success: false, readings: null })
    }

    // Sections are under 'sections', not 'proper'
    const sectionList = observance.sections ?? []
    const sections = {}
    for (const section of sectionList) {
      if (section.id) sections[section.id] = section
    }

    // body is an array of bilingual pairs: [[english, latin], ...]
    // Extract English text only.
    function extractText(section) {
      if (!section?.body) return null
      return section.body
        .map(pair => (Array.isArray(pair) ? pair[0] : pair))
        .filter(Boolean)
        .join('\n\n')
        .trim() || null
    }

    function extractSection(...ids) {
      for (const id of ids) {
        const s = sections[id]
        if (!s) continue
        return { reference: null, text: extractText(s) }
      }
      return null
    }

    const readings = {
      // 'GradualeP' is used during Paschaltide; 'Graduale' otherwise
      epistle: extractSection('Lectio', 'Epistola'),
      gradual: extractSection('GradualeP', 'Graduale', 'Tractus', 'Alleluia', 'Sequentia'),
      gospel:  extractSection('Evangelium'),
    }

    // info.colors is an array (e.g. ["white"])
    const massName       = observance.info?.title ?? null
    const liturgicalColor = observance.info?.colors?.[0] ?? null

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
