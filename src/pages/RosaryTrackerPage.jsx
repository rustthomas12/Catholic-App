import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { format } from 'date-fns'
import { useRosaryTracker, MYSTERY_NAMES, MYSTERY_INITIAL, MYSTERIES } from '../hooks/useRosaryTracker'

const MYSTERY_COLORS = {
  joyful:    'bg-blue-50 border-blue-200 text-blue-700',
  sorrowful: 'bg-red-50 border-red-200 text-red-700',
  glorious:  'bg-yellow-50 border-yellow-200 text-yellow-700',
  luminous:  'bg-purple-50 border-purple-200 text-purple-700',
}

export default function RosaryTrackerPage() {
  useEffect(() => { document.title = 'Rosary Tracker | Communio' }, [])

  const navigate = useNavigate()
  const {
    recentDays, streak, loading, prayedToday,
    todayMysteries, logRosary,
  } = useRosaryTracker()

  const [logging, setLogging] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  async function handleLog() {
    if (prayedToday || logging) return
    setLogging(true)
    await logRosary()
    setLogging(false)
  }

  // Build 30-day calendar grid (most recent first)
  const dayMap = new Map(recentDays.map(d => [d.prayed_on, d.mysteries]))

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* Header */}
        <div className="bg-navy px-4 pt-5 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate('/faith')}
              className="text-white/70 hover:text-white p-1 transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-white font-bold text-xl">Rosary Tracker</h1>
          </div>
          <p className="text-gray-300 text-sm ml-8">Pray daily — build the habit</p>
        </div>

        <div className="px-4 pt-6 space-y-5">

          {/* Streak */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            {loading ? (
              <div className="animate-pulse h-16 w-24 bg-gray-100 rounded-xl mx-auto" />
            ) : (
              <>
                <p className="text-5xl font-bold text-navy mb-1">{streak}</p>
                <p className="text-sm text-gray-500">day{streak !== 1 ? 's' : ''} in a row 🔥</p>
              </>
            )}
          </div>

          {/* Today's mystery */}
          <div className={`rounded-2xl border p-4 ${MYSTERY_COLORS[todayMysteries]}`}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">Today's Mysteries</p>
            <p className="font-bold text-base">{MYSTERY_NAMES[todayMysteries]}</p>
          </div>

          {/* Log button */}
          <button
            onClick={handleLog}
            disabled={prayedToday || logging}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
              prayedToday
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gold text-navy hover:bg-gold/90 active:scale-[0.98]'
            }`}
          >
            {prayedToday && <CheckCircleIcon className="w-5 h-5 text-gold" />}
            {logging ? 'Saving…' : prayedToday ? '✓ Prayed today' : 'Log rosary for today'}
          </button>

          {/* 30-day calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-navy mb-3">Last 30 Days</p>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 30 }, (_, i) => {
                const d = new Date()
                d.setDate(d.getDate() - (29 - i))
                const key = format(d, 'yyyy-MM-dd')
                const mysteries = dayMap.get(key)
                const isToday = key === todayStr
                return (
                  <div
                    key={key}
                    title={mysteries ? MYSTERY_NAMES[mysteries] : format(d, 'MMM d')}
                    className={`aspect-square rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                      mysteries
                        ? 'bg-gold text-navy'
                        : isToday
                        ? 'border-2 border-gold text-gold'
                        : 'bg-gray-100 text-gray-300'
                    }`}
                  >
                    {mysteries ? MYSTERY_INITIAL[mysteries] : ''}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">J = Joyful · S = Sorrowful · G = Glorious · L = Luminous</p>
          </div>

          {/* Mystery details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-navy mb-3">{MYSTERY_NAMES[todayMysteries]}</p>
            <div className="space-y-2">
              {MYSTERIES[todayMysteries].map((m, i) => (
                <button
                  key={i}
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-navy transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-navy">{i + 1}. {m.title}</p>
                    <span className="text-gray-400 text-xs ml-2">{expanded === i ? '▲' : '▼'}</span>
                  </div>
                  {expanded === i && (
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">{m.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
