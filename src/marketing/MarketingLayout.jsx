import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

export const APP_URL = 'https://app.getcommunio.app'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/features' },
  { label: 'For Parishes', to: '/parishes' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled || mobileOpen ? 'bg-navy shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-white font-black text-xl tracking-tight flex-shrink-0" style={{ fontFamily: 'Georgia, serif' }}>
          Communio
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === l.to ? 'text-gold' : 'text-white/70 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-3">
          <a href={`${APP_URL}/login`} className="text-white/70 hover:text-white text-sm font-medium transition-colors">
            Sign In
          </a>
          <a href={APP_URL} className="bg-gold text-navy text-sm font-bold px-4 py-2 rounded-xl hover:bg-gold/90 transition-colors">
            Open App
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="md:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          <div className={`w-5 h-0.5 bg-white mb-1 transition-transform ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
          <div className={`w-5 h-0.5 bg-white mb-1 transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
          <div className={`w-5 h-0.5 bg-white transition-transform ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-navy border-t border-white/10 px-6 pb-6 space-y-1">
          {NAV_LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`block py-3 text-sm font-medium border-b border-white/5 ${
                location.pathname === l.to ? 'text-gold' : 'text-white/70'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-4 flex flex-col gap-3">
            <a href={`${APP_URL}/login`} className="text-center text-white/70 text-sm py-2">Sign In</a>
            <a href={APP_URL} className="text-center bg-gold text-navy font-bold py-3 rounded-xl text-sm">
              Open App — Free
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}

export function MarketingFooter() {
  return (
    <footer className="bg-navy border-t border-white/10 py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-2">
            <div className="text-white font-black text-xl mb-3" style={{ fontFamily: 'Georgia, serif' }}>Communio</div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              The digital parish hall. Connecting Catholics with their parish, their faith, and each other.
            </p>
            <p className="text-white/25 text-xs mt-4 italic">Pro Ecclesia. Pro Fide.</p>
          </div>

          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Site</p>
            <div className="space-y-2.5">
              {NAV_LINKS.map(l => (
                <Link key={l.to} to={l.to} className="block text-white/50 hover:text-white text-sm transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">App</p>
            <div className="space-y-2.5">
              {[
                { label: 'Sign Up Free', href: `${APP_URL}/signup` },
                { label: 'Sign In', href: `${APP_URL}/login` },
                { label: 'Parish Directory', href: `${APP_URL}/directory` },
                { label: 'Privacy Policy', href: `${APP_URL}/privacy` },
                { label: 'Terms of Service', href: `${APP_URL}/terms` },
              ].map((l, i) => (
                <a key={i} href={l.href} className="block text-white/50 hover:text-white text-sm transition-colors">{l.label}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} Communio · getcommunio.app</p>
          <div className="flex items-center gap-4">
            <a href="mailto:hello@getcommunio.app" className="text-white/30 hover:text-white/60 text-xs transition-colors">hello@getcommunio.app</a>
            <span className="text-white/10">·</span>
            <p className="text-white/20 text-xs">Built with ✝ in Massachusetts</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function MarketingLayout({ children }) {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return (
    <div className="font-sans">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}
