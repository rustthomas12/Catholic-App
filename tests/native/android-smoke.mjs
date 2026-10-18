/**
 * Smoke test for the real Android app running in an emulator / USB phone.
 *
 * Prereqs: an emulator or USB phone visible to adb, with the debug build
 * installed and launched (debug builds allow WebView inspection).
 * Run:
 *   node --env-file=.env.local tests/native/android-smoke.mjs
 * Optional signed-in checks: E2E_EMAIL / E2E_PASSWORD
 */
import { _android } from 'playwright'
import { execFileSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'

const OUT = process.env.SHOT_DIR || 'test-results/native'
const ADB = process.env.ADB || 'adb'
mkdirSync(OUT, { recursive: true })

const results = []
const errors = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}
function screenshot(name) {
  try {
    const png = execFileSync(ADB, ['exec-out', 'screencap', '-p'], { maxBuffer: 50 * 1024 * 1024 })
    const file = `${OUT}/${name}.png`
    writeFileSync(file, png)
    return file
  } catch { return null }
}

const [device] = await _android.devices()
if (!device) { console.error('No Android device found (adb devices)'); process.exit(1) }
const webview = await device.webView({ pkg: 'app.getinfold' })
const page = await webview.page()
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

const nav = async (path) => {
  await page.evaluate((p) => { window.history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')) }, path)
  await page.waitForTimeout(1500)
}

// 1. Native environment detected
const env = await page.evaluate(() => ({
  href: location.href,
  native: document.documentElement.classList.contains('cap-native'),
  platform: document.documentElement.classList.contains('cap-android') ? 'android' : 'other',
  sw: 'serviceWorker' in navigator ? navigator.serviceWorker.controller !== null : false,
  share: typeof navigator.share === 'function',
}))
check('runs inside Capacitor (cap-native class)', env.native && env.platform === 'android', env.href)
check('no service worker controls the app', env.sw === false)
check('native share shim installed', env.share)

// 2. API reachable cross-origin (CORS for https://localhost)
const API_ORIGIN = process.env.API_ORIGIN || 'https://app.getinfold.app'
const api = await page.evaluate(async (origin) => {
  try {
    const d = new Date().toISOString().slice(0, 10)
    const r = await fetch(`${origin}/api/readings?date=${d}`)
    return { status: r.status }
  } catch (e) { return { error: String(e) } }
}, API_ORIGIN)
check('readings API reachable from the app', api.status === 200, JSON.stringify(api))

// 3. Login screen renders
await nav('/login')
const loginVisible = await page.getByPlaceholder('you@example.com').isVisible().catch(() => false)
check('login screen renders', loginVisible)
screenshot('01-login')

// 4. Signed-in tour
if (process.env.E2E_EMAIL) {
  await page.getByPlaceholder('you@example.com').fill(process.env.E2E_EMAIL)
  await page.getByPlaceholder('••••••••').fill(process.env.E2E_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => {})
  check('signs in', !page.url().includes('/login'), page.url())
  await page.waitForTimeout(3000)
  screenshot('02-home')

  for (const [path, name] of [['/faith', '03-faith'], ['/directory', '04-directory'], ['/groups', '05-groups'], ['/messages', '06-messages'], ['/settings', '07-settings'], ['/profile', '08-profile'], ['/settings/blocked', '09-blocked']]) {
    await nav(path)
    await page.waitForTimeout(2000)
    const broken = await page.getByText(/Something went wrong|Page not found/).count()
    check(`${path} renders`, broken === 0)
    screenshot(name)
  }

  // Native clipboard shim (used by "copy link" buttons)
  const clip = await page.evaluate(async () => {
    try { await navigator.clipboard.writeText('infold-test'); return 'ok' } catch (e) { return String(e) }
  })
  check('clipboard works', clip === 'ok', clip)

  // Android back button returns to the previous screen
  await nav('/settings')
  await nav('/settings/notifications')
  execFileSync(ADB, ['shell', 'input', 'keyevent', '4'])
  await page.waitForTimeout(1500)
  check('Android back button goes back', new URL(page.url()).pathname === '/settings', page.url())
}

const realErrors = errors.filter((e) => !/favicon|Failed to load resource/i.test(e))
check('no JavaScript errors', realErrors.length === 0, realErrors.slice(0, 5).join(' | '))

await device.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
