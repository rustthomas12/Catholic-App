// Tailwind for the marketing site only (src/marketing/marketing.css uses it
// through @config): scanning just the site's files keeps its stylesheet,
// which is inlined into every page, a fraction of the app's.
import base from './tailwind.config.js'

export default {
  ...base,
  content: ['./marketing.html', './src/marketing/**/*.{js,jsx}', './src/components/shared/Logo.jsx', './src/components/shared/Toast.jsx', './src/pages/PitchDeckPage.jsx'],
}
