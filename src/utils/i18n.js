import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import commonEn from '../locales/en/common.json'
import authEn from '../locales/en/auth.json'
import feedEn from '../locales/en/feed.json'
import faithEn from '../locales/en/faith.json'
import groupsEn from '../locales/en/groups.json'
import parishEn from '../locales/en/parish.json'
import premiumEn from '../locales/en/premium.json'
import adminEn from '../locales/en/admin.json'

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: commonEn,
      auth: authEn,
      feed: feedEn,
      faith: faithEn,
      groups: groupsEn,
      parish: parishEn,
      premium: premiumEn,
      admin: adminEn,
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'auth', 'feed', 'faith', 'groups', 'parish', 'premium', 'admin'],
  interpolation: {
    escapeValue: false, // React handles XSS
  },
  debug: import.meta.env.DEV && false,
})

export default i18n
export { useTranslation } from 'react-i18next'
