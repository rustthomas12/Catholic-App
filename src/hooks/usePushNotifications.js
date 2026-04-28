import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// Convert base64url VAPID public key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function saveSubscription(subscriptionJSON, userId) {
  const { endpoint, keys } = subscriptionJSON
  await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' }
    )
}

async function deleteSubscription(endpoint, userId) {
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
}

export function usePushNotifications(userId) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  // Send VAPID key to SW so it can re-subscribe on pushsubscriptionchange
  useEffect(() => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage({
          type: 'SET_VAPID_KEY',
          key: VAPID_PUBLIC_KEY,
        })
      }
    })
  }, [isSupported])

  // On mount, check if this browser/device is already subscribed
  useEffect(() => {
    if (!isSupported || !userId) return
    navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription()
      setIsSubscribed(!!existing)
    })
  }, [isSupported, userId])

  // Listen for messages from the SW (subscription rotation / re-sub needed)
  useEffect(() => {
    if (!isSupported || !userId) return

    const handler = async (event) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        await saveSubscription(event.data.subscription, userId)
      }
      if (event.data?.type === 'PUSH_RESUBSCRIBE_NEEDED') {
        // SW lost the VAPID key — trigger a full re-subscribe from the app
        const registration = await navigator.serviceWorker.ready
        try {
          const newSub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          })
          await saveSubscription(newSub.toJSON(), userId)
          setIsSubscribed(true)
        } catch (err) {
          console.error('[usePushNotifications] re-subscribe failed:', err)
        }
      }
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [isSupported, userId])

  const subscribe = useCallback(async () => {
    if (!isSupported || !userId || !VAPID_PUBLIC_KEY) return
    setIsLoading(true)
    setError(null)

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setError('Permission denied. Enable notifications in your browser settings.')
        return
      }

      const registration = await navigator.serviceWorker.ready

      // Unsubscribe existing first for a clean state
      const existing = await registration.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      await saveSubscription(subscription.toJSON(), userId)

      // Also send key to SW now that we have a fresh subscription
      if (registration.active) {
        registration.active.postMessage({ type: 'SET_VAPID_KEY', key: VAPID_PUBLIC_KEY })
      }

      setIsSubscribed(true)
    } catch (err) {
      console.error('[usePushNotifications] subscribe error:', err)
      setError('Failed to enable notifications. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, userId])

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !userId) return
    setIsLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await deleteSubscription(subscription.endpoint, userId)
        await subscription.unsubscribe()
      }
      setIsSubscribed(false)
    } catch (err) {
      console.error('[usePushNotifications] unsubscribe error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, userId])

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  }
}
