import { Link } from 'react-router-dom'
import {
  BuildingLibraryIcon,
  MapPinIcon,
  UsersIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'
import i18n from '../../utils/i18n'
import { isEastern, churchLabel } from '../../data/churches'

/**
 * ParishCard — two variants:
 *   'standard' (default) — full card with follow button
 *   'compact'            — slim row, used in sidebars / search results
 */
export default function ParishCard({
  parish,
  variant = 'standard',
  isFollowing = false,
  isMyParish = false,
  onFollow,
  followLoading = false,
}) {
  const { t } = useTranslation('parish')
  if (variant === 'compact') {
    return (
      <Link
        to={`/parish/${parish.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-lightbg transition-colors group"
      >
        <div className="w-9 h-9 bg-lightbg group-hover:bg-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors border border-gray-100">
          <BuildingLibraryIcon className="w-4.5 h-4.5 text-navy" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy truncate leading-tight">
            {parish.name}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {parish.city}, {parish.state}
            {isEastern(parish.church) && <span className="ml-1.5">· {churchLabel(t, parish.church)}</span>}
            {typeof parish.distance === 'number' && (
              <span className="ml-1.5 text-gray-500">
                · {formatDistance(parish.distance)}
              </span>
            )}
          </p>
        </div>
        {parish.is_official && (
          <CheckBadgeIcon className="w-4 h-4 text-gold flex-shrink-0" />
        )}
      </Link>
    )
  }

  // Standard variant
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Navy header */}
      <div className="bg-navy px-4 py-3.5 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-white font-bold text-sm leading-snug">
              {parish.name}
            </h3>
            {parish.is_official && (
              <CheckBadgeIcon className="w-4 h-4 text-gold flex-shrink-0" title={t('parish.official_badge')} />
            )}
          </div>
          <p className="text-gray-500 text-xs mt-0.5">
            {parish.city}, {parish.state}
            {parish.diocese ? ` · ${parish.diocese}` : ''}
          </p>
          {isEastern(parish.church) && (
            <span className="inline-block mt-1.5 text-[11px] font-semibold text-navy bg-gold px-2 py-0.5 rounded-full">
              {churchLabel(t, parish.church)}
            </span>
          )}
        </div>

        {onFollow && (
          <button
            onClick={(e) => {
              e.preventDefault()
              onFollow()
            }}
            disabled={followLoading}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 min-w-[80px] transition-colors disabled:opacity-60 ${
              isMyParish
                ? 'bg-gold text-navy cursor-default'
                : isFollowing
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-white text-navy hover:bg-gray-50'
            }`}
          >
            {isMyParish ? t('parish.my_parish') : isFollowing ? t('parish.following') : t('parish.follow_short', 'Follow')}
          </button>
        )}
      </div>

      {/* Body */}
      <Link to={`/parish/${parish.id}`} className="block p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {typeof parish.distance === 'number' && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MapPinIcon className="w-3.5 h-3.5 text-gray-500" />
              {formatDistance(parish.distance)}
            </span>
          )}
          {typeof parish.follower_count === 'number' && parish.follower_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <UsersIcon className="w-3.5 h-3.5 text-gray-500" />
              {t('parish.here_count', '{{formattedCount}} here', { formattedCount: parish.follower_count.toLocaleString() })}
            </span>
          )}
          {isMyParish && (
            <span className="flex items-center gap-1 text-xs text-gold font-semibold">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              {t('parish.your_parish', 'Your parish')}
            </span>
          )}
        </div>

        <p className="text-navy text-xs font-semibold mt-3 hover:underline">
          {t('parish.view_parish')}
        </p>
      </Link>
    </div>
  )
}

function formatDistance(miles) {
  const t = i18n.getFixedT(null, 'parish')
  if (miles < 0.1) return t('parish.dist_here', 'Here')
  if (miles < 1) return t('parish.dist_ft', '{{n}} ft away', { n: (miles * 5280).toFixed(0) })
  return t('parish.dist_mi', '{{n}} mi away', { n: miles.toFixed(1) })
}
