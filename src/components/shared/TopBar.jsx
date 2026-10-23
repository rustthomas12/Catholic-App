import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'

// Sticky screen header, the pattern every major mobile app uses: Back on the
// left (detail screens), the title, and up to two actions on the right.
//   back:    a path to go to, or true for "previous screen" (falls back to /)
//   onBack:  optional handler instead (multi-step forms)
//   variant: 'navy' for screens with a navy hero, 'light' for white screens
export default function TopBar({ title, back, onBack, actions, variant = 'light', titleAs: Title = 'h1', className = '', children }) { // eslint-disable-line no-unused-vars -- used as a JSX tag
  const navigate = useNavigate()
  const navy = variant === 'navy'

  function goBack() {
    if (onBack) onBack()
    else if (typeof back === 'string') navigate(back)
    else if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }

  return (
    <header
      className={[
        'sticky z-30 flex items-center gap-1 px-2 min-h-[56px]',
        navy ? (className.includes('bg-') ? 'text-white' : 'bg-navy text-white') : 'bg-white/95 backdrop-blur border-b border-gray-100 text-navy',
        className,
      ].join(' ')}
      style={{ top: 'var(--app-safe-top, 0px)' }}
    >
      {back ? (
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className={[
            'w-11 h-11 flex items-center justify-center rounded-full flex-shrink-0 transition-colors',
            navy ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-navy hover:bg-lightbg',
          ].join(' ')}
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
      ) : (
        <span className="w-2 flex-shrink-0" />
      )}
      <Title className="flex-1 min-w-0 truncate text-lg font-bold">{title}</Title>
      {children}
      {actions && <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>}
    </header>
  )
}

// A 44×44 icon button for TopBar actions
export function TopBarAction({ label, onClick, to, icon: Icon, badge, variant = 'light' }) { // eslint-disable-line no-unused-vars -- used as a JSX tag
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const navy = variant === 'navy'
  return (
    <button
      type="button"
      aria-label={badge ? `${label}, ${t('a11y.unread', { count: badge })}` : label}
      onClick={onClick || (() => navigate(to))}
      className={[
        'relative w-11 h-11 flex items-center justify-center rounded-full transition-colors',
        navy ? 'text-white hover:bg-white/10' : 'text-navy hover:bg-lightbg',
      ].join(' ')}
    >
      <Icon className="w-6 h-6" />
      {badge > 0 && (
        <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-bold leading-[18px] text-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}
