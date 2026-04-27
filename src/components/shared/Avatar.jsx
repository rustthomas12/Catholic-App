import { useState } from 'react'
import { getInitials } from '../../utils/text'
import { getAvatarUrl } from '../../utils/storage'

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-20 h-20 text-2xl',
}

// Tier badge config: clergy always takes priority
const TIER_BADGE = {
  patron:     { bg: '#1B2A4A', title: 'Patron' },     // navy
  member:     { bg: '#C9A84C', title: 'Member' },     // gold
  supporter:  { bg: '#9CA3AF', title: 'Supporter' },  // gray-400
  benefactor: { bg: '#D97706', title: 'Benefactor' }, // amber-600
}

export default function Avatar({
  src,
  name = '',
  size = 'md',
  isVerifiedClergy = false,
  // donationTier: null | 'supporter' | 'member' | 'patron' | 'benefactor'
  donationTier = null,
  // Legacy props — still accepted for backward compatibility
  isPremium = false,
  isPatron = false,
  // parish-sponsored users show the same badge as 'member'
  isSupportedByParish = false,
  onClick,
}) {
  const [imgError, setImgError] = useState(false)
  const showFallback = !src || imgError
  const initials = getInitials(name)
  const sizeClass = sizeMap[size] ?? sizeMap.md

  const badgeSize = size === 'xs' || size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  // Resolve effective badge key:
  // 1. Clergy takes priority
  // 2. donationTier (new model)
  // 3. Parish-sponsored → show as 'member'
  // 4. Legacy isPatron / isPremium fallback
  const effectiveTier = donationTier
    || (isSupportedByParish ? 'member' : null)
    || (isPatron ? 'patron' : null)
    || (isPremium ? 'member' : null)

  const tierConfig = effectiveTier ? TIER_BADGE[effectiveTier] : null
  const showBadge = isVerifiedClergy || !!tierConfig

  return (
    <div
      className={`relative inline-flex flex-shrink-0 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center bg-navy font-semibold text-white select-none`}>
        {showFallback ? (
          <span>{initials}</span>
        ) : (
          <img
            src={getAvatarUrl(src)}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Badge overlay */}
      {showBadge && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${badgeSize} rounded-full flex items-center justify-center`}
          style={{ background: isVerifiedClergy ? '#C9A84C' : tierConfig.bg }}
          title={isVerifiedClergy ? 'Verified Clergy' : tierConfig?.title}
        >
          {isVerifiedClergy ? (
            <svg viewBox="0 0 10 14" className="w-2 h-2.5 fill-white">
              <path d="M5 0v4H1v2h4v8h2V6h4V4H6V0z" />
            </svg>
          ) : effectiveTier === 'patron' ? (
            <svg viewBox="0 0 10 10" className="w-2 h-2 fill-white">
              <path d="M5 0l1.2 3.6H10L7 5.8l1.2 3.6L5 7.2 1.8 9.4 3 5.8.9 3.6H3.8z" />
            </svg>
          ) : effectiveTier === 'benefactor' ? (
            <svg viewBox="0 0 10 14" className="w-2 h-2.5 fill-white">
              <path d="M5 0v4H1v2h4v8h2V6h4V4H6V0z" />
            </svg>
          ) : effectiveTier === 'member' ? (
            <svg viewBox="0 0 10 10" className="w-2 h-2 fill-white">
              <path d="M5 0l1.2 3.6H10L7 5.8l1.2 3.6L5 7.2 1.8 9.4 3 5.8.9 3.6H3.8z" />
            </svg>
          ) : (
            // supporter — simple circle dot
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          )}
        </span>
      )}
    </div>
  )
}
