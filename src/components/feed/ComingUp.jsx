import { Link } from 'react-router-dom'
import { format, isToday, isTomorrow } from 'date-fns'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useMyUpcomingEvents, sourceOf } from '../../hooks/useMyUpcomingEvents'

// "Coming up": the next few events from your parishes, groups and
// organizations, at the top of the main feed. Events used to appear only
// under the Events filter, so people thought they were missing.
export default function ComingUp({ onSeeAll }) {
  const { t } = useTranslation('feed')
  const { events } = useMyUpcomingEvents({ limit: 3, withinDays: 14 })
  if (!events?.length) return null

  const when = (d) => isToday(d) ? t('coming_up.today', 'Today')
    : isTomorrow(d) ? t('coming_up.tomorrow', 'Tomorrow')
    : format(d, 'EEE, MMM d')

  return (
    <section className="bg-white border-b border-gray-100 md:rounded-xl md:border md:shadow-sm md:mb-2 px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <CalendarDaysIcon className="w-4 h-4" /> {t('coming_up.title', 'Coming up')}
        </h2>
        {onSeeAll && (
          <button type="button" onClick={onSeeAll} className="text-xs font-semibold text-navy hover:underline min-h-[32px] px-1">
            {t('coming_up.see_all', 'See all')}
          </button>
        )}
      </div>
      <ul className="divide-y divide-gray-50">
        {events.map(e => {
          const start = new Date(e.start_time)
          const src = sourceOf(e)
          return (
            <li key={e.id}>
              <Link to={`/event/${e.id}`} className="flex items-center gap-3 py-2 min-h-[48px] hover:bg-lightbg -mx-2 px-2 rounded-lg">
                <div className="w-11 flex-shrink-0 text-center rounded-lg bg-navy py-1">
                  <p className="text-[10px] font-bold uppercase text-gold leading-tight">{format(start, 'MMM')}</p>
                  <p className="text-sm font-bold text-white leading-tight">{format(start, 'd')}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{e.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {when(start)} · {format(start, 'h:mm a')}{src ? ` · ${src.label}` : ''}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
