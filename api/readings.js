/**
 * Vercel serverless function — USCCB readings proxy.
 * Fetches the USCCB readings HTML server-side to avoid CORS issues.
 * Cached by Vercel CDN for 1 hour.
 */
export default async function handler(req, res) {
  const { date } = req.query

  // Validate: must be exactly 6 digits (MMDDYY — USCCB URL format)
  if (!date || !/^\d{6}$/.test(date)) {
    return res.status(400).json({ success: false, html: null, error: 'Invalid date format, expected MMDDYY' })
  }

  try {
    const url = `https://bible.usccb.org/bible/readings/${date}.cfm`
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return res.status(200).json({ success: false, html: null })
    }

    const html = await response.text()

    // Cache for 1 hour at CDN edge, allow stale for another hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600')
    return res.status(200).json({ success: true, html })
  } catch {
    return res.status(200).json({ success: false, html: null })
  }
}
