/**
 * sw-push.js — Push notification handler for Communio
 *
 * Loaded by the Workbox-generated service worker via importScripts.
 * Handles push events, notification clicks, and subscription rotation.
 *
 * iOS note: Web push works on iOS 16.4+ only when the PWA is added to the
 * home screen (Safari → Share → "Add to Home Screen"). In-browser Safari
 * tabs do NOT receive web push on iOS.
 */

// The app sends us the VAPID public key so we can re-subscribe on rotation.
// Stored here in SW scope so it survives the SW lifetime.
self.VAPID_PUBLIC_KEY = null

// ── Message handler ───────────────────────────────────────────────────────
// App sends { type: 'SET_VAPID_KEY', key: '...' } once on startup.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_VAPID_KEY') {
    self.VAPID_PUBLIC_KEY = event.data.key
  }
})

// ── Push received ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Communio', body: event.data.text() }
  }

  const {
    title = 'Communio',
    body = '',
    icon = '/icons/icon-192.svg',
    badge = '/icons/icon-72.svg',
    url = '/',
    tag,
    requireInteraction = false,
  } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag: tag || `communio-${Date.now()}`,
      requireInteraction,
      data: { url },
      vibrate: [200, 100, 200],
    })
  )
})

// ── Notification click ────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If the app is already open, focus it and navigate
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            client.navigate(targetUrl)
            return
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl)
        }
      })
  )
})

// ── Push subscription change ──────────────────────────────────────────────
// Browser rotated the push subscription (e.g. FCM key rotation).
// If we have the VAPID key, re-subscribe directly and notify clients.
// If not, ask the app to re-subscribe by posting a message.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      if (self.VAPID_PUBLIC_KEY) {
        try {
          // Convert base64url VAPID key to Uint8Array
          const padding = '='.repeat((4 - (self.VAPID_PUBLIC_KEY.length % 4)) % 4)
          const base64 = (self.VAPID_PUBLIC_KEY + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/')
          const rawData = atob(base64)
          const applicationServerKey = Uint8Array.from(
            [...rawData].map((c) => c.charCodeAt(0))
          )

          const newSubscription = await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          })

          // Notify all open clients so the app saves the new subscription
          const allClients = await self.clients.matchAll({ includeUncontrolled: true })
          allClients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: newSubscription.toJSON(),
            })
          })
        } catch (err) {
          console.error('[sw-push] pushsubscriptionchange re-subscribe failed:', err)
        }
      } else {
        // No VAPID key in SW scope — ask the app to handle re-subscription
        const allClients = await self.clients.matchAll({ includeUncontrolled: true })
        allClients.forEach((client) => {
          client.postMessage({ type: 'PUSH_RESUBSCRIBE_NEEDED' })
        })
      }
    })()
  )
})
