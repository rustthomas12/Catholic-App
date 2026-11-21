import { Link } from 'react-router-dom'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import { EventCard } from '../parish/ParishEvents'
import { useMyUpcomingEvents, sourceOf } from '../../hooks/useMyUpcomingEvents'

// Upcoming events from the parishes you follow, your groups and your
// organizations — the Home feed's "Events" filter.
// The Home feed's "Events" filter
export default function MyEvents() {
  const { events, error } = useMyUpcomingEvents()

  if (error) {
    return <p className="text-gray-500 text-sm text-center py-8">Could not load events.</p>
  }

  if (!events) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {[1, 2].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />)}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <CalendarDaysIcon className="w-12 h-12 text-gray-200 mb-3" />
        <p className="font-semibold text-navy mb-1">No upcoming events</p>
        <p className="text-gray-500 text-sm mb-4">Events from your parishes, groups and organizations show up here.</p>
        <Link to="/directory" className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] inline-flex items-center">
          Find a parish
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 pt-2 pb-8 space-y-3">
      {events.map(e => (
        <EventCard key={e.id} event={e} source={sourceOf(e)} />
      ))}
    </div>
  )
}
