import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import { useFormation } from '../hooks/useFormation'
import { LENT_PROGRAM } from '../data/formation/lent'
import { ADVENT_PROGRAM } from '../data/formation/advent'

const PROGRAMS = {
  lent: LENT_PROGRAM,
  advent: ADVENT_PROGRAM,
}

const PILLAR_COLORS = {
  fasting:    'bg-orange-50 text-orange-700 border-orange-200',
  prayer:     'bg-blue-50 text-blue-700 border-blue-200',
  almsgiving: 'bg-green-50 text-green-700 border-green-200',
  hope:       'bg-sky-50 text-sky-700 border-sky-200',
  peace:      'bg-teal-50 text-teal-700 border-teal-200',
  joy:        'bg-pink-50 text-pink-700 border-pink-200',
  love:       'bg-red-50 text-red-700 border-red-200',
}

const PROGRAM_HEADER_COLORS = {
  lent:   'bg-purple-900',
  advent: 'bg-blue-900',
}

export default function FormationPage() {
  const { program } = useParams()
  const navigate = useNavigate()

  const data = PROGRAMS[program]
  const { completedDays, loading, markComplete, markIncomplete } = useFormation(data?.programKey)

  const [expandedDay, setExpandedDay] = useState(null)

  useEffect(() => {
    if (data) {
      document.title = `${data.title} | Communio`
    } else {
      document.title = 'Formation | Communio'
    }
  }, [data])

  if (!data) {
    return (
      <div className="min-h-screen bg-cream md:pl-60 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="font-bold text-navy mb-2">Program not found</p>
          <button
            onClick={() => navigate('/faith')}
            className="text-navy text-sm font-semibold hover:underline"
          >
            ← Back to Faith
          </button>
        </div>
      </div>
    )
  }

  const completedCount = completedDays.size
  const totalDays = data.totalDays
  const progressPct = Math.round((completedCount / totalDays) * 100)

  async function toggleDay(dayNumber) {
    if (completedDays.has(dayNumber)) {
      await markIncomplete(dayNumber)
    } else {
      await markComplete(dayNumber)
    }
  }

  const headerColor = PROGRAM_HEADER_COLORS[program] || 'bg-navy'

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* Header */}
        <div className={`${headerColor} px-4 pt-5 pb-6`}>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate('/faith')}
              className="text-white/70 hover:text-white p-1 transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-white font-bold text-xl">{data.title}</h1>
          </div>
          <p className="text-gray-300 text-sm ml-8">{data.subtitle}</p>
        </div>

        <div className="px-4 pt-5 space-y-5">

          {/* Progress bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-navy">Your Progress</p>
              <p className="text-sm text-gray-500">{completedCount} / {totalDays} days</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-gold h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {completedCount > 0 && (
              <p className="text-xs text-gray-400 mt-1.5">{progressPct}% complete</p>
            )}
          </div>

          {/* Day cards */}
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-white rounded-xl border border-gray-100" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {data.days.map((day) => {
                const done = completedDays.has(day.day)
                const isOpen = expandedDay === day.day
                const pillarStyle = PILLAR_COLORS[day.pillar] || 'bg-gray-50 text-gray-600 border-gray-200'

                return (
                  <div
                    key={day.day}
                    className={`bg-white rounded-2xl border shadow-sm transition-all ${
                      done ? 'border-gold/40' : 'border-gray-100'
                    }`}
                  >
                    {/* Card header */}
                    <button
                      onClick={() => setExpandedDay(isOpen ? null : day.day)}
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-start gap-3">
                        {/* Complete toggle */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleDay(day.day) }}
                          className="flex-shrink-0 mt-0.5"
                          aria-label={done ? `Mark day ${day.day} incomplete` : `Mark day ${day.day} complete`}
                        >
                          {done
                            ? <CheckCircleIconSolid className="w-6 h-6 text-gold" />
                            : <CheckCircleIcon className="w-6 h-6 text-gray-300" />
                          }
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-xs font-bold text-gray-400">Day {day.day}</span>
                            {day.dateNote && (
                              <span className="text-xs text-gray-400">· {day.dateNote}</span>
                            )}
                            {day.pillar && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${pillarStyle}`}>
                                {day.pillar}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm font-bold ${done ? 'text-gray-400 line-through' : 'text-navy'}`}>
                            {day.theme}
                          </p>
                        </div>

                        <span className="text-gray-400 text-xs flex-shrink-0 mt-1">
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-50">

                        {/* Scripture */}
                        <div className="pt-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            {day.scripture.reference}
                          </p>
                          <p className="text-sm text-gray-700 italic leading-relaxed">
                            {day.scripture.text}
                          </p>
                        </div>

                        {/* Reflection */}
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Reflection
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                            {day.reflection}
                          </p>
                        </div>

                        {/* Prayer */}
                        <div className="bg-navy/5 border border-navy/10 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1">
                            Prayer
                          </p>
                          <p className="text-sm text-navy/80 italic leading-relaxed">
                            {day.prayer}
                          </p>
                        </div>

                        {/* Action */}
                        {day.action && (
                          <div className="bg-gold/10 border border-gold/20 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1">
                              Today's Practice
                            </p>
                            <p className="text-sm text-navy leading-relaxed">{day.action}</p>
                          </div>
                        )}

                        {/* Mark complete button */}
                        <button
                          onClick={() => toggleDay(day.day)}
                          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                            done
                              ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              : 'bg-gold text-navy hover:bg-gold/90'
                          }`}
                        >
                          {done ? '✓ Completed — tap to undo' : 'Mark as complete'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Remaining days placeholder */}
              {data.days.length < data.totalDays && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                  <p className="text-sm font-semibold text-gray-400">
                    Days {data.days.length + 1}–{data.totalDays} coming soon
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    More content will be added before the season begins.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
