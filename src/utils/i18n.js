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

// Spanish
import commonEs  from '../locales/es/common.json'
import authEs    from '../locales/es/auth.json'
import feedEs    from '../locales/es/feed.json'
import faithEs   from '../locales/es/faith.json'
import groupsEs  from '../locales/es/groups.json'
import parishEs  from '../locales/es/parish.json'
import premiumEs from '../locales/es/premium.json'
import adminEs   from '../locales/es/admin.json'

// Detect saved preference → browser language → 'en'
function detectLanguage() {
  try {
    const saved = localStorage.getItem('communio-language')
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
    es: {
      common:  commonEs,
      auth:    authEs,
      feed:    feedEs,
      faith:   faithEs,
      groups:  groupsEs,
      parish:  parishEs,
      premium: premiumEs,
      admin:   adminEs,
    },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'auth', 'feed', 'faith', 'groups', 'parish', 'premium', 'admin'],
  interpolation: {
    escapeValue: false,
  },
  debug: import.meta.env.DEV && false,
})

export default i18n
export { useTranslation } from 'react-i18next'
export { detectLanguage }
