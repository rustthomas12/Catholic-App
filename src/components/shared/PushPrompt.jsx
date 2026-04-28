import { useState, useEffect } from 'react'
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

  useEffect(() => {
    // Only show for logged-in users who can receive push and haven't subscribed
    if (!isSupported || permission !== 'default' || isSubscribed || !user) return

    try {
      const count = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10) + 1
      localStorage.setItem(SESSION_COUNT_KEY, count.toString())

      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (count >= MIN_SESSIONS && !dismissed) {
        setShow(true)
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — skip prompt
    }
  }, [isSupported, permission, isSubscribed, user])

  if (!show) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true')
    } catch { /* ignore */ }
    setShow(false)
  }

  async function handleEnable() {
    await subscribe()
    setShow(false)
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-80 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="text-2xl select-none">🔔</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy text-sm mb-0.5">
            Stay connected with your parish
          </p>
          <p className="text-gray-500 text-xs leading-snug mb-3">
            Get notified about announcements, prayer requests, and group activity — even when the app isn't open.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="bg-navy text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-navy/90 disabled:opacity-60 transition-colors"
            >
              {isLoading ? 'Enabling…' : 'Enable'}
            </button>
            <button
              onClick={dismiss}
              className="text-gray-400 text-xs px-2 py-2 hover:text-gray-600 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
