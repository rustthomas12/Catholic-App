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
  // Don't wipe a half-written post; the screen that failed to load will
  // show its error and the next navigation retries
  if (safeToReload()) window.location.reload()
})

// ── Update banner shown when a new SW is waiting ──────────
function UpdateBanner({ onUpdate }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-3 bg-navy text-white shadow-lg"
      role="alert"
    >
      <span className="text-sm font-medium">A new version is ready. Reload when you've finished what you're writing.</span>
      <button
        onClick={onUpdate}
        className="flex-shrink-0 bg-gold text-navy text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-opacity-90 transition-colors"
      >
        Reload
      </button>
    </div>
  )
}

// Reloading throws away anything typed but not sent, so only reload when
// nothing is being written: no focused text field and every text box empty.
function safeToReload() {
  const el = document.activeElement
  if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return false
  for (const f of document.querySelectorAll('textarea, input:not([type]), input[type="text"], input[type="search"], input[type="url"], input[type="email"], [contenteditable="true"]')) {
    if ((f.value ?? f.textContent ?? '').trim()) return false
  }
  return true
}

const LOADED_AT = Date.now()
// Just opened (or in the background) with nothing typed: safe to switch now
function canUpdateNow() {
  return safeToReload() && (Date.now() - LOADED_AT < 15_000 || document.visibilityState === 'hidden')
}

function AppWithSWUpdater() {
  const [needsRefresh, setNeedsRefresh] = useState(false)

  const { updateServiceWorker } = useRegisterSW({
    // A new version is ready. Just opened and nothing typed: switch now,
    // before they start. Otherwise wait for the app to go to the background
    // with nothing unsent, and offer the Reload banner meanwhile.
    onNeedRefresh() {
      if (canUpdateNow()) {
        updateServiceWorker(true)
        return
      }
      setNeedsRefresh(true)
      const onHide = () => {
        if (document.visibilityState === 'hidden' && safeToReload()) {
          document.removeEventListener('visibilitychange', onHide)
          updateServiceWorker(true)
        }
      }
      document.addEventListener('visibilitychange', onHide)
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
