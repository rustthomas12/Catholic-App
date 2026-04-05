/**
 * Vercel serverless function — Traditional Latin Mass readings proxy.
 * Fetches from Divinum Officium (divinumofficium.com), which provides
 * the 1962 Roman Missal readings in English.
 */
export default async function handler(req, res) {
  const { date } = req.query // expects YYYY-MM-DD

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: 'Invalid date format, expected YYYY-MM-DD' })
  }

  // Divinum Officium expects MM/DD/YYYY
  const [yyyy, mm, dd] = date.split('-')
  const doDate = `${mm}/${dd}/${yyyy}`

  try {
    const url = `https://www.divinumofficium.com/cgi-bin/missa/missa.pl?date=${doDate}&lang=English&version=1960`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return res.status(200).json({ success: false, html: null })
    }

    const html = await response.text()

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600')
    return res.status(200).json({ success: true, html })
  } catch {
    return res.status(200).json({ success: false, html: null })
  }
}
