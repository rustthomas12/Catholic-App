import { useState, useEffect } from 'react'
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { useAuth } from '../../hooks/useAuth.jsx'

const SESSION_COUNT_KEY = 'infold-session-count'
const DISMISSED_KEY = 'infold-push-dismissed'
const SESSION_COUNTED_KEY = 'infold-session-counted'
const MIN_SESSIONS = 3

export default function PushPrompt() {
  const { user } = useAuth()
  const { isSupported, permission, isSubscribed, subscribe, isLoading } =
    usePushNotifications(user?.id)
  const [ready, setReady] = useState(false)   // waited out the permission check
  const [hidden, setHidden] = useState(false) // dismissed or finished here
  const [success, setSuccess] = useState(false)

  // Only while notifications are still undecided. On the phone the
  // permission is read asynchronously and starts as 'default', so the banner
  // used to appear on every launch and stay up even after the check came
  // back 'granted'. Derived on every render, so it disappears the moment
  // notifications turn out to be on.
  const eligible = isSupported && permission === 'default' && !isSubscribed && !!user

  useEffect(() => {
    if (!eligible) return
    let timer
    try {
      // Count each app session once. This effect re-runs as the push state
      // loads, and it used to add a "session" every time — so the prompt
      // could appear on someone's first visit.
      let count = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10)
      if (!sessionStorage.getItem(SESSION_COUNTED_KEY)) {
        sessionStorage.setItem(SESSION_COUNTED_KEY, '1')
        count += 1
        localStorage.setItem(SESSION_COUNT_KEY, count.toString())
      }
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      // Give the permission check a moment to finish before showing
      if (count >= MIN_SESSIONS && !dismissed) timer = setTimeout(() => setReady(true), 1500)
    } catch { /* storage unavailable */ }
    return () => clearTimeout(timer)
  }, [eligible])

  const show = !hidden && ((eligible && ready) || success)

  if (!show) return null

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, 'true') } catch { /* ignore */ }
    setHidden(true)
  }

  async function handleEnable() {
    const ok = await subscribe()
    if (!ok) {
      // Declined, or it failed: don't claim it worked, and don't ask again
      dismiss()
      return
    }
    // Turned on from the banner: never offer it again on this device
    try { localStorage.setItem(DISMISSED_KEY, 'true') } catch { /* ignore */ }
    setSuccess(true)
    setTimeout(() => setHidden(true), 1800)
  }

  return (
    <div
      className="fixed left-4 right-4 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
    >
      {success ? (
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-lg">✓</span>
          </div>
          <div>
            <p className="font-semibold text-navy text-sm">Notifications enabled</p>
            <p className="text-gray-500 text-xs">You'll hear about parish updates and group activity.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-navy/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <BellIcon className="w-5 h-5 text-navy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy text-sm mb-0.5">Never miss a parish announcement</p>
            <p className="text-gray-500 text-xs leading-relaxed mb-3">
              Get notified about Mass updates, group activity, and prayer requests — even when the app is closed.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="flex-1 bg-navy text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-navy/90 disabled:opacity-60 transition-colors min-h-[44px]"
              >
                {isLoading ? 'Enabling…' : 'Turn on notifications'}
              </button>
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
