/**
 * Vercel serverless function — Traditional Latin Mass readings proxy.
 * POSTs to Divinum Officium to get the 1962 Roman Missal Mass propers in English.
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
    // DO requires a POST with command=praySancta Missa to get the full mass text
    const body = new URLSearchParams({
      date: doDate,
      lang: 'English',
      command: 'praySancta Missa',
      Propers: '1',
      version: '',
      setupm: '',
      searchvalue: '0',
      officium: 'missa.pl',
      browsertime: '',
      caller: '0',
      popup: '',
      first: '',
      compare: '0',
      kmonth: '',
    })

    const response = await fetch('https://www.divinumofficium.com/cgi-bin/missa/missa.pl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: body.toString(),
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
