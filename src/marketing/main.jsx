// Entry for the marketing site (marketing.html, served on getinfold.app).
// Separate from the app so visitors download only this small site.
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import MarketingRouter from './MarketingRouter'

// Older visits to getinfold.app ran the full app, which installed its
// offline service worker here and kept serving a stale copy of this site.
// The marketing site doesn't need one: remove it.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {})
  if (window.caches) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
}

const app = (
  <StrictMode>
    <BrowserRouter>
      <MarketingRouter />
    </BrowserRouter>
  </StrictMode>
)

// Pages are pre-built at deploy (data-path names the page in the HTML).
// Hydrate when it matches this address; otherwise draw from scratch.
const root = document.getElementById('root')
const path = window.location.pathname.replace(/\/+$/, '') || '/'
if (root.firstElementChild && root.dataset.path === path) {
  hydrateRoot(root, app)
} else {
  root.textContent = ''
  createRoot(root).render(app)
}
