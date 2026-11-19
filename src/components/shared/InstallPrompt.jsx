import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useTranslation } from 'react-i18next'

const DISMISSED_KEY = 'pwa_install_dismissed'

// Store listings — set these once the apps are live and the banner sends
// phone visitors to the App Store / Google Play instead of "Add to Home Screen"
const IOS_STORE_URL = import.meta.env.VITE_IOS_APP_STORE_URL
const ANDROID_STORE_URL = import.meta.env.VITE_ANDROID_PLAY_STORE_URL

// Never cover sign-in / sign-up forms or legal pages with the banner
const QUIET_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/onboarding', '/check-email', '/terms', '/privacy', '/policy', '/join', '/delete-account']

export default function InstallPrompt() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [storeUrl, setStoreUrl] = useState(null)
  const [iosExpanded, setIosExpanded] = useState(false)

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone === true) return
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    const ua = navigator.userAgent
    const ios = /iphone|ipad|ipod/i.test(ua) && !window.MSStream
    const android = /android/i.test(ua)

    // Native apps available — point phones at the store
    if (ios && IOS_STORE_URL) { setStoreUrl(IOS_STORE_URL); setShow(true); return }
    if (android && ANDROID_STORE_URL) { setStoreUrl(ANDROID_STORE_URL); setShow(true); return }

    // iOS Safari — no beforeinstallprompt, show manual instructions
    const safari = /^((?!chrome|android).)*safari/i.test(ua)
    if (ios && safari) {
      setIsIOS(true)
      setShow(true)
      return
    }

    // Android/Chrome — capture the native install prompt
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      sessionStorage.setItem(DISMISSED_KEY, '1')
    }
    setShow(false)
    setDeferredPrompt(null)
  }

  if (!show || !user || QUIET_PATHS.some((p) => pathname.startsWith(p))) return null

  if (storeUrl) {
    return (
      <div className="fixed left-4 right-4 z-50 md:hidden" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="bg-navy rounded-2xl shadow-xl p-4 relative flex items-center gap-3">
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 text-white/50 hover:text-white p-1"
            aria-label={t('common:install.dismiss', 'Dismiss')}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
              <path d="M5.5 0h3v5.5h5.5v3H8.5v9.5h-3V8.5H0v-3h5.5z" fill="#1B2A4A"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">{t('common:install.get_the_infold_app', 'Get the inFold app')}</p>
            <p className="text-white/60 text-xs">{t('common:install.faster_with_notifications', 'Faster, with notifications')}</p>
          </div>
          <a
            href={storeUrl}
            onClick={dismiss}
            className="flex items-center gap-1.5 bg-gold text-navy text-xs font-bold px-3 py-2 mr-5 rounded-xl flex-shrink-0"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            {t('common:install.get', 'Get')}
          </a>
        </div>
      </div>
    )
  }

  // iOS: show manual instructions sheet
  if (isIOS) {
    return (
      <div className="fixed left-4 right-4 z-50 md:hidden" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="bg-navy rounded-2xl shadow-xl p-4 relative">
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 text-white/50 hover:text-white p-1"
            aria-label={t('common:install.dismiss', 'Dismiss')}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>

          {/* Compact until tapped, so it never hides the screen underneath */}
          <button
            onClick={() => setIosExpanded((v) => !v)}
            aria-expanded={iosExpanded}
            className={`flex items-center gap-3 w-full text-left pr-6 ${iosExpanded ? 'mb-4' : ''}`}
          >
            <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center flex-shrink-0">
              <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                <path d="M5.5 0h3v5.5h5.5v3H8.5v9.5h-3V8.5H0v-3h5.5z" fill="#1B2A4A"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">{t('common:install.add_to_home_screen', 'Add to Home Screen')}</p>
              <p className="text-white/60 text-xs">
                {iosExpanded ? t('common:install.install_infold_like_an_app', 'Install inFold like an app') : t('common:install.install_infold_like_an_app_tap', 'Install inFold like an app — tap to see how')}
              </p>
            </div>
          </button>

          {iosExpanded && <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
              <span className="w-5 h-5 rounded-full bg-gold text-navy text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-white text-xs font-semibold mb-0.5">
                  {t('common:install.ios1a', 'Tap')} <span className="bg-white/15 rounded px-1.5 py-0.5 font-black tracking-wide">···</span> {t('common:install.ios1b', 'in the top-right corner of Safari')}
                </p>
                <p className="text-white/50 text-xs">{t('common:install.that_s_the_three_dot_menu', "That's the three-dot menu at the top of your screen")}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
              <span className="w-5 h-5 rounded-full bg-gold text-navy text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-white text-xs font-semibold mb-0.5">
                  {t('common:install.ios1a', 'Tap')} <span className="font-black text-white">{t('common:install.share', 'Share')}</span> <span className="text-white/60">{t('common:install.share_hint', '(the box with an arrow pointing up ⎙)')}</span>
                </p>
                <p className="text-white/50 text-xs">{t('common:install.it_s_near_the_top_of', "It's near the top of the menu that appears")}</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
              <span className="w-5 h-5 rounded-full bg-gold text-navy text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-white text-xs font-semibold mb-0.5">
                  {t('common:install.scroll_tap', 'Scroll down and tap')} <span className="font-black text-gold">"{t('common:install.add_to_home_screen', 'Add to Home Screen')}"</span>
                </p>
                <p className="text-white/50 text-xs">{t('common:install.then_tap', 'Then tap')} <span className="font-semibold text-white">{t('common:install.add', 'Add')}</span> {t('common:install.to_confirm', 'in the top-right to confirm')}</p>
              </div>
            </div>
          </div>}
        </div>
      </div>
    )
  }

  // Android/Chrome: native install button
  return (
    <div className="fixed left-4 right-4 z-50 md:hidden" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="bg-navy rounded-2xl shadow-xl p-4 relative flex items-center gap-3">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-white/50 hover:text-white p-1"
          aria-label={t('common:install.dismiss', 'Dismiss')}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center flex-shrink-0">
          <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
            <path d="M5.5 0h3v5.5h5.5v3H8.5v9.5h-3V8.5H0v-3h5.5z" fill="#1B2A4A"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{t('common:install.add_to_home_screen', 'Add to Home Screen')}</p>
          <p className="text-white/60 text-xs">{t('common:install.get_the_full_app_experience', 'Get the full app experience')}</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 bg-gold text-navy text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          {t('common:install.install', 'Install')}
        </button>
      </div>
    </div>
  )
}
