import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShareIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { toast } from '../shared/Toast'
import { useTLMReadings } from '../../hooks/useReadings'

const GOLD_CROSS = (
  <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M8.5 0h3v7h8.5v3H11.5v14h-3V10H0V7h8.5z" fill="#C9A84C" />
  </svg>
)

const GOLD_CROSS_SM = (
  <svg width="14" height="17" viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M5.5 0h3v5h5.5v3H8.5v9h-3V8H0V5h5.5z" fill="#C9A84C" />
  </svg>
)

// ── ReadingSection ─────────────────────────────────────────
function ReadingSection({ label, reference, text, italic = false }) {
  if (!text && !reference) return null

  return (
    <div className="py-5 border-b border-gray-100 last:border-b-0">
      {label && (
        <p className="text-xs font-bold text-gold uppercase tracking-widest mb-2">{label}</p>
      )}
      {reference && (
        <p className="text-base font-semibold text-navy mb-2">{reference}</p>
      )}
      {text && (
        <p
          className={`text-sm leading-relaxed text-gray-800 ${italic ? 'italic' : ''}`}
          style={{ whiteSpace: 'pre-line' }}
        >
          {text}
        </p>
      )}
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────
function ReadingsSkeleton() {
  return (
    <div className="animate-pulse space-y-6 py-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
          <div className="h-3 w-5/6 bg-gray-100 rounded" />
          <div className="h-3 w-4/6 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

// ── Fallback (fetch error) ─────────────────────────────────
function ReadingsFallback({ t, isTLM }) {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const mmUrl = `https://www.missalemeum.com/en/${yyyy}-${mm}-${dd}`

  return (
    <div className="py-8 flex flex-col items-center text-center gap-3">
      <div className="flex items-center justify-center w-12 h-12 bg-lightbg rounded-full">
        {GOLD_CROSS_SM}
      </div>
      <p className="text-navy font-semibold">{t('readings_title')}</p>
      <p className="text-gray-500 text-sm">{t('readings_error')}</p>
      {isTLM ? (
        <a
          href={mmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-gold text-navy text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gold/90 transition-colors"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          Open Missale Meum
        </a>
      ) : (
        <a
          href="https://bible.usccb.org/bible/readings/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-gold text-navy text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gold/90 transition-colors"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          {t('readings_link')}
        </a>
      )}
      {!isTLM && <p className="text-gray-400 text-xs px-6">{t('readings_credit')}</p>}
    </div>
  )
}

// ── Rite toggle ────────────────────────────────────────────
function RiteToggle({ rite, onChange }) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5 mb-4">
      <button
        onClick={() => onChange('of')}
        className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
          rite === 'of' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
        }`}
      >
        Ordinary Form
      </button>
      <button
        onClick={() => onChange('tlm')}
        className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
          rite === 'tlm' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
        }`}
      >
        Traditional (1962)
      </button>
    </div>
  )
}

// ── TLM Readings display ───────────────────────────────────
function TLMReadingsContent({ readings }) {
  if (!readings) return null
  return (
    <div>
      {readings.massName && (
        <p className="text-xs font-bold text-gold uppercase tracking-widest py-3 border-b border-gray-100">
          {readings.massName}
        </p>
      )}
      {readings.epistle && (
        <ReadingSection
          label="Epistle"
          reference={readings.epistle.reference}
          text={readings.epistle.text}
        />
      )}
      {readings.gradual && (
        <ReadingSection
          label="Gradual"
          reference={readings.gradual.reference}
          text={readings.gradual.text}
          italic
        />
      )}
      {readings.gospel && (
        <ReadingSection
          label="Gospel"
          reference={readings.gospel.reference}
          text={readings.gospel.text}
        />
      )}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────
const RITE_KEY = 'preferred_rite'

export default function ReadingsCard({
  variant = 'full',
  readings,
  loading,
  error,
  liturgicalInfo,
  feastInfo,
  todayFormatted,
}) {
  const { t } = useTranslation('faith')

  const [rite, setRite] = useState(() => localStorage.getItem(RITE_KEY) ?? 'of')

  function handleRiteChange(r) {
    setRite(r)
    localStorage.setItem(RITE_KEY, r)
  }

  const isTLM = rite === 'tlm'
  const { readings: tlmReadings, loading: tlmLoading, error: tlmError } = useTLMReadings(isTLM)

  const activeReadings = isTLM ? tlmReadings : readings
  const activeLoading = isTLM ? tlmLoading : loading
  const activeError = isTLM ? tlmError : error

  // ══ COMPACT VARIANT (HomePage) ══════════════════════════
  if (variant === 'compact') {
    const gospel = isTLM ? activeReadings?.gospel : readings?.gospel
    return (
      <Link to="/faith" className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          {GOLD_CROSS_SM}
          <span className="flex-1 text-sm font-semibold text-navy">{t('readings_title')}</span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: liturgicalInfo?.color ?? '#15803D' }}
            />
            <span className="text-xs text-gray-400">{liturgicalInfo?.label}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-1">{todayFormatted}</p>

        {feastInfo?.isFeast && (
          <p className="text-xs text-gold font-semibold mb-1">✦ {feastInfo.feastName}</p>
        )}

        {loading ? (
          <div className="animate-pulse space-y-1">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-full bg-gray-100 rounded" />
          </div>
        ) : error || !readings ? (
          <p className="text-sm text-gray-500">{t('readings_error')}</p>
        ) : (
          <>
            {gospel?.reference && (
              <p className="text-sm font-medium text-navy">{gospel.reference}</p>
            )}
            {gospel?.text && (
              <p className="text-xs text-gray-500 italic mt-0.5 line-clamp-2">
                {gospel.text.slice(0, 120)}…
              </p>
            )}
          </>
        )}

        <p className="text-sm font-semibold text-gold mt-3">Read today's readings →</p>
      </Link>
    )
  }

  // ══ FULL VARIANT (FaithPage) ═════════════════════════════
  return (
    <div>
      {/* Liturgical season badge */}
      <div className="flex flex-col items-center gap-2 mb-6">
        {GOLD_CROSS}
        <p className="text-gray-500 text-sm">{todayFormatted}</p>
        {liturgicalInfo && (
          <span
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: liturgicalInfo.color, color: liturgicalInfo.textColor }}
          >
            {liturgicalInfo.label}
          </span>
        )}
        {feastInfo?.isFeast && (
          <p className="text-sm font-semibold text-gold">✦ {feastInfo.feastName}</p>
        )}
      </div>

      {/* Rite toggle */}
      <RiteToggle rite={rite} onChange={handleRiteChange} />

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {activeLoading ? (
          <div className="px-5"><ReadingsSkeleton /></div>
        ) : activeError || !activeReadings ? (
          <div className="px-5"><ReadingsFallback t={t} isTLM={isTLM} /></div>
        ) : isTLM ? (
          <div className="px-5">
            <TLMReadingsContent readings={tlmReadings} />
          </div>
        ) : (
          <div className="px-5">
            {readings.firstReading && (
              <ReadingSection
                label={t('first_reading')}
                reference={readings.firstReading.reference}
                text={readings.firstReading.text}
              />
            )}
            {readings.psalm && (
              <ReadingSection
                label={t('psalm')}
                reference={readings.psalm.reference}
                text={readings.psalm.text}
                italic
              />
            )}
            {readings.secondReading && (
              <ReadingSection
                label={t('second_reading')}
                reference={readings.secondReading.reference}
                text={readings.secondReading.text}
              />
            )}
            {readings.gospelAcclamation && (
              <div className="py-4 border-b border-gray-100 text-center">
                <p className="text-xs font-bold text-gold uppercase tracking-widest mb-1">
                  {t('gospel_acclamation')}
                </p>
                <p className="text-sm text-gold font-medium italic">
                  {readings.gospelAcclamation.text}
                </p>
              </div>
            )}
            {readings.gospel && (
              <ReadingSection
                label={t('gospel')}
                reference={readings.gospel.reference}
                text={readings.gospel.text}
              />
            )}
          </div>
        )}

        {/* Share button */}
        {!activeLoading && !activeError && activeReadings && (
          <div className="px-5 py-4 border-t border-gray-100">
            <ShareReadingsButton readings={activeReadings} isTLM={isTLM} t={t} />
          </div>
        )}

        {/* Attribution */}
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-300 text-center">
            {isTLM
              ? 'Traditional readings provided by Missale Meum'
              : t('readings_credit')}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Share button ───────────────────────────────────────────
function ShareReadingsButton({ readings, isTLM, t }) {
  async function handleShare() {
    const parts = []
    if (isTLM) {
      if (readings.epistle?.reference) parts.push(`Epistle: ${readings.epistle.reference}`)
      if (readings.gospel?.reference) parts.push(`Gospel: ${readings.gospel.reference}`)
    } else {
      if (readings.firstReading?.reference) parts.push(`First Reading: ${readings.firstReading.reference}`)
      if (readings.psalm?.reference) parts.push(`Psalm: ${readings.psalm.reference}`)
      if (readings.gospel?.reference) parts.push(`Gospel: ${readings.gospel.reference}`)
    }
    const text = parts.join('\n')

    if (navigator.share) {
      try {
        await navigator.share({ title: "Today's Readings", text, url: window.location.href })
      } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        toast.success(t('readings_copied'))
      } catch {
        toast.error('Could not copy to clipboard')
      }
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy transition-colors"
    >
      <ShareIcon className="w-4 h-4" />
      {t('share_readings')}
    </button>
  )
}
