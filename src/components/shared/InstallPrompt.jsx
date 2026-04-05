import { useState, useEffect } from 'react'
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

const DISMISSED_KEY = 'pwa_install_dismissed'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [iosDismissed, setIosDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone === true) return
    if (localStorage.getItem(DISMISSED_KEY)) return

    // iOS Safari — no beforeinstallprompt, show manual instructions
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (ios && safari) {
      setIsIOS(true)
      // Show after a short delay so the page settles
      setTimeout(() => setShow(true), 3000)
      return
    }

    // Android/Chrome — capture the native install prompt
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShow(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, '1')
    }
    setShow(false)
    setDeferredPrompt(null)
  }

  if (!show) return null

  // iOS: show manual instructions sheet
  if (isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
        <div className="bg-navy rounded-2xl shadow-xl p-4 relative">
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 text-white/50 hover:text-white p-1"
            aria-label="Dismiss"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center flex-shrink-0">
              <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                <path d="M5.5 0h3v5.5h5.5v3H8.5v9.5h-3V8.5H0v-3h5.5z" fill="#1B2A4A"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Add to Home Screen</p>
              <p className="text-white/60 text-xs">Get the full app experience</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <p className="text-white/80 text-xs">
                Tap the <span className="font-semibold text-white">Share</span> button{' '}
                <span className="inline-block bg-white/10 rounded px-1 text-xs">⎙</span>{' '}
                at the bottom of your browser
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <p className="text-white/80 text-xs">
                Scroll down and tap{' '}
                <span className="font-semibold text-white">"Add to Home Screen"</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <p className="text-white/80 text-xs">Tap <span className="font-semibold text-white">Add</span> to confirm</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Android/Chrome: native install button
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
      <div className="bg-navy rounded-2xl shadow-xl p-4 relative flex items-center gap-3">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-white/50 hover:text-white p-1"
          aria-label="Dismiss"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center flex-shrink-0">
          <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
            <path d="M5.5 0h3v5.5h5.5v3H8.5v9.5h-3V8.5H0v-3h5.5z" fill="#1B2A4A"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Add to Home Screen</p>
          <p className="text-white/60 text-xs">Get the full app experience</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 bg-gold text-navy text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          Install
        </button>
      </div>
    </div>
  )
}
