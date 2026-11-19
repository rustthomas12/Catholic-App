import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import App from './App.jsx'
import { i18nReady } from './utils/i18n'
import { isNative, platform } from './lib/platform'
import { getMyMemberships } from './lib/myMemberships'
import { installErrorReporting } from './lib/errorReporting'

installErrorReporting()

// iOS / Android app: route browser APIs to native plugins and tag <html> so
// CSS can account for the status bar / notch (see index.css).
if (isNative) {
  document.documentElement.classList.add('cap-native', `cap-${platform}`)
  import('./lib/nativeShims').then((m) => m.installNativeShims())
}

// When Vite fails to load a lazy chunk (e.g. after a new deploy invalidates
// old hashed filenames), reload once to pick up the fresh asset manifest.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  window.location.reload()
})

// ── Update banner shown when a new SW is waiting ──────────
function UpdateBanner({ onUpdate }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-3 bg-navy text-white shadow-lg"
      role="alert"
    >
      <span className="text-sm font-medium">App updated — reload for the latest version.</span>
      <button
        onClick={onUpdate}
        className="flex-shrink-0 bg-gold text-navy text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-opacity-90 transition-colors"
      >
        Reload
      </button>
    </div>
  )
}

function AppWithSWUpdater() {
  const [needsRefresh, setNeedsRefresh] = useState(false)

  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setNeedsRefresh(true)
    },
    onOfflineReady() {
      // PWA is ready for offline use — no user-visible notification needed
    },
    // Phones rarely fully reload a home-screen app: it resumes from the
    // background and would keep running an old version for days. Check for
    // a new build whenever the app returns to the foreground, and hourly
    // while it stays open.
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      let last = Date.now()
      const check = () => {
        if (!navigator.onLine || Date.now() - last < 60_000) return
        last = Date.now()
        registration.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      window.addEventListener('focus', check)
      setInterval(check, 60 * 60_000)
    },
  })

  function handleUpdate() {
    setNeedsRefresh(false)
    updateServiceWorker(true)
  }

  return (
    <>
      {needsRefresh && <UpdateBanner onUpdate={handleUpdate} />}
      <App />
    </>
  )
}

// Signed-in users: start downloading the home screen now, in parallel with
// the sign-in check, instead of after it. Also start the membership lookups:
// the feed, the navigation and the groups list all wait on them, and they
// used to start only after the home screen's code had downloaded and run.
try {
  const stored = localStorage.getItem('parish-app-auth')
  if (stored) {
    if (location.pathname === '/') import('./pages/HomePage.jsx')
    const userId = JSON.parse(stored)?.user?.id
    if (userId) getMyMemberships(userId).catch(() => { /* retried when needed */ })
  }
} catch { /* storage unavailable: it loads normally */ }

// Spanish users: draw once their strings are loaded (instant for English)
i18nReady.then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      {/* Native apps ship their web assets in the binary (updated through the
          stores), so there is no service worker to register or update. */}
      {isNative ? <App /> : <AppWithSWUpdater />}
    </StrictMode>,
  )
})
