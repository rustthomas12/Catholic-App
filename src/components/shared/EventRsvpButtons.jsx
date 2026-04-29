import { useRsvp } from '../../hooks/useRsvp'
import { useAuth } from '../../hooks/useAuth.jsx'

const BUTTONS = [
  { value: 'yes',   label: 'Going',    activeClass: 'bg-green-600 text-white border-green-600' },
  { value: 'maybe', label: 'Maybe',    activeClass: 'bg-yellow-500 text-white border-yellow-500' },
  { value: 'no',    label: "Can't go", activeClass: 'bg-gray-400 text-white border-gray-400' },
]

export default function EventRsvpButtons({ eventId, showCount = true }) {
  const { user } = useAuth()
  const { myRsvp, rsvpCount, loading, respond } = useRsvp(eventId)

  if (!user || !eventId) return null

  return (
    <div className="flex items-center gap-2 mt-3 flex-wrap">
      {BUTTONS.map(btn => (
        <button
          key={btn.value}
          onClick={() => respond(btn.value)}
          disabled={loading}
          className={`
            text-xs font-medium px-3 py-1.5 rounded-full border transition-colors
            ${myRsvp === btn.value
              ? btn.activeClass
              : 'bg-white text-gray-600 border-gray-300 hover:border-navy hover:text-navy'
            }
          `}
        >
          {btn.label}
        </button>
      ))}
      {showCount && rsvpCount > 0 && (
        <span className="text-xs text-gray-400">
          {rsvpCount} going
        </span>
      )}
    </div>
  )
}
