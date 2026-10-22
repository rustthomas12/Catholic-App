import { useEffect, useState } from 'react'
import TopBar from '../components/shared/TopBar'
import { HOURS } from '../data/liturgyOfHours'

const HOUR_ORDER = ['morning', 'evening', 'night']

function getCurrentHourId() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 19) return 'evening'
  return 'night'
}

function Section({ title, children, accent = false }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-navy/5 border-navy/10' : 'bg-white border-gray-100 shadow-sm'}`}>
      <p className="text-[10px] font-bold text-navy mb-2 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  )
}

export default function LiturgyOfHoursPage() {
  useEffect(() => { document.title = 'Liturgy of the Hours | inFold' }, [])

  const [activeId, setActiveId] = useState(getCurrentHourId)

  const hour = HOURS[activeId]

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* Header */}
        <TopBar variant="navy" title="Liturgy of the Hours" back="/faith" />
        <div className="bg-navy px-4 pb-6">
          <p className="text-gray-500 text-sm ml-10">The prayer of the Church throughout the day</p>
        </div>

        {/* Hour selector tabs */}
        <div className="bg-white border-b border-gray-100 sticky z-20 sticky-below-topbar">
          <div className="flex">
            {HOUR_ORDER.map(id => {
              const h = HOURS[id]
              return (
                <button
                  key={id}
                  onClick={() => setActiveId(id)}
                  className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors leading-tight ${
                    activeId === id
                      ? 'border-navy text-navy'
                      : 'border-transparent text-gray-500 hover:text-gray-600'
                  }`}
                >
                  <span className="block">{h.name}</span>
                  <span className="block font-normal opacity-90">{h.latinName}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-4 pt-5 space-y-4">

          {/* Opening versicle */}
          <div className="bg-gold/10 border border-gold/20 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-navy mb-1 uppercase tracking-widest">Opening Versicle</p>
            <p className="text-sm text-navy italic leading-relaxed">{hour.openingVerse}</p>
            {hour.examination && (
              <p className="text-xs text-navy/70 mt-2 leading-relaxed">{hour.examination}</p>
            )}
          </div>

          {/* Short reading */}
          {hour.shortReading && (
            <Section title={hour.shortReading.reference}>
              <p className="text-sm text-gray-700 italic leading-relaxed">{hour.shortReading.text}</p>
            </Section>
          )}

          {/* Psalm */}
          <Section title={hour.psalm.title}>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{hour.psalm.text}</p>
          </Section>

          {/* Canticle */}
          <Section title={`${hour.canticle.name} — ${hour.canticle.reference}`} accent>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{hour.canticle.text}</p>
          </Section>

          {/* Intercessions */}
          {hour.intercessions && (
            <Section title="Intercessions">
              <div className="space-y-2">
                {hour.intercessions.map((intention, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-gold font-bold mt-0.5 flex-shrink-0">·</span>
                    <div>
                      <p className="text-sm text-gray-700 leading-snug">{intention}</p>
                      <p className="text-xs text-navy/75 italic">{hour.response}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Marian antiphon (Night Prayer) */}
          {hour.marianAntiphon && (
            <Section title={hour.marianAntiphon.name} accent>
              <p className="text-sm text-gray-700 italic leading-relaxed whitespace-pre-line">{hour.marianAntiphon.text}</p>
            </Section>
          )}

          {/* Closing */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-bold text-navy mb-1 uppercase tracking-widest">Closing</p>
            <p className="text-sm text-gray-700 italic leading-relaxed">{hour.closing}</p>
          </div>

        </div>
      </div>
    </div>
  )
}
