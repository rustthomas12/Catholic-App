import { Link } from 'react-router-dom'
import MarketingLayout, { APP_URL } from './MarketingLayout'
import Emblem from './Emblem'
import { Reveal, Medallion, PageHero, SectionHeading, Eyebrow, GoldButton, GhostButton, Ornament, RoseWindow } from './ui'
import { glowHandlers, d } from './motion'

const PILLARS = [
  { icon: 'cross', label: 'Faith-first', desc: 'Every product decision starts with one question: does this help Catholics live their faith?' },
  { icon: 'temple', label: 'Church-rooted', desc: 'We follow the rhythms of the liturgical calendar, the structure of the parish, and the wisdom of tradition.' },
  { icon: 'shield', label: 'Privacy-committed', desc: 'No ads. No data sold. No algorithm manipulation. Your spiritual life is not a product.' },
]

const FOUNDER = [
  { icon: 'cross', text: 'Practicing Catholic, Central Massachusetts' },
  { icon: 'family', text: 'Father of twins' },
  { icon: 'shield', text: 'Independent insurance professional' },
  { icon: 'quill', text: 'Built inFold solo using Claude Code' },
  { icon: 'pin', text: 'Parishioner who felt the isolation firsthand' },
]

const VALUES = [
  { title: 'The Church comes first', body: "Every feature, every decision, every line of code is measured against one standard: does this serve the Church? If it doesn't, we don't build it." },
  { title: 'Free means free', body: 'When we say inFold is free for individuals, we mean it. No premium tier, no paywalled rosary, no upsell on your confession tracker. Your faith is not a revenue stream.' },
  { title: 'Privacy is non-negotiable', body: 'Your prayer journal is private. Your confession dates are private. Your messages are private. A Catholic should be able to share their spiritual life without fear.' },
  { title: 'Parish first, platform second', body: 'inFold exists to strengthen the parish, not to replace it or compete with it. We measure success by how many Catholics are more connected to their local church.' },
]

export default function AboutPage() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Our Story"
        title="Built by a Catholic."
        accent="For the Church."
        sub="inFold began with one simple observation: Catholics leave Mass on Sunday and disappear into apps that have nothing to do with their faith for the rest of the week. We built the alternative."
      />

      {/* Mission */}
      <section className="bg-cream py-28 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <div className="rv"><Eyebrow className="!justify-start">Mission</Eyebrow></div>
            <h2 className="rv font-display font-semibold text-navy text-4xl md:text-6xl leading-[1.05] mt-4" style={d(1)}>
              Every Catholic connected to their parish. <span className="italic text-gold-deep">Every day.</span>
            </h2>
            <p className="rv drop-cap text-navy/65 text-lg leading-relaxed mt-8" style={d(2)}>
              The Church is the most important community in a Catholic&apos;s life, but for most people that community exists for
              one hour on Sunday. inFold exists to extend it into the rest of the week.
            </p>
            <p className="rv text-navy/65 text-lg leading-relaxed mt-5" style={d(3)}>
              We believe that when Catholics are genuinely connected to their parish (reading the same readings, praying for each
              other&apos;s intentions, attending the same events) they stay. inFold is that connection.
            </p>
          </Reveal>
          <Reveal className="space-y-5">
            {PILLARS.map((v, i) => (
              <div key={v.label} {...glowHandlers()} className="rv card-glow flex gap-5 items-start rounded-2xl bg-white border border-navy/[0.07] p-6 shadow-[0_14px_40px_-30px_rgba(27,42,74,.35)]" style={d(i, 130)}>
                <Medallion name={v.icon} size="w-14 h-14" icon="w-7 h-7" className="flex-shrink-0" style={d(i, 130)} />
                <div>
                  <p className="font-display text-2xl font-semibold text-navy">{v.label}</p>
                  <p className="text-navy/60 text-[15px] leading-relaxed mt-1">{v.desc}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Founder */}
      <section className="relative bg-navy-deep py-28 px-6 overflow-hidden">
        <div className="absolute -left-40 top-1/2 -translate-y-1/2 pointer-events-none">
          <RoseWindow className="w-[640px] h-[640px] text-gold/[0.07]" />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <SectionHeading light eyebrow="The Founder" title="Thomas Rust" sub="Founder & Builder" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-16 items-stretch">
            <Reveal className="lg:col-span-2">
              <div className="rv h-full rounded-3xl border border-gold/25 bg-white/[0.04] p-8">
                {FOUNDER.map((f, i) => (
                  <div key={f.text} className="rv flex items-center gap-4 py-3.5 border-b border-white/[0.07] last:border-0" style={d(i + 1)}>
                    <span className="emb-draw text-gold" style={d(i + 1)}><Emblem name={f.icon} className="w-6 h-6" /></span>
                    <span className="text-white/75 text-[15px]">{f.text}</span>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal className="lg:col-span-3">
              <figure className="rv h-full rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/[0.12] to-gold/[0.03] p-10 md:p-12 flex flex-col justify-center">
                <span className="font-display text-gold/40 text-8xl leading-none -mb-6" aria-hidden="true">“</span>
                <blockquote className="font-display italic text-white/90 text-2xl md:text-3xl leading-snug">
                  Right now, people leave Mass and disappear into their phones. inFold flips that, so the same device actually
                  brings them back into parish life during the week.
                </blockquote>
                <figcaption className="smallcaps text-gold mt-8">Thomas Rust</figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-cream py-28 px-6">
        <SectionHeading eyebrow="Our Values" title={<>What we <span className="italic text-gold-deep">stand for.</span></>} />
        <Reveal className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          {VALUES.map((v, i) => (
            <div key={v.title} {...glowHandlers()} className="rv card-glow rounded-2xl bg-white border border-navy/[0.07] p-9 shadow-[0_14px_40px_-30px_rgba(27,42,74,.35)]" style={d(i, 120)}>
              <p className="font-display italic text-gold text-4xl leading-none">{['I', 'II', 'III', 'IV'][i]}</p>
              <h3 className="font-display text-3xl font-semibold text-navy mt-4">{v.title}</h3>
              <p className="text-navy/60 text-[15px] leading-relaxed mt-3">{v.body}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* CTA */}
      <section className="bg-navy-deep py-28 px-6 text-center">
        <Reveal className="max-w-2xl mx-auto">
          <div className="rv flex justify-center"><Ornament className="w-56 text-gold/70" /></div>
          <p className="rv font-display italic text-gold/80 text-2xl mt-8" style={d(1)}>Pro Ecclesia. Pro Fide.</p>
          <h2 className="rv font-display font-semibold text-white text-5xl md:text-7xl mt-3" style={d(2)}>
            Join <span className="italic gilded">us.</span>
          </h2>
          <div className="rv flex flex-col sm:flex-row gap-4 justify-center mt-10" style={d(3)}>
            <GoldButton href={APP_URL}>Open inFold, Free</GoldButton>
            <GhostButton to="/contact" LinkComp={Link}>Get in Touch</GhostButton>
          </div>
        </Reveal>
      </section>
    </MarketingLayout>
  )
}
