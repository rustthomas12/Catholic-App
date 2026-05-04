import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, SunIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'

const TODAY_KEY = () => `morning_offering_${new Date().toDateString()}`

const PRAYERS = [
  {
    id: 'traditional',
    label: 'Traditional (Apostleship of Prayer)',
    text: `O my Jesus, through the Immaculate Heart of Mary, I offer You my prayers, works, joys, and sufferings of this day in union with the Holy Sacrifice of the Mass throughout the world. I offer them for all the intentions of Your Sacred Heart: the salvation of souls, reparation for sin, and the reunion of all Christians. I offer them for the intentions of our bishops and of all Apostles of Prayer, and in particular for those recommended by our Holy Father this month. Amen.`,
  },
  {
    id: 'simple',
    label: 'Simple Morning Offering',
    text: `O God, I offer You all my prayers, works, joys, and sufferings of this day. May everything I do today be done for Your greater glory and the salvation of souls. Grant me the grace to serve You faithfully in all things. Through Christ our Lord. Amen.`,
  },
  {
    id: 'st_ignatius',
    label: 'Prayer for Generosity (St. Ignatius)',
    text: `Lord, teach me to be generous.\nTeach me to serve You as You deserve;\nto give and not to count the cost;\nto fight and not to heed the wounds;\nto toil and not to seek for rest;\nto labor and not to seek reward,\nsave that of knowing that I do Your will.\nThrough Jesus Christ our Lord. Amen.`,
  },
  {
    id: 'st_therese',
    label: 'Morning Prayer (St. Thérèse of Lisieux)',
    text: `O my God, I offer Thee all my actions of this day for the intentions and for the glory of the Sacred Heart of Jesus. I desire to sanctify every beat of my heart, my every thought, my simplest works, by uniting them to Its infinite merits; and I wish to make reparation for my sins by casting them into the furnace of Its Merciful Love.\n\nO my God, I ask of Thee for myself and for those whom I hold dear, the grace to fulfill perfectly Thy Holy Will, to accept for love of Thee the joys and sorrows of this passing life, so that we may one day be united together in Heaven for all Eternity. Amen.`,
  },
]

export default function MorningOfferingPage() {
  useEffect(() => { document.title = 'Morning Offering | Communio' }, [])

  const navigate = useNavigate()
  const [prayedToday, setPrayedToday] = useState(() => !!localStorage.getItem(TODAY_KEY()))
  const [selected, setSelected] = useState('traditional')

  function markPrayed() {
    localStorage.setItem(TODAY_KEY(), '1')
    setPrayedToday(true)
  }

  const prayer = PRAYERS.find(p => p.id === selected)

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* Header */}
        <div className="bg-navy px-4 pt-5 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white p-1 transition-colors">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <p className="text-gold text-xs font-semibold uppercase tracking-widest">Daily Prayer</p>
              <h1 className="text-white font-bold text-xl">Morning Offering</h1>
            </div>
          </div>
          <p className="text-white/50 text-sm ml-8 mt-1">
            Offer your day to God before it begins.
          </p>
        </div>

        <div className="px-4 pt-6 space-y-5">

          {/* Prayed today banner */}
          {prayedToday && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
              <CheckCircleSolid className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-green-700 text-sm font-medium">Offered today — God bless your day.</p>
            </div>
          )}

          {/* Prayer selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Choose a prayer</p>
            </div>
            <div className="divide-y divide-gray-50">
              {PRAYERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                    selected === p.id ? 'bg-lightbg' : 'hover:bg-lightbg/50'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors ${
                    selected === p.id ? 'bg-gold border-gold' : 'border-gray-300'
                  }`} />
                  <span className={`text-sm ${selected === p.id ? 'font-semibold text-navy' : 'text-gray-600'}`}>
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Prayer text */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
              <SunIcon className="w-4 h-4 text-gold" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prayer</p>
            </div>
            <div className="px-6 py-6">
              <p className="text-navy text-base leading-relaxed whitespace-pre-line font-serif italic">
                {prayer?.text}
              </p>
            </div>
          </div>

          {/* Mark as prayed */}
          <button
            onClick={markPrayed}
            disabled={prayedToday}
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-colors ${
              prayedToday
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-navy text-white hover:bg-navy/90'
            }`}
          >
            {prayedToday ? '✓ Offered today' : 'I have offered my day to God'}
          </button>

          {/* Tip */}
          <div className="bg-gold/10 border border-gold/20 rounded-2xl px-4 py-4">
            <p className="text-navy text-xs leading-relaxed">
              <span className="font-bold">Tip:</span> The Morning Offering is most powerful when said immediately upon waking, before checking your phone — uniting every moment of your day to the Mass being celebrated around the world.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
