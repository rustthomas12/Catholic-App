import { useState, useEffect } from 'react'
import { MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline'

const DISMISSED_KEY = 'communio-directory-banner-dismissed'

export default function DirectoryDiscoveryBanner({ followedCount }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true')
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  if (dismissed || followedCount >= 3) return null

  return (
    <div className="relative bg-cream border border-gold/40 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
        <MapPinIcon className="w-4 h-4 text-gold" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-navy leading-snug">
          Stay connected to Catholic life near you
        </p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          We recommend following several parishes close to you — not just
          your home parish. When a parish nearby hosts a BBQ, a talk, or a
          special Mass, you'll be the first to know.
        </p>
        {followedCount === 0 && (
          <p className="text-xs text-gold font-medium mt-1.5">
            You're not following any parishes yet. Search below to get started.
          </p>
        )}
        {followedCount === 1 && (
          <p className="text-xs text-gold font-medium mt-1.5">
            You're following 1 parish. Try following 2–3 more nearby.
          </p>
        )}
        {followedCount === 2 && (
          <p className="text-xs text-gold font-medium mt-1.5">
            You're following 2 parishes. One more and you'll see a full
            picture of local Catholic life.
          </p>
        )}
      </div>

      <button
        onClick={dismiss}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
        aria-label="Dismiss this suggestion"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
