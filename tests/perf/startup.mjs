/**
 * Startup performance probe: cold and warm loads of the app as a signed-in
 * user on a phone-sized, throttled connection.
 *
 *   node --env-file=.env.local tests/perf/startup.mjs [baseUrl] [path]
 *
 * Signs in as the App Review demo account with a one-time login link
 * (service role), so no password is needed. Prints first paint, when the
 * feed is on screen, JS/CSS bytes before first paint, and the Supabase
 * request waterfall during startup.
 */
import { chromium, devices } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = process.argv[2] || 'https://app.getinfold.app'
const PATH = process.env.PROBE_PATH || '/'
const url = process.env.VITE_SUPABASE_URL

async function session() {
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: 'appreview@getinfold.app' })
  if (error) throw error
  const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: v, error: e2 } = await anon.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
  if (e2) throw e2
  return v.session
}

const sess = await session()
const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['Pixel 7'] })
await ctx.addInitScript((s) => {
  try {
    if (!localStorage.getItem('parish-app-auth')) localStorage.setItem('parish-app-auth', JSON.stringify(s))
    localStorage.setItem('parish_welcome_dismissed', '1')
    localStorage.setItem('infold-push-dismissed', 'true')
    sessionStorage.setItem('pwa_install_dismissed', '1')
  } catch {}
}, sess)

async function run(label) {
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  // "Fast 4G"-ish: 40 ms RTT, ~9 Mbps down, 4x CPU slowdown (mid-range phone)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 9e6 / 8, uploadThroughput: 3e6 / 8 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  const reqs = []
  const t0 = Date.now()
  page.on('requestfinished', async (r) => {
    const t = r.timing()
    const sizes = await r.sizes().catch(() => ({ responseBodySize: 0 }))
    reqs.push({ url: r.url(), type: r.resourceType(), start: Math.round(t.startTime - t0), dur: Math.round(t.responseEnd), bytes: sizes.responseBodySize, fromSW: r.response ? false : false })
  })
  await page.goto(BASE + PATH, { waitUntil: 'commit' })
  // Feed is "ready" when a post card or the empty state is on screen
  const feedReady = await page.waitForFunction(() => {
    return !!document.querySelector('article, [data-post-id]') || /all caught up/i.test(document.body.innerText)
  }, null, { timeout: 30000 }).then(() => Date.now() - t0).catch(() => null)
  await page.waitForTimeout(2500)
  const paint = await page.evaluate(() => {
    const p = Object.fromEntries(performance.getEntriesByType('paint').map((e) => [e.name, Math.round(e.startTime)]))
    const nav = performance.getEntriesByType('navigation')[0]
    return { fcp: p['first-contentful-paint'], ttfb: Math.round(nav.responseStart), domReady: Math.round(nav.domContentLoadedEventEnd) }
  })
  const fcp = paint.fcp ?? 0
  const before = reqs.filter((r) => r.start <= fcp && ['script', 'stylesheet'].includes(r.type))
  const sb = reqs.filter((r) => r.url.includes('supabase.co') && !r.url.includes('/storage/'))
    .sort((a, b) => a.start - b.start)
    .map((r) => `${String(r.start).padStart(5)}ms +${String(r.dur).padStart(4)}ms  ${r.url.replace(/^https:\/\/[^/]+/, '').split('?')[0]}${r.url.includes('?') ? '?' + new URL(r.url).searchParams.get('select')?.slice(0, 40) : ''}`)
  console.log(`\n=== ${label} ===`)
  console.log(`TTFB ${paint.ttfb}ms · first paint ${fcp}ms · DOM ready ${paint.domReady}ms · feed on screen ${feedReady}ms`)
  console.log(`JS/CSS before first paint: ${before.length} files, ${Math.round(before.reduce((a, r) => a + r.bytes, 0) / 1024)} KB (transfer may be compressed)`)
  console.log(`All requests in first ${feedReady + 2500}ms: ${reqs.length} · scripts ${reqs.filter((r) => r.type === 'script').length} · supabase ${sb.length}`)
  console.log('Supabase waterfall:\n  ' + sb.join('\n  '))
  await page.close()
}

await run('cold load')
await run('warm load (cached)')
await browser.close()
