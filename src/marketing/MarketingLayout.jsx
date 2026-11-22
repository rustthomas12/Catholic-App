import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Toaster } from '../components/shared/Toast'
import { LogoLockup } from '../components/shared/Logo'
import { Ornament, Reveal } from './ui'

export const APP_URL = 'https://app.getinfold.app'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/features' },
  { label: 'For Parishes', to: '/parishes' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  // The menu belongs to the page it was opened on, so navigating closes it
  const [openOn, setOpenOn] = useState(null)
  const mobileOpen = openOn === location.pathname
  const setMobileOpen = (fn) => setOpenOn(fn(mobileOpen) ? location.pathname : null)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const solid = scrolled || mobileOpen
  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        solid ? 'bg-navy-deep/95 backdrop-blur-xl border-b border-gold/15 shadow-[0_10px_40px_-20px_rgba(0,0,0,.6)]' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className={`max-w-6xl mx-auto px-6 flex items-center justify-between transition-all duration-500 ${solid ? 'py-3' : 'py-5'}`}>
        <Link to="/" className="flex items-center flex-shrink-0" aria-label="inFold home">
          <LogoLockup onDark className="h-9 w-auto" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              aria-current={location.pathname === l.to ? 'page' : undefined}
              className={`nav-link text-[15px] tracking-wide transition-colors ${
                location.pathname === l.to ? 'text-gold' : 'text-white/75 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-5">
          <a href={`${APP_URL}/login`} className="text-white/75 hover:text-white text-[15px] transition-colors">Sign In</a>
          <a href={APP_URL} className="btn-gold text-sm font-semibold px-5 py-2.5 rounded-full">Open App</a>
        </div>

        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden text-white p-2 -mr-2"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          <span className={`block w-6 h-px bg-current transition-transform duration-500 ${mobileOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
          <span className={`block w-6 h-px bg-current my-1.5 transition-opacity duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-px bg-current transition-transform duration-500 ${mobileOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
        </button>
      </div>

      <div className={`md:hidden grid transition-[grid-template-rows] duration-500 ease-out ${mobileOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-6 pb-8 pt-2">
            {NAV_LINKS.map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                className={`block py-3.5 font-display text-2xl border-b border-white/10 transition-all duration-500 ${
                  mobileOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'
                } ${location.pathname === l.to ? 'text-gold' : 'text-white/85'}`}
                style={{ transitionDelay: mobileOpen ? `${80 + i * 50}ms` : '0ms' }}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-6 flex flex-col gap-3">
              <a href={APP_URL} className="btn-gold text-center font-semibold py-3.5 rounded-full">Open the App — Free</a>
              <a href={`${APP_URL}/login`} className="text-center text-white/70 py-2">Sign In</a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export function MarketingFooter() {
  return (
    <footer className="relative bg-navy-deep text-white pt-20 pb-10 px-6 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="max-w-6xl mx-auto">
        <Reveal className="flex flex-col items-center text-center mb-16">
          <div className="rv"><LogoLockup onDark className="h-10 w-auto" /></div>
          <p className="rv font-display italic text-2xl md:text-3xl text-white/80 mt-6 max-w-xl" style={{ '--d': '100ms' }}>
            The digital parish hall, connecting Catholics with their parish, their faith, and each other.
          </p>
          <div className="rv mt-8" style={{ '--d': '200ms' }}><Ornament className="w-60 text-gold/60" /></div>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14 text-sm">
          <div>
            <p className="smallcaps text-gold mb-4">Site</p>
            <div className="space-y-2.5">
              {NAV_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className="block text-white/55 hover:text-white transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="smallcaps text-gold mb-4">App</p>
            <div className="space-y-2.5">
              {[
                { label: 'Sign Up Free', href: `${APP_URL}/signup` },
                { label: 'Sign In', href: `${APP_URL}/login` },
                { label: 'Parish Directory', href: `${APP_URL}/directory` },
              ].map((l) => (
                <a key={l.label} href={l.href} className="block text-white/55 hover:text-white transition-colors">{l.label}</a>
              ))}
            </div>
          </div>
          <div>
            <p className="smallcaps text-gold mb-4">Legal</p>
            <div className="space-y-2.5">
              <a href={`${APP_URL}/privacy`} className="block text-white/55 hover:text-white transition-colors">Privacy Policy</a>
              <a href={`${APP_URL}/terms`} className="block text-white/55 hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
          <div>
            <p className="smallcaps text-gold mb-4">Contact</p>
            <a href="mailto:info@getinfold.app" className="block text-white/55 hover:text-white transition-colors">info@getinfold.app</a>
            <p className="text-white/35 mt-2.5">Built in Massachusetts</p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-white/30">© {new Date().getFullYear()} inFold · getinfold.app</p>
          <p className="font-display italic text-sm text-gold/60 tracking-wide">Pro Ecclesia · Pro Fide</p>
        </div>
      </div>
    </footer>
  )
}

export default function MarketingLayout({ children }) {
  return (
    <div className="font-sans bg-cream">
      <Toaster />
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}
