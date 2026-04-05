import { Link } from 'react-router-dom'
import { StarIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'

function formatFeastDay(feastDay) {
  if (!feastDay) return null
  try {
    const [month, day] = feastDay.split('-')
    const d = new Date(2000, parseInt(month, 10) - 1, parseInt(day, 10))
    return format(d, 'MMMM d')
  } catch {
    return feastDay
  }
}

function PatronPills({ patronOf }) {
  if (!patronOf?.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {patronOf.map((p) => (
        <span
          key={p}
          className="text-xs border border-gold text-gold rounded-full px-2 py-0.5"
        >
          {p}
        </span>
      ))}
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────
function SaintCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-28 bg-gray-100 rounded" />
        </div>
        <div className="w-6 h-6 bg-gray-200 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-5/6 bg-gray-100 rounded" />
        <div className="h-3 w-4/6 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

// ── Premium gate overlay ───────────────────────────────────
function PremiumGate({ t }) {
  return (
    <div className="relative mt-3">
      {/* Blurred preview */}
      <p
        className="text-sm text-gray-600 leading-relaxed select-none"
        style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}
      >
        The life of this saint reveals a remarkable journey of faith and devotion to God.
        Through years of prayer, sacrifice, and service, they became a beacon of hope for
        countless souls seeking the way to salvation and eternal life with Christ.
      </p>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-lg gap-2 py-3">
        <LockClosedIcon className="w-5 h-5 text-gold" />
        <p className="text-xs font-semibold text-navy text-center px-4">
          Full biography available with Premium
        </p>
        <Link
          to="/premium"
          className="bg-gold text-navy text-xs font-bold px-4 py-2 rounded-full hover:bg-gold/90 transition-colors"
        >
          {t('upgrade', { ns: 'premium' })}
        </Link>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────
export default function SaintCard({
  saint,
  variant = 'day',
  isPremium = false,
  isFavorite = false,
  onFavoriteToggle,
  loading = false,
}) {
  const { t } = useTranslation('faith')

  if (loading) return <SaintCardSkeleton />
  if (!saint) return null

  const feastFormatted = formatFeastDay(saint.feast_day)

  // ══ LIBRARY VARIANT ══════════════════════════════════════
  if (variant === 'library') {
    return (
      <Link
        to={`/saints/${saint.id}`}
        className="block bg-white rounded-xl border border-gray-100 shadow-sm p-3 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy text-sm leading-snug">{saint.name}</p>
            {feastFormatted && (
              <p className="text-xs text-gray-400 mt-0.5">{feastFormatted}</p>
            )}
            {saint.summary && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                {saint.summary}
              </p>
            )}
          </div>
          {isPremium && onFavoriteToggle && (
            <button
              onClick={(e) => { e.preventDefault(); onFavoriteToggle() }}
              className="flex-shrink-0 p-1"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite
                ? <StarSolid className="w-4 h-4 text-gold" />
                : <StarIcon className="w-4 h-4 text-gray-300 hover:text-gold transition-colors" />
              }
            </button>
          )}
        </div>
      </Link>
    )
  }

  // ══ DAY VARIANT ══════════════════════════════════════════
  // (used in FaithPage for "Saint of the Day")
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-1">
            {t('saint_title')}
          </p>
          <h3 className="text-lg font-bold text-navy leading-tight">{saint.name}</h3>
          {feastFormatted && (
            <p className="text-sm text-gray-400 mt-0.5">
              {t('saints_feast_day', { date: feastFormatted })}
            </p>
          )}
        </div>
        {isPremium && onFavoriteToggle && (
          <button
            onClick={onFavoriteToggle}
            className="p-1.5 flex-shrink-0"
            aria-label={isFavorite ? t('saint_favorite_remove') : t('saint_favorite_add')}
          >
            {isFavorite
              ? <StarSolid className="w-5 h-5 text-gold" />
              : <StarIcon className="w-5 h-5 text-gray-300 hover:text-gold transition-colors" />
            }
          </button>
        )}
      </div>

      {/* Short description — always shown */}
      {saint.summary && (
        <p className="text-sm text-gray-700 leading-relaxed mt-3">{saint.summary}</p>
      )}

      {/* Premium content */}
      {isPremium ? (
        <div className="mt-4">
          {saint.biography ? (
            <div className="space-y-3">
              {saint.biography.split('\n\n').map((para, i) => (
                <p key={i} className="text-sm text-gray-700 leading-relaxed">{para}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">{t('saints_no_biography')}</p>
          )}

          <PatronPills patronOf={saint.patron_of} />

          {saint.prayer && (
            <div className="mt-4 border-l-2 border-gold pl-4">
              <p className="text-xs font-bold text-gold uppercase tracking-wider mb-2">
                {t('saints_prayer', { name: saint.name })}
              </p>
              <p className="text-sm text-gray-700 italic leading-relaxed">{saint.prayer}</p>
            </div>
          )}

          <Link
            to={`/saints/${saint.id}`}
            className="inline-block mt-4 text-sm font-semibold text-navy hover:underline"
          >
            {t('saint_learn_more')} →
          </Link>
        </div>
      ) : (
        <PremiumGate t={t} />
      )}
    </div>
  )
}
