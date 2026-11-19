import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// English
import commonEn  from '../locales/en/common.json'
import authEn    from '../locales/en/auth.json'
import feedEn    from '../locales/en/feed.json'
import faithEn   from '../locales/en/faith.json'
import groupsEn  from '../locales/en/groups.json'
import parishEn  from '../locales/en/parish.json'
import premiumEn from '../locales/en/premium.json'
import adminEn   from '../locales/en/admin.json'

// Detect saved preference → browser language → 'en'
function detectLanguage() {
  try {
    const saved = localStorage.getItem('infold-language')
    if (saved === 'es' || saved === 'en') return saved
    const browser = navigator.language?.slice(0, 2).toLowerCase()
    if (browser === 'es') return 'es'
  } catch {}
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common:  commonEn,
      auth:    authEn,
      feed:    feedEn,
      faith:   faithEn,
      groups:  groupsEn,
      parish:  parishEn,
      premium: premiumEn,
      admin:   adminEn,
    },
  },
  lng: detectLanguage(),
  partialBundledLanguages: true,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'auth', 'feed', 'faith', 'groups', 'parish', 'premium', 'admin'],
  interpolation: {
    escapeValue: false,
  },
  debug: import.meta.env.DEV && false,
})

// Keep <html lang> in sync for screen readers and browser translation prompts
const syncHtmlLang = (lng) => { try { document.documentElement.lang = lng?.startsWith('es') ? 'es' : 'en' } catch {} }
syncHtmlLang(i18n.language)
i18n.on('languageChanged', syncHtmlLang)

// Spanish is fetched only when needed. Switch languages through
// setLanguage(), which loads the strings before switching.
let esPromise = null
function loadSpanish() {
  esPromise ??= import('../locales/es/index.js').then(({ default: bundles }) => {
    for (const [ns, strings] of Object.entries(bundles)) i18n.addResourceBundle('es', ns, strings, true, true)
  }).catch((err) => { esPromise = null; throw err })
  return esPromise
}

export async function setLanguage(lng) {
  if (lng === 'es') { try { await loadSpanish() } catch { return } }
  return i18n.changeLanguage(lng)
}

// Resolves once the starting language's strings are present; main.jsx
// waits for it so Spanish users never see a flash of English
export const i18nReady = i18n.language === 'es'
  ? loadSpanish().then(() => i18n.changeLanguage('es')).catch(() => {})
  : Promise.resolve()

export default i18n
export { useTranslation } from 'react-i18next'
export { detectLanguage }
