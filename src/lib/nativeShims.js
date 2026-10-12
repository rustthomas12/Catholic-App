// ── Native browser-API shims ───────────────────────────────
// Inside the iOS / Android apps a few browser APIs are missing (Android's
// WebView has no navigator.share) or behave poorly (iOS shows a second
// "localhost would like to use your location" prompt). These shims route the
// standard APIs to Capacitor plugins so the existing page code keeps working
// unchanged. Only installed when running natively.

import { Share } from '@capacitor/share'
import { Clipboard } from '@capacitor/clipboard'
import { Geolocation } from '@capacitor/geolocation'

function define(target, key, value) {
  try {
    Object.defineProperty(target, key, { value, configurable: true, writable: true })
  } catch {
    try { target[key] = value } catch { /* read-only — leave as is */ }
  }
}

// GeolocationPositionError-compatible object
function positionError(code, message) {
  return { code, message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }
}

export function installNativeShims() {
  // navigator.share → native share sheet. Rejects when the user cancels,
  // matching the Web Share API (callers already catch that).
  define(navigator, 'share', async ({ title, text, url } = {}) => {
    await Share.share({ title, text, url, dialogTitle: title })
  })
  define(navigator, 'canShare', () => true)

  // navigator.clipboard.writeText → native clipboard
  const writeText = (text) => Clipboard.write({ string: String(text) })
  if (navigator.clipboard) define(navigator.clipboard, 'writeText', writeText)
  else define(navigator, 'clipboard', { writeText })

  // navigator.geolocation.getCurrentPosition → native location services
  if (navigator.geolocation) {
    define(navigator.geolocation, 'getCurrentPosition', (success, error, options = {}) => {
      ;(async () => {
        try {
          let perm = await Geolocation.checkPermissions()
          if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
            perm = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] })
          }
          if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
            error?.(positionError(1, 'User denied Geolocation'))
            return
          }
          const timeout = options.timeout ?? 10000
          let pos
          try {
            // Quick network-based fix; a position from the last few minutes is
            // plenty for "parishes near me"
            pos = await Geolocation.getCurrentPosition({
              enableHighAccuracy: !!options.enableHighAccuracy,
              timeout,
              maximumAge: options.maximumAge ?? 5 * 60 * 1000,
            })
          } catch (err) {
            // No network location (GPS-only device, no Wi-Fi/cell): try GPS once
            if (options.enableHighAccuracy || !/time/i.test(String(err?.message || err))) throw err
            pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout, maximumAge: 0 })
          }
          success?.(pos)
        } catch (err) {
          const msg = String(err?.message || err)
          const code = /denied|permission/i.test(msg) ? 1 : /timeout/i.test(msg) ? 3 : 2
          error?.(positionError(code, msg))
        }
      })()
    })
  }
}
