import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MarketingLayout, { APP_URL } from './MarketingLayout'
import { Reveal, Medallion, PageHero, GoldButton, GhostButton, Ornament, Arrow } from './ui'
import { glowHandlers, d } from './motion'

const FEATURES = [
  {
    id: 'parish', numeral: 'I', category: 'Parish',
    blurb: 'Everything happening at your parish, in one place.',
    items: [
      { icon: 'herald', title: 'Parish Feed', desc: 'Announcements, posts, and updates from your parish.' },
      { icon: 'calendar', title: 'Events & RSVP', desc: 'See upcoming parish events, RSVP with one tap, and get reminders.' },
      { icon: 'clock', title: 'Mass Times', desc: 'An always up-to-date Mass schedule for your parish, viewable by any follower.' },
      { icon: 'bell', title: 'Push Notifications', desc: 'Notifications for announcements and events, delivered to your phone.' },
      { icon: 'church', title: 'Parish Directory', desc: 'Find your parish among the 558 Massachusetts parishes in the directory.' },
      { icon: 'links', title: 'Parish Clusters', desc: 'Multiple parishes under one pastoral name (e.g. Carlo Acutis Parish), shown together.' },
    ],
  },
  {
    id: 'community', numeral: 'II', category: 'Community',
    blurb: 'The friendships of parish life, carried through the week.',
    items: [
      { icon: 'fellowship', title: 'Groups', desc: "Public or private groups linked to your parish or organization: men's group, young adults, prayer circles." },
      { icon: 'temple', title: 'Organizations', desc: 'Catholic organizations, such as councils, ministries, and apostolates, can have their own page and members alongside your parish.' },
      { icon: 'letter', title: 'Direct Messages', desc: 'Message any parishioner or organization member directly. No Facebook required.' },
      { icon: 'candle', title: 'Prayer Intentions', desc: 'Share intentions with your community. Tap "I\'ll pray" to intercede for others.' },
      { icon: 'quill', title: 'Parish Contact', desc: 'Send a message to your parish office from within the app.' },
      { icon: 'cameo', title: 'Profiles', desc: 'Profiles showing vocation, parish, and community activity.' },
    ],
  },
  {
    id: 'faith', numeral: 'III', category: 'Faith',
    blurb: 'Daily prayer and preparation, kept close and kept private.',
    items: [
      { icon: 'book', title: 'Daily Readings', desc: "The day's Mass readings with the liturgical season and feast, plus a link to the official USCCB text." },
      { icon: 'sunrise', title: 'Morning Offering', desc: 'Offer your day to God before it begins. Four classic prayers, including the traditional Apostleship of Prayer offering.' },
      { icon: 'lamp', title: 'Examination of Conscience', desc: 'A guided examination across the Ten Commandments and the Precepts of the Church, to prepare well for Confession.' },
      { icon: 'keys', title: 'Confession Tracker', desc: "Track your last confession and how many days it's been. Completely private." },
      { icon: 'crown', title: 'Saints', desc: 'The saint of the day, with a life and feast for each.' },
    ],
  },
  {
    id: 'admin', numeral: 'IV', category: 'For Parish Staff',
    blurb: 'Tools for pastors and staff, included in every parish plan.',
    items: [
      { icon: 'ledger', title: 'Admin Dashboard', desc: 'A full parish dashboard: parishioners, posts, events, messages, and billing.' },
      { icon: 'register', title: 'Parishioner List', desc: 'See who follows your parish with name, vocation, and join date. Export to CSV.' },
      { icon: 'megaphone', title: 'Announcements', desc: 'Announcements reach every follower directly, with no algorithm in the way.' },
      { icon: 'calendar', title: 'Event Management', desc: 'Create events, track RSVPs, and view attendee breakdowns.' },
      { icon: 'hourglass', title: 'Scheduled Posts', desc: 'Write posts in advance and schedule them to publish automatically.' },
      { icon: 'spires', title: 'Multi-Parish Clergy', desc: 'Pastors serving several parishes can be admin of each one.' },
    ],
  },
  {
    id: 'platform', numeral: 'V', category: 'Platform',
    blurb: 'Quietly well made, on every device.',
    items: [
      { icon: 'phone', title: 'Every Device', desc: 'Works in the browser on iPhone, Android, and computers, all from one account. App Store and Google Play apps are on the way.' },
      { icon: 'orb', title: 'Bilingual (EN/ES)', desc: 'The app in Spanish too, for the more than one in three US Catholics who are Hispanic. Scripture readings are in English for now.' },
      { icon: 'shield', title: 'Private & Secure', desc: 'No ads. No data sold. Your content is only visible to the right community.' },
      { icon: 'flame', title: 'Real-Time', desc: 'Chat, notifications, and feeds update the moment something happens.' },
    ],
  },
]

