import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import App from './App.jsx'

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppWithSWUpdater />
  </StrictMode>,
)
