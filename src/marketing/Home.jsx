import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import MarketingLayout, { APP_URL } from './MarketingLayout'

export default function MarketingHome() {
  useEffect(() => { document.title = 'Communio — The Digital Parish Hall' }, [])

  return (
    <MarketingLayout>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-24 bg-navy overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 25px 25px, white 1.5px, transparent 0)',
          backgroundSize: '50px 50px',
        }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/30 text-gold text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-8">
            ✝ Free for every Catholic · Always
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            The Digital<br /><span className="text-gold">Parish Hall.</span>
          </h1>
          <p className="text-white/65 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Communio connects Catholics with their parish, their faith, and each other —
            without algorithms, ads, or noise.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href={APP_URL} className="w-full sm:w-auto bg-gold text-navy text-base font-bold px-8 py-4 rounded-2xl hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20">
              Open the App — It's Free
            </a>
            <Link to="/parishes" className="w-full sm:w-auto border border-white/20 text-white text-sm font-semibold px-8 py-4 rounded-2xl hover:bg-white/5 transition-colors">
              Get Your Parish Set Up →
            </Link>
          </div>
          <p className="text-white/30 text-xs">Works on iPhone, Android & desktop · No download required</p>
        </div>

        <div className="relative mt-12 flex flex-wrap justify-center gap-2.5 max-w-2xl">
          {['⛪ Parish Feed','📖 Daily Readings','🤝 Groups','🏛 Organizations','🔔 Push Notifications','📿 Rosary Tracker','💬 Direct Messages','🙏 Prayer Intentions'].map((p,i) => (
            <span key={i} className="bg-white/5 border border-white/10 text-white/50 text-xs px-4 py-2 rounded-full">{p}</span>
          ))}
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">The Problem</p>
          <h2 className="text-3xl md:text-5xl font-black text-navy leading-tight mb-4">
            Your parish deserves better<br className="hidden md:block" /> than forgotten bulletins.
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-14">
            Bulletins go unread. Emails go to spam. Facebook buries parish posts behind cat videos.
            The infrastructure of Catholic community life is broken — and no one fixed it. Until now.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: '86%', label: 'of Catholic organizations feel unprepared for digital engagement', src: 'eCatholic 2025' },
              { stat: '4–6', label: 'disconnected tools pastors juggle every week just to communicate with their flock' },
              { stat: '30–50%', label: 'of Mass attendance lost since COVID — parishes are urgently looking for reconnection tools' },
            ].map((item, i) => (
              <div key={i} className="bg-lightbg rounded-2xl p-8">
                <div className="text-5xl font-black text-navy mb-4">{item.stat}</div>
                <p className="text-gray-500 text-sm leading-relaxed">{item.label}</p>
                {item.src && <p className="text-gray-400 text-xs mt-3">{item.src}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution overview ── */}
      <section className="bg-navy py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">The Solution</p>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
              Three layers. One app.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { icon: '⛪', title: 'Parish', desc: 'Announcements, events, Mass times, groups, and a community feed for every parish in America.' },
              { icon: '✝️', title: 'Faith', desc: 'Daily readings, saints, rosary & confession trackers, Liturgy of Hours, and formation programs.' },
              { icon: '🤝', title: 'Community', desc: 'Groups, organizations, prayer intentions, and direct messaging — the life of the parish, extended.' },
            ].map((p, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/8 transition-colors">
                <div className="text-4xl mb-4">{p.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{p.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link to="/features" className="inline-block border border-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm">
              See all features →
            </Link>
          </div>
        </div>
      </section>

      {/* ── For parishes strip ── */}
      <section className="bg-gold py-16 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-navy/60 text-xs font-bold uppercase tracking-widest mb-2">For Parishes</p>
            <h2 className="text-2xl md:text-4xl font-black text-navy leading-tight">
              Give your parishioners<br />a home during the week.
            </h2>
            <p className="text-navy/70 mt-3 max-w-md">
              Parish admin dashboard, push notifications, event RSVPs, parishioner directory, and more. Starting at $49/month with a 90-day free trial.
            </p>
          </div>
          <Link
            to="/parishes"
            className="flex-shrink-0 bg-navy text-white font-bold px-8 py-4 rounded-2xl hover:bg-navy/90 transition-colors whitespace-nowrap"
          >
            Learn More →
          </Link>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="bg-cream py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">Our Commitment</p>
          <h2 className="text-3xl md:text-5xl font-black text-navy leading-tight mb-12">
            No algorithm. No ads.<br />No data sold.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '🛡', title: 'Your Data Is Yours', desc: "We don't sell your information. Your prayer journal, confessions, and messages are private." },
              { icon: '✝', title: 'Mission First', desc: 'Built by a practicing Catholic, for the Church. Revenue comes from parishes — not from your attention.' },
              { icon: '📱', title: 'Always Free for Individuals', desc: "Every Catholic can use Communio forever, at no cost. No premium tier, no paywalled prayers." },
            ].map((v, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <div className="text-4xl mb-4">{v.icon}</div>
                <h3 className="font-bold text-navy text-lg mb-2">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-navy py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            Your parish community<br />is waiting.
          </h2>
          <p className="text-white/50 mb-10">Join thousands of Catholics already on Communio.</p>
          <a href={APP_URL} className="inline-block bg-gold text-navy font-bold px-10 py-4 rounded-2xl hover:bg-gold/90 transition-colors text-lg">
            Get Started — Free
          </a>
        </div>
      </section>

    </MarketingLayout>
  )
}
