import { useTranslation } from 'react-i18next'

const FILTERS = [
  { key: 'all',    labelKey: 'feed.all' },
  { key: 'parish', labelKey: 'feed.my_parish' },
  { key: 'groups', labelKey: 'feed.my_groups' },
  { key: 'prayer', labelKey: 'feed.prayer_requests' },
  { key: 'events', labelKey: 'feed.events' },
]

/**
 * FeedFilters — horizontal scrollable filter tabs.
 *
 * Props:
 *   activeFilter: string
 *   onChange: (filter: string) => void
 *   counts: { prayer?: number } | null
 */
export default function FeedFilters({ activeFilter, onChange, counts = null }) {
  const { t } = useTranslation('feed')

  return (
    <div
      className="flex gap-2 overflow-x-auto py-2 px-4 -webkit-overflow-scrolling-touch"
      style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {FILTERS.map(({ key, labelKey }) => {
        const active = activeFilter === key
        const count = key === 'prayer' ? counts?.prayer : null

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={[
              'flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[36px] whitespace-nowrap',
              active
                ? 'bg-gold text-navy font-semibold'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-navy hover:text-navy',
            ].join(' ')}
          >
            {t(labelKey)}
            {count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-navy text-gold' : 'bg-gold text-navy'}`}>
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
