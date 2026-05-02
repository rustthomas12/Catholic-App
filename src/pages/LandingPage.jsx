import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const APP_URL = 'https://app.getcommunio.app'

// ── Nav ────────────────────────────────────────────────────
function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-navy/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="text-white font-black text-xl tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
          Communio
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${APP_URL}/login`}
            className="text-white/70 hover:text-white text-sm font-medium transition-colors"
          >
            Sign In
          </a>
          <a
            href={`${APP_URL}/signup`}
            className="bg-gold text-navy text-sm font-bold px-4 py-2 rounded-xl hover:bg-gold/90 transition-colors"
          >
            Get Started Free
          </a>
        </div>
      </div>
    </nav>
  )
}

// ── Hero ───────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden bg-navy">
      {/* Background cross pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25px 25px, white 1px, transparent 0)',
          backgroundSize: '50px 50px',
        }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy/80" />

      <div className="relative max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-gold/20 border border-gold/30 text-gold text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-8">
          ✝ Free for every Catholic
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none mb-6" style={{ fontFamily: 'Georgia, serif' }}>
          The Digital<br />
          <span className="text-gold">Parish Hall.</span>
        </h1>
        <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Communio connects Catholics with their parish, their faith, and each other —
          without algorithms, ads, or noise. Your parish community, finally in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={APP_URL}
            className="w-full sm:w-auto bg-gold text-navy text-base font-bold px-8 py-4 rounded-2xl hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20"
          >
            Open the App — It's Free
          </a>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto text-white/70 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            See how it works ↓
          </a>
        </div>
        <p className="text-white/30 text-xs mt-6">
          Works on iPhone, Android, and desktop — no download required
        </p>
      </div>

      {/* Feature pills */}
      <div className="relative mt-16 flex flex-wrap justify-center gap-3 max-w-3xl">
        {[
          '⛪ Parish Feed', '📖 Daily Readings', '🤝 Groups', '🔔 Push Notifications',
          '✝ Saints Library', '📿 Rosary Tracker', '🗓 Liturgy of Hours', '💬 Direct Messages',
        ].map((pill, i) => (
          <span key={i} className="bg-white/5 border border-white/10 text-white/60 text-xs px-4 py-2 rounded-full">
            {pill}
          </span>
        ))}
      </div>
    </section>
  )
}

// ── Problem ────────────────────────────────────────────────
function Problem() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">The Problem</p>
          <h2 className="text-3xl md:text-5xl font-black text-navy leading-tight">
            Your parish deserves better than<br className="hidden md:block" />
            Facebook groups and forgotten bulletins.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              stat: '86%',
              label: 'of Catholic organizations feel unprepared for digital engagement',
              note: 'eCatholic 2025',
            },
            {
              stat: '4–6',
              label: 'disconnected tools pastors juggle weekly — email, Facebook, WhatsApp, bulletin, website',
              note: '',
            },
            {
              stat: '30–50%',
              label: 'Mass attendance lost during COVID that has not fully returned to parishes',
              note: '',
            },
          ].map((item, i) => (
            <div key={i} className="bg-lightbg rounded-2xl p-8 text-center">
              <div className="text-5xl font-black text-navy mb-4">{item.stat}</div>
              <p className="text-gray-600 text-sm leading-relaxed">{item.label}</p>
              {item.note && <p className="text-gray-400 text-xs mt-3">{item.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features ───────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: '⛪',
      title: 'Parish Community',
      desc: 'Follow your parish and see announcements, events, and posts in a feed made for Catholics — not engagement metrics.',
    },
    {
      icon: '📖',
      title: 'Daily Readings',
      desc: "Mass readings, the liturgical calendar, and the saint of the day — every morning, right on your home screen.",
    },
    {
      icon: '🤝',
      title: 'Groups',
      desc: "Men's groups, young adults, prayer circles — private groups linked to your parish or organization. No algorithm decides who sees what.",
    },
    {
      icon: '🏛',
      title: 'Organizations',
      desc: 'Knights of Columbus, FOCUS, Opus Dei, Civitas Dei — your Catholic organizations, all in one place alongside your parish.',
    },
    {
      icon: '🔔',
      title: 'Push Notifications',
      desc: 'Get notified about parish announcements, new posts, and events — without needing to check social media.',
    },
    {
      icon: '📿',
      title: 'Faith Trackers',
      desc: 'Rosary tracker, confession tracker, prayer journal, and the full Liturgy of Hours — tools for a deeper devotional life.',
    },
    {
      icon: '💬',
      title: 'Direct Messages',
      desc: 'Message other parishioners or organization members directly. Reach parish leaders without going through Facebook.',
    },
    {
      icon: '🙏',
      title: 'Prayer Intentions',
      desc: "Share and pray for intentions within your community. The 'I'll pray' button is the heart of Communio.",
    },
    {
      icon: '📱',
      title: 'Installable PWA',
      desc: 'Add to your home screen on iPhone or Android. Looks and feels like a native app — no App Store required.',
    },
  ]

  return (
    <section id="features" className="bg-navy py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">Everything in One App</p>
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
            Built for the way Catholics<br className="hidden md:block" />
            actually live their faith.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-7 hover:bg-white/8 transition-colors group">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-white font-bold text-lg mb-2 group-hover:text-gold transition-colors">{f.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How It Works ───────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Create your free account',
      body: 'Sign up with your email in under a minute. Choose your vocation, find your parish — you are in.',
    },
    {
      n: '02',
      title: 'Follow your parish',
      body: 'Search our national directory of 10,000+ Catholic parishes. Follow yours to see their feed, events, and groups.',
    },
    {
      n: '03',
      title: 'Join the community',
      body: 'Join groups, share prayer intentions, read the daily Mass readings, and stay connected to your parish all week long.',
    },
  ]
  return (
    <section id="how-it-works" className="bg-cream py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">Getting Started</p>
          <h2 className="text-3xl md:text-5xl font-black text-navy leading-tight">
            Up and running in three minutes.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-navy/10 z-0" style={{ width: 'calc(100% - 2rem)', left: '100%' }} />
              )}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 relative z-10">
                <div className="text-4xl font-black text-navy/10 mb-4 font-mono">{s.n}</div>
                <h3 className="font-bold text-navy text-lg mb-3">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <a
            href={`${APP_URL}/signup`}
            className="inline-block bg-navy text-white font-bold px-8 py-4 rounded-2xl hover:bg-navy/90 transition-colors"
          >
            Start Free — No Credit Card
          </a>
        </div>
      </div>
    </section>
  )
}

// ── For Parishes ───────────────────────────────────────────
function ForParishes() {
  const features = [
    'Parish admin dashboard',
    'Post announcements & events',
    'Edit Mass times',
    'Manage parishioner list',
    'Export CSV of parishioners',
    'Push notifications to followers',
    'Parish groups management',
    'RSVP tracking for events',
    'Contact messages from parishioners',
    'Parish cluster support',
    '90-day free trial',
  ]

  const tiers = [
    { label: 'Small', price: '$49', size: 'Under 200 parishioners' },
    { label: 'Medium', price: '$99', size: '200–500 parishioners', featured: true },
    { label: 'Large', price: '$199', size: '500–1,500 parishioners' },
    { label: 'Cathedral', price: '$349', size: '1,500+ parishioners' },
  ]

  return (
    <section id="for-parishes" className="bg-white py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">For Pastors & Parish Staff</p>
          <h2 className="text-3xl md:text-5xl font-black text-navy leading-tight">
            A complete platform for<br className="hidden md:block" />
            your parish community.
          </h2>
          <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">
            Replace scattered tools with one dashboard. Reach parishioners where they already are — on their phones.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Feature list */}
          <div className="bg-lightbg rounded-2xl p-8">
            <h3 className="font-bold text-navy text-lg mb-6">Everything a parish needs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-gold font-bold">✓</span> {f}
                </div>
              ))}
            </div>
            <div className="mt-8 bg-navy/5 border border-navy/10 rounded-xl p-4">
              <p className="text-navy text-sm font-semibold">Multi-parish clergy support</p>
              <p className="text-gray-500 text-xs mt-1">Pastors who serve multiple parishes can be set up as admin across all of them.</p>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Simple flat pricing · No per-seat fees</p>
            <div className="space-y-3">
              {tiers.map((t, i) => (
                <div key={i} className={`rounded-2xl border p-5 flex items-center justify-between ${
                  t.featured
                    ? 'bg-navy text-white border-navy'
                    : 'bg-white border-gray-100'
                }`}>
                  <div>
                    <p className={`font-bold ${t.featured ? 'text-gold' : 'text-navy'}`}>{t.label}</p>
                    <p className={`text-xs mt-0.5 ${t.featured ? 'text-white/60' : 'text-gray-400'}`}>{t.size}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black ${t.featured ? 'text-white' : 'text-navy'}`}>{t.price}</p>
                    <p className={`text-xs ${t.featured ? 'text-white/50' : 'text-gray-400'}`}>/month</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-xs mt-4 text-center">All plans include a 90-day free trial</p>
            <a
              href="mailto:hello@getcommunio.app?subject=Parish inquiry"
              className="mt-6 block text-center bg-gold text-navy font-bold px-6 py-3 rounded-2xl hover:bg-gold/90 transition-colors"
            >
              Contact Us to Get Started
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Faith Section ──────────────────────────────────────────
function FaithSection() {
  const tools = [
    { icon: '📖', title: 'Daily Readings', desc: 'Full USCCB readings and liturgical calendar, every day.' },
    { icon: '😇', title: "Saints of the Day", desc: 'Biography, feast day, patron causes, and prayer for every saint.' },
    { icon: '📿', title: 'Rosary Tracker', desc: 'Log your daily rosary. Track your streak.' },
    { icon: '📔', title: 'Prayer Journal', desc: 'Private journal for your intentions, reflections, and prayers.' },
    { icon: '🕊', title: 'Confession Tracker', desc: 'Track your last confession. Never lose count of the days.' },
    { icon: '🕯', title: 'Liturgy of Hours', desc: 'Morning, Evening, and Night Prayer — with psalms, canticles, and readings.' },
    { icon: '✝', title: 'Formation Programs', desc: 'Lent and Advent programs, daily reflections, and spiritual reading.' },
    { icon: '🙏', title: 'Prayer Intentions', desc: 'Share intentions with your community. Pray for others with one tap.' },
  ]

  return (
    <section className="bg-lightbg py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">Faith Tools</p>
          <h2 className="text-3xl md:text-5xl font-black text-navy leading-tight">
            Everything you need to<br className="hidden md:block" />
            live your faith daily.
          </h2>
          <p className="text-gray-500 text-base mt-4 max-w-xl mx-auto">
            All free. No subscription required. Built for the rhythms of Catholic life.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tools.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{t.icon}</div>
              <p className="font-bold text-navy text-sm mb-1">{t.title}</p>
              <p className="text-gray-400 text-xs leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── No Algorithm ───────────────────────────────────────────
function NoAlgorithm() {
  return (
    <section className="bg-navy py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="text-5xl mb-8">✝</div>
        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
          No algorithm.<br />
          <span className="text-gold">No ads. No data sold.</span>
        </h2>
        <p className="text-white/60 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
          Communio is not a social media platform. There is no feed ranking, no
          ad targeting, and no selling your attention to the highest bidder.
          Revenue comes from parishes — not from you.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          {[
            { icon: '🚫', label: 'No algorithm manipulation' },
            { icon: '🚫', label: 'No advertisements' },
            { icon: '🚫', label: 'No data sold to third parties' },
            { icon: '✅', label: 'Your data stays yours' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-white/70 text-sm">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA ────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="bg-gold py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-black text-navy leading-tight mb-4">
          Your parish community<br />is waiting for you.
        </h2>
        <p className="text-navy/70 text-lg mb-10">
          Free for every Catholic. Always.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={APP_URL}
            className="w-full sm:w-auto bg-navy text-white font-bold px-8 py-4 rounded-2xl hover:bg-navy/90 transition-colors shadow-lg"
          >
            Open Communio — Free
          </a>
          <a
            href="mailto:hello@getcommunio.app?subject=Parish inquiry"
            className="w-full sm:w-auto border-2 border-navy text-navy font-bold px-8 py-4 rounded-2xl hover:bg-navy/5 transition-colors"
          >
            Get Your Parish Set Up
          </a>
        </div>
        <p className="text-navy/50 text-sm mt-6">
          Works on iPhone, Android, and desktop · No download required · 90-day parish trial
        </p>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-navy border-t border-white/10 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <div className="text-white font-black text-xl mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              Communio
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              The digital parish hall. Connecting Catholics with their parish, their faith, and each other.
            </p>
            <p className="text-white/30 text-xs mt-4 italic">Pro Ecclesia. Pro Fide.</p>
          </div>
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">App</p>
            <div className="space-y-2">
              {[
                { label: 'Sign Up Free', href: `${APP_URL}/signup` },
                { label: 'Sign In', href: `${APP_URL}/login` },
                { label: 'Parish Directory', href: `${APP_URL}/directory` },
              ].map((l, i) => (
                <a key={i} href={l.href} className="block text-white/50 hover:text-white text-sm transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">Company</p>
            <div className="space-y-2">
              {[
                { label: 'For Parishes', href: '#for-parishes' },
                { label: 'Contact', href: 'mailto:hello@getcommunio.app' },
                { label: 'Privacy Policy', href: `${APP_URL}/privacy` },
                { label: 'Terms of Service', href: `${APP_URL}/terms` },
                { label: 'Content Policy', href: `${APP_URL}/policy` },
              ].map((l, i) => (
                <a key={i} href={l.href} className="block text-white/50 hover:text-white text-sm transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} Communio · getcommunio.app</p>
          <p className="text-white/20 text-xs">Built with ✝ in Massachusetts</p>
        </div>
      </div>
    </footer>
  )
}

// ── LandingPage ────────────────────────────────────────────
export default function LandingPage() {
  useEffect(() => { document.title = 'Communio — The Digital Parish Hall' }, [])

  return (
    <div className="font-sans">
      <LandingNav />
      <Hero />
      <Problem />
      <Features />
      <HowItWorks />
      <FaithSection />
      <ForParishes />
      <NoAlgorithm />
      <CTA />
      <Footer />
    </div>
  )
}
