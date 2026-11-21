import { isNative } from './platform'

// The logo screen (index.html #boot, and the native splash in the iOS /
// Android app) stays up until the first screen has real content, instead of
// vanishing the moment the code starts and leaving grey placeholders.
// The Home feed calls markAppReady() once its first posts are in; other
// screens call it as soon as they draw. A hard cap means it never sticks.
const MAX_MS = 4000
let done = false

export function markAppReady() {
  if (done) return
  done = true
  const el = document.getElementById('boot')
  if (el) {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 250)
  }
  if (isNative) {
    import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 200 }))
      .catch(() => {})
  }
}

setTimeout(markAppReady, MAX_MS)
