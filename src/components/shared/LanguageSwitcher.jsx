import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'

/**
 * Language switcher — two variants:
 *   'full'    — shows flag + text label side by side (for Settings page)
 *   'compact' — single toggle button showing the OTHER language (for nav/login)
 */
export default function LanguageSwitcher({ variant = 'full' }) {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const currentLang = i18n.language === 'es' ? 'es' : 'en'

  async function switchLanguage(lang) {
    // 1. Update i18next immediately
    i18n.changeLanguage(lang)

    // 2. Persist to localStorage (instant, no network)
    try { localStorage.setItem('communio-language', lang) } catch {}

    // 3. Persist to DB (fire-and-forget)
    if (user) {
      supabase
        .from('profiles')
        .update({ language: lang })
        .eq('id', user.id)
        .then(() => {})
    }
  }

  if (variant === 'compact') {
    const nextLang = currentLang === 'en' ? 'es' : 'en'
    const label    = currentLang === 'en' ? 'ES' : 'EN'
    const ariaLabel = currentLang === 'en' ? 'Cambiar a español' : 'Switch to English'
    return (
      <button
        onClick={() => switchLanguage(nextLang)}
        className="text-xs font-semibold text-gray-500 hover:text-navy transition-colors px-2 py-1 rounded border border-gray-200 hover:border-gray-300 bg-white"
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => switchLanguage('en')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
          currentLang === 'en'
            ? 'bg-navy text-white border-navy'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-lightbg'
        }`}
      >
        🇺🇸 English
      </button>
      <button
        onClick={() => switchLanguage('es')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
          currentLang === 'es'
            ? 'bg-navy text-white border-navy'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-lightbg'
        }`}
      >
        🇲🇽 Español
      </button>
    </div>
  )
}
