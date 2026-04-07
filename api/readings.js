/**
 * Vercel serverless function — Universalis readings proxy.
 * Fetches today's Mass readings from universalis.com (static HTML, no JS rendering).
 * Date param: YYYYMMDD
 */
export default async function handler(req, res) {
  const { date } = req.query

  // Validate: must be exactly 8 digits (YYYYMMDD)
  if (!date || !/^\d{8}$/.test(date)) {
    return res.status(400).json({ success: false, error: 'Invalid date format, expected YYYYMMDD' })
  }

  try {
    const url = `https://universalis.com/${date}/mass.htm`
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
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
