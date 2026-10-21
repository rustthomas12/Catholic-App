import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NETWORK_EVENT } from '../../lib/supabase'

/**
 * Thin banner shown while the server can't be reached (offline, or the
 * connection drops) — otherwise empty lists would read as "nothing here".
 */
export default function ConnectionBanner() {
  const { t } = useTranslation('common')
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)

  useEffect(() => {
    const onNet = (e) => setOffline(!e.detail.online)
    const goOff = () => setOffline(true)
    const goOn = () => setOffline(false)
    window.addEventListener(NETWORK_EVENT, onNet)
    window.addEventListener('offline', goOff)
    window.addEventListener('online', goOn)
    return () => {
      window.removeEventListener(NETWORK_EVENT, onNet)
      window.removeEventListener('offline', goOff)
      window.removeEventListener('online', goOn)
    }
  }, [])

  if (!offline) return null
  return (
    <div role="status" aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-white text-xs font-semibold text-center px-4 py-1.5"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)' }}>
      {t('status.offline')}
    </div>
  )
}
