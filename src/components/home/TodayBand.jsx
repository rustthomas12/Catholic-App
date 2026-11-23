import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BuildingLibraryIcon } from '@heroicons/react/24/outline'
import { useTLMReadings } from '../../hooks/useReadings'
import { cleanTlmSection } from '../../utils/tlmText'
import { seasonLabel } from '../../utils/liturgical'

// Phone Home: a slim navy band under the top bar with two tiles, today's
// Gospel and your parishes. It replaces the tall readings card and the
// communities row, so the feed starts on the first screen.
// Fixed height in every state (loading, none, some): nothing below shifts.

const TILE = 'group relative h-[60px] min-w-0 rounded-2xl bg-white/[0.07] ring-1 ring-inset ring-white/10 '
  + 'px-3 flex items-center gap-2.5 transition-colors hover:bg-white/[0.11] active:bg-white/[0.14] '
  + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'

const ICON = 'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gold/15 ring-1 ring-gold/30'

const KICKER = 'flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold/90 truncate'

function Cross() {
  return (
    <svg width="12" height="15" viewBox="0 0 14 17" aria-hidden="true">
      <path d="M5.5 0h3v5h5.5v3H8.5v9h-3V8H0V5h5.5z" fill="#C9A84C" />
    </svg>
  )
}

function Bars() {
  return (
    <span className="flex-1 min-w-0 space-y-1.5" aria-hidden="true">
      <span className="block h-2 w-14 rounded bg-white/15 animate-pulse" />
      <span className="block h-3 w-24 rounded bg-white/20 animate-pulse" />
    </span>
  )
}

function ReadingsTile({ readings, loading, error, liturgicalInfo, feastInfo }) {
  const { t } = useTranslation('faith')
  // Same choice as the Faith page: Ordinary Form or the 1962 Missal
  let rite = 'of'
  try { rite = localStorage.getItem('preferred_rite') ?? 'of' } catch { /* private mode */ }
  const isTLM = rite === 'tlm'
  const tlm = useTLMReadings(isTLM)

  const active = isTLM ? tlm.readings : readings
  const busy = isTLM ? tlm.loading : loading
  const failed = isTLM ? tlm.error : error
  const gospel = isTLM ? cleanTlmSection(active?.gospel) : active?.gospel
  const day = (isTLM && active?.massName) || (feastInfo?.isFeast && feastInfo.feastName) || seasonLabel(liturgicalInfo)

  return (
    <Link to="/faith" className={TILE} aria-label={t('readings_title')}>
      <span className={ICON}><Cross /></span>
      {busy ? <Bars /> : (
        <span className="flex-1 min-w-0">
          <span className={KICKER}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 ring-1 ring-white/30"
              style={{ backgroundColor: liturgicalInfo?.color ?? '#15803D' }} />
            <span className="truncate">{day || t('readings_title')}</span>
          </span>
          <span className="block text-[13.5px] font-semibold text-white truncate mt-0.5">
            {failed || !gospel?.reference ? t('readings_title') : gospel.reference}
          </span>
        </span>
      )}
    </Link>
  )
}

function CommunitiesTile({ loading, parishes, orgs }) {
  const { t } = useTranslation()
  const names = [...parishes, ...orgs].map(x => x.name)
  if (loading) {
    return <div className={TILE} aria-hidden="true"><span className={ICON} /><Bars /></div>
  }
  const none = names.length === 0
  const more = names.length - 1
  return (
    <Link to={none ? '/directory' : '/communities'} className={TILE}
      aria-label={none ? t('home.find_my_parish', 'Find my parish') : t('home.communities', 'My parishes and organizations')}>
      <span className={ICON}><BuildingLibraryIcon className="w-4 h-4 text-gold" /></span>
      <span className="flex-1 min-w-0">
        <span className={KICKER}>{none ? t('home.get_connected', 'Get connected') : t('home.my_parishes', 'My parishes')}</span>
        <span className="flex items-baseline gap-1.5 mt-0.5 min-w-0">
          <span className="text-[13.5px] font-semibold text-white truncate">
            {none ? t('home.find_my_parish', 'Find my parish') : names[0]}
          </span>
          {more > 0 && <span className="text-[11px] font-medium text-white/55 flex-shrink-0">+{more}</span>}
        </span>
      </span>
    </Link>
  )
}

export default function TodayBand({ readingsProps, communities }) {
  return (
    <div className="bg-navy rounded-b-[26px] px-3 pt-1 pb-3.5 shadow-[0_12px_24px_-20px_rgba(27,42,74,.9)]">
      <div className="grid grid-cols-2 gap-2">
        <ReadingsTile {...readingsProps} />
        <CommunitiesTile {...communities} />
      </div>
    </div>
  )
}
