import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { supabaseAuth } from '../../lib/supabase'
import { APP_ORIGIN, isAndroid, closeExternal, deepLinkToPath, openExternal, parseAuthTokens } from '../../lib/platform'
import { toast } from './Toast'

// ── Native app glue (iOS / Android only) ──────────────────
// Rendered only when running inside Capacitor. Handles what the browser
// used to do for us on the web:
//  • links into the app (universal / app links and infold://), including
//    Supabase email-confirmation and password-reset links
//  • results handed back from the in-app browser (Stripe, Facebook OAuth)
//  • taps on push notifications (the service worker did this on the web)
//  • the Android hardware back button

function stripHash(path) {
  const i = path.indexOf('#')
  return i === -1 ? path : path.slice(0, i)
}

export default function NativeBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    async function handleUrl(url) {
      const path = deepLinkToPath(url)
      if (!path) return

      // Coming back from the in-app browser sheet — close it
      await closeExternal()

      // Facebook OAuth result → same message the web popup posts
      if (path.startsWith('/oauth-complete')) {
        const params = new URLSearchParams(path.split('?')[1] || '')
        window.postMessage({
          type: 'INTEGRATION_RESULT',
          platform: params.get('platform'),
          result: params.get('result'),
        }, '*')
        return
      }

      // Supabase auth links (signup confirmation, password recovery)
      const tokens = parseAuthTokens(url)
      if (tokens) {
        const { error } = await supabaseAuth.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        })
        if (error) {
          toast.error('That link has expired. Please request a new one.')
          navigate('/login', { replace: true })
          return
        }
        navigate(tokens.type === 'recovery' ? '/reset-password' : stripHash(path), { replace: true })
        return
      }
      const code = new URLSearchParams(path.split('?')[1]?.split('#')[0] || '').get('code')
      if (code && (path.startsWith('/onboarding') || path.startsWith('/reset-password'))) {
        await supabaseAuth.auth.exchangeCodeForSession(code).catch(() => {})
      }

      navigate(path)
    }

    // Cold start from a link
    CapApp.getLaunchUrl().then((res) => { if (res?.url) handleUrl(res.url) })

    const subs = [
      CapApp.addListener('appUrlOpen', ({ url }) => { handleUrl(url) }),

      // Push notification tapped (app in background or closed)
      FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
        const url = notification?.data?.url
        navigate(typeof url === 'string' && url.startsWith('/') ? url : '/')
      }),
    ]

    if (isAndroid) {
      // Android shows nothing for pushes that arrive while the app is open
      // (iOS shows a banner via presentationOptions) — surface them in-app.
      subs.push(FirebaseMessaging.addListener('notificationReceived', ({ notification }) => {
        const text = [notification?.title, notification?.body].filter(Boolean).join(' — ')
        if (text) toast.info(text)
      }))

      subs.push(CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) window.history.back()
        else CapApp.exitApp()
      }))
    }

    // Links with target="_blank" open a new tab on the web. A WebView has no
    // tabs, so show them in the in-app browser sheet instead — this keeps the
    // current screen (e.g. a half-filled signup form) intact.
    function onClick(e) {
      const a = e.target.closest?.('a[href][target="_blank"]')
      if (!a || e.defaultPrevented) return
      const href = a.getAttribute('href')
      let url
      if (href.startsWith('/')) url = `${APP_ORIGIN}${href}`
      else if (/^https?:\/\//i.test(href)) url = href
      else return // mailto:, tel:, etc. are handled by the OS
      e.preventDefault()
      openExternal(url)
    }
    document.addEventListener('click', onClick)

    return () => {
      subs.forEach((s) => s.then((h) => h.remove()))
      document.removeEventListener('click', onClick)
    }
  }, [navigate])

  return null
}
