import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import MarketingLayout, { APP_URL } from './MarketingLayout'

const FEATURES = [
  {
    category: 'Parish',
    color: 'bg-blue-500/10 border-blue-500/20',
    accent: 'text-blue-400',
    items: [
      { icon: '📢', title: 'Parish Feed', desc: 'Announcements, posts, and updates from your parish — straight to you, no algorithm.' },
      { icon: '📅', title: 'Events & RSVP', desc: 'See upcoming parish events, RSVP with one tap, and get push reminders.' },
      { icon: '🕐', title: 'Mass Times', desc: 'Always up-to-date Mass schedule for your parish, viewable by any follower.' },
      { icon: '🔔', title: 'Push Notifications', desc: 'No need to even open the app to stay up to date.' },
      { icon: '⛪', title: 'Parish Directory', desc: 'Find multiple local parishes and track all of their events.' },
      { icon: '🔗', title: 'Parish Clusters', desc: 'Multiple parishes under one pastoral name.' },
    ],
  },
  {
    category: 'Community',
    color: 'bg-emerald-500/10 border-emerald-500/20',
    accent: 'text-emerald-400',
    items: [
      { icon: '🤝', title: 'Groups', desc: 'Private groups linked to your parish or org — Men\'s group, young adults, prayer circles.' },
      { icon: '🏛', title: 'Organizations', desc: 'Knights of Columbus, FOCUS, Opus Dei, Civitas Dei — Catholic orgs alongside your parish.' },
      { icon: '💬', title: 'Direct Messages', desc: 'Message any parishioner or org member directly. No Facebook required.' },
      { icon: '🙏', title: 'Prayer Intentions', desc: 'Share intentions with your community. Tap "I\'ll pray" to intercede for others.' },
      { icon: '✉️', title: 'Parish Contact', desc: 'Send a direct message to your parish office from within the app.' },
      { icon: '👤', title: 'Profiles', desc: 'Public profiles showing vocation, parish, and community activity.' },
    ],
  },
  {
    category: 'Faith',
    color: 'bg-purple-500/10 border-purple-500/20',
    accent: 'text-purple-400',
    items: [
      { icon: '📖', title: 'Daily Readings', desc: 'Mass readings, liturgical season, and calendar for every day.' },
      { icon: '📔', title: 'Intention Tracker', desc: 'A private, encrypted space for your daily intentions.' },
      { icon: '🕊', title: 'Confession Tracker', desc: 'Track your last confession and how many days it\'s been.' },
      { icon: '🕯', title: 'Examination of Conscience', desc: 'A detailed examination of conscience easily accesible in the app.' },
      { icon: '', title: 'Morning Offering', desc: 'Get a push notification reminder to say a morning offering.' },
     ],
  },

  {
    category: 'Platform',
    color: 'bg-gray-500/10 border-gray-500/20',
    accent: 'text-gray-400',
    items: [
      { icon: '📱', title: 'PWA — No Download', desc: 'Add to your home screen on any device. Looks and feels native. No App Store required.' },
      { icon: '🌐', title: 'Bilingual (EN/ES)', desc: 'Full Spanish language support for the 36% of US Catholics who are Hispanic.' },
      { icon: '🔒', title: 'Private & Secure', desc: 'No ads. No data sold. Your content is only visible to the right community.' },
      { icon: '⚡', title: 'Real-Time', desc: 'Chat, notifications, and feeds update in real time via Supabase Realtime.' },
    ],
  },
]

export default function FeaturesPage() {
  useEffect(() => { document.title = 'Features — Communio' }, [])

  return (
    <MarketingLayout>

      {/* Hero */}
      <section className="bg-navy pt-32 pb-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-gold text-xs font-bold tracking-widest uppercase mb-4">Everything in One App</p>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Communio has everything you need<br />to keep your parish connected through the week.
          </h1>
          <p className="text-white/60 text-lg mb-8">
            Every feature is free for individual Catholics. Parishes subscribe to unlock admin tools.
          </p>
          <a href={APP_URL} className="inline-block bg-gold text-navy font-bold px-8 py-4 rounded-2xl hover:bg-gold/90 transition-colors">
            Try It Free
          </a>
        </div>
      </section>

      {/* Feature categories */}
      <section className="bg-cream py-16 px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          {FEATURES.map((cat, ci) => (
            <div key={ci}>
              <div className="flex items-center gap-3 mb-8">
                <div className={`inline-block border rounded-full px-4 py-1.5 text-sm font-bold ${cat.color} ${cat.accent}`}>
                  {cat.category}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {cat.items.map((f, fi) => (
                  <div key={fi} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-3">{f.icon}</div>
                    <h3 className="font-bold text-navy text-base mb-2">{f.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Ready to get started?</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={APP_URL} className="bg-gold text-navy font-bold px-8 py-4 rounded-2xl hover:bg-gold/90 transition-colors">
              Open the App Free
            </a>
            <Link to="/parishes" className="border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/5 transition-colors">
              Parish Pricing →
            </Link>
          </div>
        </div>
      </section>

    </MarketingLayout>
  )
}
