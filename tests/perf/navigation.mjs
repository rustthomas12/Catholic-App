/**
 * Navigation smoothness probe: taps through the main screens of a production
 * build as the demo account (phone viewport, 4x CPU slowdown, fast 4G) and
 * reports how long each screen takes to settle (no spinners or skeletons),
 * first visit and repeat visit, plus any console errors.
 *
 *   node --env-file=.env.local tests/perf/navigation.mjs [baseUrl]
 */
import { chromium, devices } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = process.argv[2] || 'http://localhost:4181'
const url = process.env.VITE_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data } = await admin.auth.admin.generateLink({ type: 'magiclink', email: 'appreview@getinfold.app' })
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data: v } = await anon.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })

const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['Pixel 7'] })
await ctx.addInitScript((s) => {
  try {
    if (!localStorage.getItem('parish-app-auth')) localStorage.setItem('parish-app-auth', JSON.stringify(s))
    localStorage.setItem('parish_welcome_dismissed', '1'); localStorage.setItem('infold-push-dismissed', 'true')
    sessionStorage.setItem('pwa_install_dismissed', '1')
  } catch {}
}, v.session)
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${page.url().replace(BASE, '')}] ${m.text().slice(0, 160)}`) })
page.on('pageerror', (e) => errors.push(`[${page.url().replace(BASE, '')}] PAGEERROR ${e.message.slice(0, 160)}`))
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 9e6 / 8, uploadThroughput: 3e6 / 8 })
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// Bottom-nav and in-app links, as a person would tap them
const ROUTES = ['/groups', '/faith', '/notifications', '/messages', '/directory', '/profile', '/faith/rosary', '/saints', '/']
async function visit(path) {
  return page.evaluate(async (r) => {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms))
    const busy = () => !!document.querySelector('.animate-spin, .animate-pulse, [aria-busy="true"]')
    const link = [...document.querySelectorAll('a[href]')].find((a) => a.getAttribute('href') === r && a.offsetParent !== null)
    const t0 = performance.now()
    let firstContent = null
    if (link) link.click()
    else { history.pushState({}, '', r); dispatchEvent(new PopStateEvent('popstate')) }
    // settled = on the route, no loading indicators for 150 ms in a row
    let calmSince = null
    while (performance.now() - t0 < 10000) {
      await sleep(16)
      if (location.pathname !== r) continue
      if (firstContent === null && document.querySelector('main *, h1, h2')) firstContent = performance.now() - t0
      if (busy()) { calmSince = null; continue }
      calmSince ??= performance.now()
      if (performance.now() - calmSince > 150) break
    }
    return { how: link ? 'tap' : 'url', settled: Math.round((calmSince ?? performance.now()) - t0), first: Math.round(firstContent ?? -1) }
  }, path)
}
for (const pass of ['first visit', 'repeat visit']) {
  console.log(`\n--- ${pass} ---`)
  for (const r of ROUTES) {
    const res = await visit(r)
    console.log(`${r.padEnd(16)} ${res.how}  content ${String(res.first).padStart(5)}ms  settled ${String(res.settled).padStart(5)}ms`)
    await page.waitForTimeout(300)
  }
}
console.log(`\nconsole errors: ${errors.length}`)
for (const e of [...new Set(errors)].slice(0, 25)) console.log('  ' + e)
await browser.close()
