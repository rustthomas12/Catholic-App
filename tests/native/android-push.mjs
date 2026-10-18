/**
 * End-to-end push test on an Android emulator / phone:
 * sign in → enable notifications → token registered → create a notification
 * in the database → the phone receives a system notification.
 *
 *   node --env-file=.env.local tests/native/android-push.mjs
 * Needs PUSH_EMAIL / PUSH_PASSWORD (a test account) and
 * SUPABASE_SERVICE_ROLE_KEY. Requires Firebase config in the build.
 */
import { _android } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'

const ADB = process.env.ADB || 'adb'
const OUT = process.env.SHOT_DIR || 'test-results/native'
mkdirSync(OUT, { recursive: true })
const adb = (...a) => execFileSync(ADB, a, { maxBuffer: 50 * 1024 * 1024 })
const shot = (n) => writeFileSync(`${OUT}/${n}.png`, adb('exec-out', 'screencap', '-p'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function tapText(text) {
  const ui = adb('exec-out', 'uiautomator', 'dump', '/dev/tty').toString()
  const re = new RegExp(`text="${text}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, 'i')
  const m = ui.match(re)
  if (!m) return false
  adb('shell', 'input', 'tap', String((+m[1] + +m[3]) / 2), String((+m[2] + +m[4]) / 2))
  return true
}

const [device] = await _android.devices()
const page = await (await device.webView({ pkg: 'app.getinfold' })).page()
const go = async (p) => {
  await page.evaluate((x) => { history.pushState({}, '', x); dispatchEvent(new PopStateEvent('popstate')) }, p)
  await sleep(2000)
}

// Sign in (if needed)
await go('/login')
if (await page.getByPlaceholder('you@example.com').isVisible().catch(() => false)) {
  await page.getByPlaceholder('you@example.com').fill(process.env.PUSH_EMAIL)
  await page.getByPlaceholder('••••••••').fill(process.env.PUSH_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
}
const userId = await page.evaluate(() => JSON.parse(localStorage.getItem('parish-app-auth')).user.id)
console.log('✓ signed in')

// Enable notifications
await go('/settings/notifications')
await page.getByRole('button', { name: /enable push notifications/i }).click()
await sleep(2500)
if (tapText('Allow')) console.log('✓ Android notification permission granted')
await sleep(6000)

const { data: tokens } = await admin.from('native_push_tokens').select('token,platform').eq('user_id', userId)
console.log(tokens?.length ? `✓ device registered for push (${tokens[0].platform})` : '✗ no push token saved')
shot('20-push-enabled')

// Send the app to the background, then trigger a notification
adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
await sleep(1500)
const marker = `Push test ${Date.now()}`
await admin.from('notifications').insert({ user_id: userId, type: 'prayer_response', message: marker, is_read: false })
await sleep(12000)

const notes = adb('shell', 'dumpsys', 'notification', '--noredact').toString()
const got = notes.includes('app.getinfold') && /Prayer response/i.test(notes)
console.log(got ? '✓ push notification received on the device' : '✗ no notification arrived')
adb('shell', 'cmd', 'statusbar', 'expand-notifications')
await sleep(1500)
shot('21-push-received')
adb('shell', 'cmd', 'statusbar', 'collapse')

// Clean up the test notification
await admin.from('notifications').delete().eq('user_id', userId).eq('message', marker)
await device.close()
process.exit(got && tokens?.length ? 0 : 1)
