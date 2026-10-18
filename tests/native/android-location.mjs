/**
 * Checks the "Near me" flow in the Android app: native permission prompt,
 * then the directory switches to the map with the user's location.
 * Run with the app signed in (see android-smoke.mjs).
 *   node tests/native/android-location.mjs
 */
import { _android } from 'playwright'
import { execFileSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'

const ADB = process.env.ADB || 'adb'
const OUT = process.env.SHOT_DIR || 'test-results/native'
mkdirSync(OUT, { recursive: true })
const shot = (name) => writeFileSync(`${OUT}/${name}.png`, execFileSync(ADB, ['exec-out', 'screencap', '-p'], { maxBuffer: 50 * 1024 * 1024 }))

// Give the emulator a location (Worcester, MA) and reset the permission
// The emulator only reports GPS while fixes keep arriving
const feeder = setInterval(() => { try { execFileSync(ADB, ['emu', 'geo', 'fix', '-71.8023', '42.2626']) } catch { /* ignore */ } }, 1000)
try { execFileSync(ADB, ['shell', 'pm', 'revoke', 'app.getinfold', 'android.permission.ACCESS_FINE_LOCATION']) } catch { /* not granted yet */ }
try { execFileSync(ADB, ['shell', 'pm', 'revoke', 'app.getinfold', 'android.permission.ACCESS_COARSE_LOCATION']) } catch { /* not granted yet */ }

// Revoking a permission kills the app — start it again
execFileSync(ADB, ['shell', 'monkey', '-p', 'app.getinfold', '-c', 'android.intent.category.LAUNCHER', '1'])
await new Promise((r) => setTimeout(r, 8000))

const [device] = await _android.devices()
const page = await (await device.webView({ pkg: 'app.getinfold' })).page()
await page.evaluate(() => { window.history.pushState({}, '', '/directory'); window.dispatchEvent(new PopStateEvent('popstate')) })
await page.waitForTimeout(2000)
await page.getByRole('button', { name: 'Use my location' }).click()
await page.waitForTimeout(2500)
shot('10-location-prompt')

// Tap "While using the app" on the system dialog
const ui = execFileSync(ADB, ['exec-out', 'uiautomator', 'dump', '/dev/tty']).toString()
const m = ui.match(/text="While using the app"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
console.log(m ? '✓ native location permission prompt shown' : '✗ no permission prompt found')
if (m) {
  const x = (Number(m[1]) + Number(m[3])) / 2, y = (Number(m[2]) + Number(m[4])) / 2
  execFileSync(ADB, ['shell', 'input', 'tap', String(x), String(y)])
}
await page.waitForTimeout(22000)
const label = await page.getByRole('button', { name: /Location enabled|Use my location|Finding/ }).first().getAttribute('aria-label')
const err = await page.getByText(/Location permission denied|Could not get your location/).count()
console.log(label === 'Location enabled' && err === 0 ? '✓ location received, directory uses it' : `✗ location state: ${label}, errors shown: ${err}`)
shot('11-location-map')
clearInterval(feeder)
await device.close()
