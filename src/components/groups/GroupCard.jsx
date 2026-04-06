import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BuildingLibraryIcon,
  GlobeAmericasIcon,
  UserIcon,
  SparklesIcon,
  HomeIcon,
  AcademicCapIcon,
  StarIcon,
  HeartIcon,
  UserGroupIcon,
  LockClosedIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

export const CATEGORY_ICONS = {
  parish: BuildingLibraryIcon,
  diocese: GlobeAmericasIcon,
  mens: UserIcon,
  womens: UserIcon,
  young_adults: SparklesIcon,
  families: HomeIcon,
  rcia: AcademicCapIcon,
  interest: StarIcon,
  vocation: HeartIcon,
  other: UserGroupIcon,
}

export function GroupAvatar({ group, size = 40 }) {
  const Icon = CATEGORY_ICONS[group.category] ?? UserGroupIcon
  if (group.avatar_url) {
    return (
      <img
        src={group.avatar_url}
        alt={group.name}
        className="rounded-xl object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="bg-navy rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Icon className="text-gold" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  )
}

export default function GroupCard({
  group,
  isMember = false,
  isAdmin = false,
  onJoin,
  onLeave,
  onRequest,
  hasRequested = false,
  compact = false,
}) {
  const { t } = useTranslation('groups')
  const navigate = useNavigate()

  function handleCardClick() {
    navigate(`/group/${group.id}`)
  }

  function handleJoinClick(e) {
    e.stopPropagation()
    if (isMember) onLeave?.()
    else if (group.is_private) onRequest?.()
    else onJoin?.()
  }

  const memberCount = group.member_count ?? 0
  const memberLabel = memberCount === 1
    ? t('member_count_one', { count: 1 })
    : t('member_count_other', { count: memberCount })

  // ── Compact variant ─────────────────────────────────────
  if (compact) {
    return (
      <div
        onClick={handleCardClick}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 w-40 flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow"
      >
        <GroupAvatar group={group} size={36} />
        <p className="text-xs font-semibold text-navy leading-tight mt-2 truncate">{group.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{memberLabel}</p>
        {isMember && (
          <span className="text-xs text-gold font-semibold">{t('joined')}</span>
        )}
      </div>
    )
  }

  // ── Standard variant ────────────────────────────────────
  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <GroupAvatar group={group} size={48} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy text-base leading-snug truncate">{group.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
                  {t(`category_${group.category}`) ?? group.category}
                </span>
                {group.is_private && (
                  <span className="flex items-center gap-0.5 text-xs text-gray-400">
                    <LockClosedIcon className="w-3 h-3" />
                    {t('private')}
                  </span>
                )}
              </div>
              {group.parishes && (
                <p className="text-xs text-gray-400 mt-0.5">at {group.parishes.name}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">{memberLabel}</p>
            </div>

            {/* Action button */}
            <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
              {isMember ? (
                <button
                  onClick={handleJoinClick}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  {t('joined')}
                </button>
              ) : hasRequested ? (
                <button
                  disabled
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  {t('request_sent')}
                </button>
              ) : group.is_private ? (
                <button
                  onClick={handleJoinClick}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-navy text-navy hover:bg-lightbg transition-colors"
                >
                  {t('request')}
                </button>
              ) : (
                <button
                  onClick={handleJoinClick}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold text-navy hover:bg-gold/90 transition-colors"
                >
                  {t('join')}
                </button>
              )}
            </div>
          </div>

          {group.description && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{group.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
