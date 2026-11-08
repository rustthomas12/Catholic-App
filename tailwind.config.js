/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1B2A4A',
        gold: '#C9A84C',
        // Brand kit (brand/README.md); also CSS variables in index.css
        brand: { blue: 'var(--brand-blue)', navy: 'var(--brand-navy)', ink: 'var(--brand-ink)' },
        cream: '#FAF7F2',
        lightbg: '#F0EDE8',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
