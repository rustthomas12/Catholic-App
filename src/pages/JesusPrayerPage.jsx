import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import TopBar from '../components/shared/TopBar'

// The Jesus Prayer with a prayer rope (chotki / komboskini) counter.
// Everything stays on this device: the count resets each day.

const ROPES = [33, 50, 100]
// Larger beads divide the knots on 50- and 100-knot ropes
const BEAD_EVERY = { 33: 0, 50: 10, 100: 25 }

const STORE_KEY = 'jesus_prayer'
const today = () => new Date().toDateString()

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
    if (s && ROPES.includes(s.rope)) {
      return s.day === today() ? s : { ...s, day: today(), count: 0, ropes: 0 }
    }
  } catch {}
  return { rope: 100, form: 'full', day: today(), count: 0, ropes: 0 }
}

function save(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)) } catch {}
}

function buzz(ms) {
  try { navigator.vibrate?.(ms) } catch {}
}

export default function JesusPrayerPage() {
  const { t } = useTranslation('faith')
  useEffect(() => { document.title = `${t('jesus_prayer', 'The Jesus Prayer')} | inFold` }, [t])

  const [state, setState] = useState(load)
  const { rope, form, count, ropes } = state
  useEffect(() => save(state), [state])

  const FORMS = {
    full: t('jp_full', 'Lord Jesus Christ, Son of God, have mercy on me, a sinner.'),
    short: t('jp_short', 'Lord Jesus Christ, have mercy on me.'),
  }

  function pray() {
    setState((s) => {
      const next = s.count + 1
      if (next >= s.rope) {
        buzz([40, 60, 40])
        return { ...s, count: 0, ropes: s.ropes + 1 }
      }
      buzz(BEAD_EVERY[s.rope] && next % BEAD_EVERY[s.rope] === 0 ? 30 : 8)
      return { ...s, count: next }
    })
  }

  const reset = () => setState((s) => ({ ...s, count: 0, ropes: 0 }))

  // Knots around a circle; prayed knots fill in gold
  const size = 260
  const r = 112
  const knots = Array.from({ length: rope }, (_, i) => {
    const a = (i / rope) * 2 * Math.PI - Math.PI / 2
    const bead = BEAD_EVERY[rope] && (i + 1) % BEAD_EVERY[rope] === 0 && i + 1 < rope
    return { x: size / 2 + r * Math.cos(a), y: size / 2 + r * Math.sin(a), done: i < count, bead }
  })

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">
        <TopBar variant="navy" title={t('jesus_prayer', 'The Jesus Prayer')} back />
        <div className="bg-navy px-4 pb-6">
          <p className="text-white/75 text-sm ml-10">
            {t('jp_intro', 'Pray slowly with each knot of the prayer rope, keeping your attention on the words.')}
          </p>
        </div>

        <div className="px-4 pt-6 space-y-5">
          {/* Prayer text */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 text-center">
            <p className="text-navy text-lg leading-relaxed font-serif italic">{FORMS[form]}</p>
            <div className="flex justify-center gap-2 mt-4" role="group" aria-label={t('jp_form', 'Form of the prayer')}>
              {['full', 'short'].map((f) => (
                <button key={f} onClick={() => setState((s) => ({ ...s, form: f }))} aria-pressed={form === f}
                  className={`text-xs font-semibold px-3 min-h-[36px] rounded-full transition-colors ${
                    form === f ? 'bg-navy text-white' : 'bg-lightbg text-gray-600 hover:text-navy'
                  }`}>
                  {f === 'full' ? t('jp_form_full', 'Full') : t('jp_form_short', 'Short')}
                </button>
              ))}
            </div>
          </div>

          {/* Rope: tap the circle to pray one knot */}
          <div className="flex flex-col items-center">
            <button
              onClick={pray}
              aria-label={t('jp_tap', 'Pray one knot. {{count}} of {{rope}}', { count, rope })}
              className="relative rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-gold select-none touch-manipulation"
              style={{ width: size, height: size, WebkitTapHighlightColor: 'transparent' }}
            >
              <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="1" />
                {knots.map((k, i) => (
                  <circle key={i} cx={k.x} cy={k.y}
                    r={k.bead ? 6 : rope > 50 ? 3 : 4}
                    fill={k.done ? '#C9A84C' : k.bead ? '#1B2A4A' : '#D1D5DB'} />
                ))}
                {/* The cross where the rope is tied */}
                <path d={`M${size / 2 - 1.5} ${size / 2 - r - 16}h3v5h5v3h-5v8h-3v-8h-5v-3h5z`} fill="#1B2A4A" />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-navy tabular-nums" aria-live="polite">{count}</span>
                <span className="text-xs text-gray-500 mt-1">{t('jp_of', 'of {{rope}}', { rope })}</span>
              </span>
            </button>
            <p className="text-xs text-gray-500 mt-3">{t('jp_hint', 'Tap the rope for each prayer')}</p>
            {ropes > 0 && (
              <p className="text-sm text-navy font-semibold mt-2">
                {t('jp_ropes', { count: ropes, defaultValue_one: '{{count}} full rope today', defaultValue_other: '{{count}} full ropes today' })}
              </p>
            )}
          </div>

          {/* Rope size + reset */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-medium text-navy flex-1">{t('jp_rope_size', 'Knots on the rope')}</span>
            <div className="flex gap-1" role="group" aria-label={t('jp_rope_size', 'Knots on the rope')}>
              {ROPES.map((n) => (
                <button key={n} onClick={() => setState((s) => ({ ...s, rope: n, count: 0 }))} aria-pressed={rope === n}
                  className={`text-sm font-semibold w-12 min-h-[36px] rounded-lg transition-colors ${
                    rope === n ? 'bg-navy text-white' : 'bg-lightbg text-gray-600 hover:text-navy'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
            <button onClick={reset} aria-label={t('jp_reset', 'Start over')}
              className="p-2 text-gray-500 hover:text-navy min-h-[36px]">
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-gold/10 border border-gold/20 rounded-2xl px-4 py-4">
            <p className="text-navy text-xs leading-relaxed">
              {t('jp_note', 'The Jesus Prayer is the prayer of the heart of the Christian East. Many pray it in rhythm with their breathing: the first half breathing in, the second half breathing out. Your count stays on this device and starts fresh each day.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
