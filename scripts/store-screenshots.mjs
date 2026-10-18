/**
 * Captures App Store / Google Play screenshots at the exact required sizes.
 *
 *   npx vite --port 5180 &          (dev server)
 *   node --env-file=.env.local scripts/store-screenshots.mjs
 *
 * Signs in with REVIEW_EMAIL / REVIEW_PASSWORD (the App Review demo account).
 * Output: store-assets/screenshots/<device>/NN-name.png
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'

const BASE = process.env.BASE_URL || 'http://localhost:5180'
const OUT = 'store-assets/screenshots'

const DEVICES = {
  // App Store 6.9" iPhone: 1320 × 2868
  'iphone-6.9': { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' },
  // App Store 13" iPad: 2064 × 2752
  'ipad-13': { viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' },
  // Google Play phone: 1080 × 2400
  'android-phone': { viewport: { width: 360, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' },
}

const SHOTS = [
  ['01-daily-readings', '/faith'],
  ['02-parish-directory', '/directory', async (page) => {
    await page.getByRole('button', { name: 'Use my location' }).first().click()
    await page.waitForTimeout(4000)
  }],
  ['03-saints', '/saints'],
  ['04-rosary', '/faith/rosary'],
  ['05-examination', '/faith/examination'],
  ['06-liturgy-of-the-hours', '/faith/hours'],
]

const browser = await chromium.launch()
for (const [name, device] of Object.entries(DEVICES)) {
  mkdirSync(`${OUT}/${name}`, { recursive: true })
  const context = await browser.newContext({
    ...device,
    geolocation: { latitude: 42.2626, longitude: -71.8023 }, // Worcester, MA
    permissions: ['geolocation'],
    locale: 'en-US',
  })
  // Keep prompts and banners out of the screenshots
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('pwa_install_dismissed', '1')
      localStorage.setItem('infold-push-dismissed', 'true')
    } catch { /* ignore */ }
  })
  const page = await context.newPage()
  await page.goto(`${BASE}/login`)
  await page.getByPlaceholder('you@example.com').fill(process.env.REVIEW_EMAIL)
  await page.getByPlaceholder('••••••••').fill(process.env.REVIEW_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })

  for (const [shot, path, prepare] of SHOTS) {
    await page.goto(`${BASE}${path}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2500)
    if (prepare) await prepare(page)
    await page.screenshot({ path: `${OUT}/${name}/${shot}.png` })
    console.log(`${name}/${shot}`)
  }
  await context.close()
}
await browser.close()
