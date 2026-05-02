import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import MarketingLayout, { APP_URL } from './MarketingLayout'

export default function AboutPage() {
  useEffect(() => { document.title = 'About Us — Communio' }, [])

  return (
    <MarketingLayout>

      {/* Hero */}
      <section className="bg-navy pt-32 pb-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-gold text-xs font-bold tracking-widest uppercase mb-4">Our Story</p>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            Built by a Catholic.<br /><span className="text-gold">For the Church.</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Communio started with one simple observation: Catholics leave Mass on Sunday and disappear
            into the same apps that have nothing to do with their faith for the rest of the week.
            We built the alternative.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">Mission</p>
            <h2 className="text-3xl md:text-4xl font-black text-navy leading-tight mb-5">
              Every Catholic connected to their parish. Every day.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-5">
              The Church is the most important community in a Catholic's life — but for most people,
              that community only exists for one hour on Sunday. Communio exists to extend it
              into the rest of the week.
            </p>
            <p className="text-gray-500 leading-relaxed">
              We believe that when Catholics are genuinely connected to their parish — reading the same
              readings, praying for each other's intentions, attending the same events — they stay.
              Communio is that connection.
            </p>
          </div>
          <div className="space-y-5">
            {[
              { icon: '✝', label: 'Faith-first', desc: 'Every product decision starts with one question: does this help Catholics live their faith?' },
              { icon: '🏛', label: 'Church-rooted', desc: 'We follow the rhythms of the liturgical calendar, the structure of the parish, and the wisdom of tradition.' },
              { icon: '🛡', label: 'Privacy-committed', desc: 'No ads. No data sold. No algorithm manipulation. Your spiritual life is not a product.' },
            ].map((v, i) => (
              <div key={i} className="flex gap-4 bg-lightbg rounded-2xl p-5">
                <span className="text-2xl flex-shrink-0">{v.icon}</span>
                <div>
                  <p className="font-bold text-navy text-sm mb-1">{v.label}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="bg-navy py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">The Founder</p>
            <h2 className="text-3xl md:text-4xl font-black text-white">Thomas Rust</h2>
            <p className="text-gold mt-1">Founder & Builder</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="space-y-4">
                {[
                  { icon: '✝️', text: 'Practicing Catholic, Central Massachusetts' },
                  { icon: '👨‍👧‍👦', text: 'Father of twins' },
                  { icon: '💼', text: 'Independent insurance professional' },
                  { icon: '💻', text: 'Built Communio solo using Claude Code' },
                  { icon: '📍', text: 'Parishioner — felt the isolation firsthand' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="text-xl">{f.icon}</span>
                    <span className="text-white/70 text-sm">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <blockquote className="bg-gold/10 border border-gold/30 rounded-2xl p-8">
                <p className="text-amber-100/90 text-lg leading-relaxed italic">
                  "Right now, people leave Mass and disappear into their phones.
                  Communio flips that — so the same device actually brings them
                  back into parish life during the week."
                </p>
                <p className="text-gold text-sm font-semibold mt-4">— Thomas Rust</p>
              </blockquote>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Built on</p>
                <div className="flex flex-wrap gap-2">
                  {['React', 'Supabase', 'Vercel', 'Claude Code', 'Tailwind CSS'].map((t, i) => (
                    <span key={i} className="bg-white/10 text-white/60 text-xs px-3 py-1 rounded-full">{t}</span>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm">
                  <span className="text-white/40">Monthly infrastructure cost</span>
                  <span className="text-emerald-400 font-bold">$0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-cream py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">Our Values</p>
            <h2 className="text-3xl md:text-4xl font-black text-navy">What we stand for.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                title: 'The Church comes first',
                body: "Every feature, every decision, every line of code is evaluated against one standard: does this serve the Church? If it doesn't, we don't build it.",
              },
              {
                title: 'Free means free',
                body: "When we say Communio is free for individuals, we mean it. No premium tier, no paywalled rosary, no upsell on your confession tracker. Your faith is not a revenue stream.",
              },
              {
                title: 'Privacy is non-negotiable',
                body: "Your prayer journal is private. Your confession dates are private. Your messages are private. We built Communio so that a Catholic can share their spiritual life without fear.",
              },
              {
                title: 'Parish first, platform second',
                body: "Communio exists to strengthen the parish — not to replace it or compete with it. We measure success by how many Catholics are more connected to their local church.",
              },
            ].map((v, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <h3 className="font-black text-navy text-lg mb-3">"{v.title}"</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-white/40 italic text-lg mb-4">Pro Ecclesia. Pro Fide.</p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">Join us.</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={APP_URL} className="bg-gold text-navy font-bold px-8 py-4 rounded-2xl hover:bg-gold/90 transition-colors">
              Open Communio Free
            </a>
            <Link to="/contact" className="border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/5 transition-colors">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

    </MarketingLayout>
  )
}
