import { useState, useEffect } from 'react'
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { useAuth } from '../../hooks/useAuth.jsx'

const SESSION_COUNT_KEY = 'communio-session-count'
const DISMISSED_KEY = 'communio-push-dismissed'
const MIN_SESSIONS = 3

export default function PushPrompt() {
  const { user } = useAuth()
  const { isSupported, permission, isSubscribed, subscribe, isLoading } =
    usePushNotifications(user?.id)
  const [show, setShow] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isSupported || permission !== 'default' || isSubscribed || !user) return
    try {
      const count = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10) + 1
      localStorage.setItem(SESSION_COUNT_KEY, count.toString())
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (count >= MIN_SESSIONS && !dismissed) setShow(true)
    } catch { /* localStorage unavailable */ }
  }, [isSupported, permission, isSubscribed, user])

  if (!show) return null

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, 'true') } catch { /* ignore */ }
    setShow(false)
  }

  async function handleEnable() {
    await subscribe()
    setSuccess(true)
    setTimeout(() => setShow(false), 1800)
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
            <p className="text-gray-400 text-xs">You'll hear about parish updates and group activity.</p>
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
                className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
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
