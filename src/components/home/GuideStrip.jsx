import { useState } from 'react'
import { Link } from 'react-router-dom'
import { XMarkIcon, MapIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useAdminAccess } from '../../hooks/useAdminAccess'
import { useTranslation } from 'react-i18next'

// One slim line under the Today band pointing new people (and anyone who
// runs a parish or organization) to "How inFold works". Gone for good once
// dismissed or opened; it stays out of the way of the feed.

const NEW_FOR_DAYS = 30
const storageKey = (uid) => `infold-guide-seen:${uid}`

export default function GuideStrip() {
  const { t } = useTranslation('common')
  const { user, profile } = useAuth()
  const { parishAdminRecords, orgAdminRecords, loading } = useAdminAccess()
  const [hidden, setHidden] = useState(() => {
    try { return !user || localStorage.getItem(storageKey(user.id)) === '1' } catch { return false }
  })

  // Read the clock once, not on every render
  const [now] = useState(() => Date.now())
  const leads = parishAdminRecords.length > 0 || orgAdminRecords.length > 0
  const created = profile?.created_at ? new Date(profile.created_at) : null
  const isNew = created && now - created.getTime() < NEW_FOR_DAYS * 86400000
  if (hidden || loading || !user || !(leads || isNew)) return null

  const dismiss = () => {
    try { localStorage.setItem(storageKey(user.id), '1') } catch { /* private mode */ }
    setHidden(true)
  }

  return (
    <div className="mx-3 mt-2.5 flex items-center gap-2 rounded-xl bg-gold/10 border border-gold/25 pl-3 pr-1 min-h-[44px]">
      <MapIcon className="w-4 h-4 text-gold-deep flex-shrink-0" aria-hidden="true" />
      <Link to="/guide" onClick={dismiss} className="flex-1 min-w-0 py-2 text-[13px] text-navy truncate">
        <span className="font-semibold">
          {leads ? t('guide.strip_admin', 'Your quick guide to running it all') : t('guide.strip_new', 'New here?')}
        </span>{' '}
        <span className="text-navy/70">{leads ? '→' : t('guide.strip_cta', 'See where everything is →')}</span>
      </Link>
      <button type="button" onClick={dismiss} aria-label={t('guide.strip_dismiss', 'Dismiss')}
        className="tap-target p-2 text-navy/50 hover:text-navy flex-shrink-0">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