/* Sticky category bar that follows the reader down the page */
function CategoryNav() {
  const [active, setActive] = useState(FEATURES[0].id)
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' }
    )
    FEATURES.forEach((c) => { const el = document.getElementById(c.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])
  return (
    <div className="sticky top-[64px] z-30 bg-cream/95 md:bg-cream/85 md:backdrop-blur-lg border-b border-navy/[0.06]">
      <div className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto py-3" style={{ scrollbarWidth: 'none' }}>
        {FEATURES.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            onClick={(e) => { e.preventDefault(); document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth' }) }}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-all duration-500 ${
              active === c.id ? 'bg-navy text-white shadow-sm' : 'text-navy/60 hover:text-navy hover:bg-navy/5'
            }`}
          >
            <span className="font-display italic mr-1.5 opacity-70">{c.numeral}.</span>{c.category}
          </a>
        ))}
      </div>
    </div>
  )
}

export default function FeaturesPage() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Everything in One App"
        title="Everything your parish needs"
        accent="through the week."
        sub="Every feature is free for individual Catholics. Parishes subscribe to unlock the admin tools."
      >
        <GoldButton href={APP_URL}>Try It Free</GoldButton>
      </PageHero>

      <CategoryNav />

      <div className="bg-cream px-6 pb-12">
        {FEATURES.map((cat) => (
          <section key={cat.id} id={cat.id} className="max-w-6xl mx-auto pt-24 scroll-mt-28">
            <Reveal className="flex flex-col md:flex-row md:items-end gap-4 md:gap-10 mb-12">
              <span className="rv font-display italic text-gold text-7xl md:text-8xl leading-none">{cat.numeral}</span>
              <div className="rv" style={d(1)}>
                <h2 className="font-display font-semibold text-navy text-4xl md:text-5xl">{cat.category}</h2>
                <p className="text-navy/55 text-lg mt-2">{cat.blurb}</p>
              </div>
              <div className="rv hidden md:block flex-1 h-px bg-gradient-to-r from-gold/50 to-transparent mb-4" style={d(2)} />
            </Reveal>
            <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cat.items.map((f, i) => (
                <div
                  key={f.title}
                  {...glowHandlers()}
                  className="rv card-glow rounded-2xl bg-white border border-navy/[0.07] p-7 shadow-[0_14px_40px_-28px_rgba(27,42,74,.35)] hover:border-gold/40"
                  style={d(i, 80)}
                >
                  <Medallion name={f.icon} size="w-14 h-14" icon="w-7 h-7" style={d(i, 80)} />
                  <h3 className="font-display text-2xl font-semibold text-navy mt-5">{f.title}</h3>
                  <p className="text-navy/60 text-[15px] leading-relaxed mt-2">{f.desc}</p>
                </div>
              ))}
            </Reveal>
          </section>
        ))}
      </div>

      <section className="bg-navy-deep py-28 px-6 text-center">
        <Reveal className="max-w-2xl mx-auto">
          <div className="rv flex justify-center"><Ornament className="w-56 text-gold/70" /></div>
          <h2 className="rv font-display font-semibold text-white text-5xl md:text-6xl mt-8" style={d(1)}>
            Ready to <span className="italic gilded">begin?</span>
          </h2>
          <div className="rv flex flex-col sm:flex-row gap-4 justify-center mt-10" style={d(2)}>
            <GoldButton href={APP_URL}>Open the App, Free</GoldButton>
            <GhostButton to="/parishes" LinkComp={Link}>Parish Pricing <Arrow /></GhostButton>
          </div>
        </Reveal>
      </section>
    </MarketingLayout>
  )
}
