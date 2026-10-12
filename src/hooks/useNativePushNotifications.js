import { useState, useEffect, useCallback } from 'react'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { supabase } from '../lib/supabase'
import { platform } from '../lib/platform'

// Native (iOS / Android) counterpart of the web-push hook. Returns the same
// shape so PushPrompt, NotificationSettingsPage, etc. work unchanged.
// Tokens are Firebase Cloud Messaging tokens (FCM relays to APNs on iOS).

// Set when the user turns notifications off in-app, so the mount-time
// auto-recovery below doesn't silently re-register them.
const DISABLED_KEY = 'communio-native-push-disabled'

function mapPermission(receive) {
  if (receive === 'granted') return 'granted'
  if (receive === 'denied') return 'denied'
  return 'default' // 'prompt' | 'prompt-with-rationale'
}

async function saveToken(token) {
  const { error } = await supabase.rpc('claim_native_push_token', {
    p_token: token,
    p_platform: platform,
  })
  if (error) throw new Error(`Failed to save push token: ${error.message}`)
}

async function deleteToken(token, userId) {
  await supabase
    .from('native_push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token)
}

function isDisabledLocally() {
  try { return localStorage.getItem(DISABLED_KEY) === 'true' } catch { return false }
}

function setDisabledLocally(disabled) {
  try {
    if (disabled) localStorage.setItem(DISABLED_KEY, 'true')
    else localStorage.removeItem(DISABLED_KEY)
  } catch { /* ignore */ }
}

export function useNativePushNotifications(userId) {
  const [permission, setPermission] = useState('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const isSupported = true

  // On mount: read permission and, if already granted, re-register the
  // token in case the DB row was cleaned up (mirrors the web hook's
  // auto-recovery of push subscriptions).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { receive } = await FirebaseMessaging.checkPermissions()
        if (cancelled) return
        const perm = mapPermission(receive)
        setPermission(perm)
        if (perm !== 'granted' || !userId || isDisabledLocally()) {
          setIsSubscribed(false)
          return
        }
        const { token } = await FirebaseMessaging.getToken()
        if (cancelled) return
        if (token) {
          setIsSubscribed(true)
          saveToken(token).catch(() => {})
        }
      } catch (err) {
        console.error('[useNativePushNotifications] init error:', err)
      }
    })()
    return () => { cancelled = true }
  }, [userId])

  // FCM rotates tokens occasionally — keep the DB in sync
  useEffect(() => {
    if (!userId) return
    const handle = FirebaseMessaging.addListener('tokenReceived', ({ token }) => {
      if (token && !isDisabledLocally()) saveToken(token).catch(() => {})
    })
    return () => { handle.then((h) => h.remove()) }
  }, [userId])

  const subscribe = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)

    try {
      const { receive } = await FirebaseMessaging.requestPermissions()
      const perm = mapPermission(receive)
      setPermission(perm)

      if (perm !== 'granted') {
        setError('Permission denied. Enable notifications for Communio in your device settings.')
        return
      }

      const { token } = await FirebaseMessaging.getToken()
      if (!token) throw new Error('No push token returned')
      await saveToken(token)
      setDisabledLocally(false)
      setIsSubscribed(true)
    } catch (err) {
      console.error('[useNativePushNotifications] subscribe error:', err)
      setError('Failed to enable notifications. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const unsubscribe = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)

    try {
      const { token } = await FirebaseMessaging.getToken().catch(() => ({ token: null }))
      if (token) await deleteToken(token, userId)
      await FirebaseMessaging.deleteToken().catch(() => {})
      setDisabledLocally(true)
      setIsSubscribed(false)
    } catch (err) {
      console.error('[useNativePushNotifications] unsubscribe error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

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
