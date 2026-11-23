import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import MarketingLayout, { APP_URL } from './MarketingLayout'
import Emblem from './Emblem'
import { Reveal, RisingWords, Eyebrow, Ornament, Medallion, SectionHeading, RoseWindow, Motes, GoldButton, GhostButton, Arrow } from './ui'
import { d, glowHandlers, reduceMotion, useParallax } from './motion'

const CHIPS = [
  ['church', 'Parish Feed'], ['book', 'Daily Readings'], ['sunrise', 'Morning Offering'], ['lamp', 'Examination'],
  ['fellowship', 'Groups'], ['keys', 'Confession Tracker'], ['bell', 'Notifications'], ['candle', 'Prayer Requests'],
]

const LAYERS = [
  { icon: 'church', numeral: 'I', title: 'Parish', desc: 'Announcements, events, Mass times, parish groups, and a community feed for your parish.' },
  { icon: 'chalice', numeral: 'II', title: 'Faith', desc: 'Daily readings, saints, a private confession tracker, and prayer requests.' },
  { icon: 'fellowship', numeral: 'III', title: 'Community', desc: 'Events with RSVP, groups, parish updates, and direct messages: the life of the parish, extended.' },
]

const PROBLEMS = [
  { icon: 'scroll', title: 'Bulletins go unread', desc: 'Folded in a pew, left in the car, recycled by Tuesday.' },
  { icon: 'letter', title: 'Emails go to spam', desc: 'Lost between receipts and newsletters, if they arrive at all.' },
  { icon: 'herald', title: 'Social media is built for engagement', desc: 'Its feeds are tuned to keep people scrolling, not to build community.' },
]

const VALUES = [
  { icon: 'shield', title: 'Your data is yours', desc: "We don't sell your information. Your confession tracker and your messages are private." },
  { icon: 'cross', title: 'Mission first', desc: 'Built by a practicing Catholic, for the Church. Revenue comes from parishes, not from your attention.' },
  { icon: 'lily', title: 'Always free for individuals', desc: 'Every Catholic can use inFold forever, at no cost. No premium tier, no paywalled prayers.' },
]

function Hero() {
  const roseRef = useRef(null)
  useParallax(roseRef, 0.3)
  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 overflow-hidden bg-navy-deep">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 38%, #26406f 0%, #18284f 42%, #0E1830 100%)' }} />
      <div className="rays absolute inset-0" />
      <div ref={roseRef} className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <RoseWindow className="w-[760px] h-[760px] md:w-[1040px] md:h-[1040px] shrink-0 text-gold/[0.16]" />
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 42%, rgba(14,24,48,.0) 0%, rgba(14,24,48,.55) 38%, rgba(14,24,48,0) 60%)' }} />
      <Motes />

      <div className="relative max-w-5xl mx-auto">
        <div className="fade-in" style={d(0, 0, 100)}><Eyebrow light>Pro Ecclesia · Pro Fide</Eyebrow></div>
        <h1 className="font-display font-semibold text-white text-[3.4rem] leading-[0.98] sm:text-7xl md:text-8xl lg:text-[7.5rem] mt-7">
          <RisingWords text="The Digital" base={250} step={110} />
          <br />
          <span className="italic font-medium"><RisingWords text="Parish Hall" base={480} step={110} className="gilded pr-2" /></span>
        </h1>
        <p className="fade-in text-white/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mt-8" style={d(0, 0, 900)}>
          inFold connects Catholics with their parish, their faith, and each other, without algorithms, ads, or noise.
        </p>
        <div className="fade-in flex flex-col sm:flex-row items-center justify-center gap-4 mt-11" style={d(0, 0, 1100)}>
          <GoldButton href={APP_URL} className="w-full sm:w-auto">Open the Free App</GoldButton>
          <GhostButton to="/parishes" LinkComp={Link} className="w-full sm:w-auto">Set Up Your Parish <Arrow /></GhostButton>
        </div>
        <p className="fade-in text-white/40 text-sm mt-6 tracking-wide" style={d(0, 0, 1250)}>Works on any phone or computer · Free for every Catholic</p>
      </div>

      <div className="relative mt-16 flex flex-wrap justify-center gap-2.5 max-w-3xl">
        {CHIPS.map(([icon, label], i) => (
          <span key={label} className="fade-in inline-flex items-center gap-2 rounded-full border border-gold/20 bg-white/[0.04] px-4 py-2 text-[13px] text-white/70" style={d(i, 70, 1400)}>
            <Emblem name={icon} className="w-4 h-4 text-gold" strokeWidth={2.4} />{label}
          </span>
        ))}
      </div>

      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 fade-in" style={d(0, 0, 2200)} aria-hidden="true">
        <div className="w-px h-14 bg-white/15 overflow-hidden"><div className="scroll-cue w-px h-6 bg-gradient-to-b from-transparent via-gold to-transparent" /></div>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section className="bg-cream py-28 px-6">
      <SectionHeading
        eyebrow="The Problem"
        title={<>Your parish deserves better <span className="italic text-gold-deep">ways to stay in touch.</span></>}
        sub="Sunday is wonderful. Then the week begins, and the parish goes quiet."
      />
      <Reveal className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
        {PROBLEMS.map((p, i) => (
          <div key={p.title} className="rv text-center px-6 py-10 rounded-2xl bg-white/70 border border-navy/[0.06]" style={d(i, 140)}>
            <span className="emb-draw inline-block text-navy/40" style={d(i, 140)}><Emblem name={p.icon} className="w-12 h-12" strokeWidth={1.5} /></span>
            <h3 className="font-display text-2xl font-semibold text-navy mt-5">{p.title}</h3>
            <p className="text-navy/55 text-[15px] leading-relaxed mt-2">{p.desc}</p>
          </div>
        ))}
      </Reveal>
    </section>
  )
}

function Layers() {
  return (
    <section className="relative bg-navy py-28 px-6 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #E8D59A 1px, transparent 0)', backgroundSize: '28px 28px' }} />
      <div className="relative">
        <SectionHeading light eyebrow="The Solution" title={<>Three layers. <span className="italic gilded">One app.</span></>} />
        <Reveal className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-7 mt-16">
          {LAYERS.map((l, i) => (
            <div
              key={l.title}
              {...glowHandlers()}
              className="rv card-glow arch border border-gold/25 bg-gradient-to-b from-white/[0.06] to-white/[0.015] px-8 pt-14 pb-10 text-center hover:border-gold/50"
              style={d(i, 150)}
            >
              <Medallion name={l.icon} size="w-20 h-20" icon="w-10 h-10" className="mx-auto" style={d(i, 150)} />
              <p className="font-display italic text-gold/70 text-lg mt-6">{l.numeral}</p>
              <h3 className="font-display text-3xl font-semibold text-white mt-1">{l.title}</h3>
              <p className="text-white/60 text-[15px] leading-relaxed mt-4">{l.desc}</p>
            </div>
          ))}
        </Reveal>
        <Reveal className="text-center mt-14">
          <div className="rv"><GhostButton to="/features" LinkComp={Link}>See every feature <Arrow /></GhostButton></div>
        </Reveal>
      </div>
    </section>
  )
}

/* A phone where the parish's week arrives, card by card */
function PhoneShowcase() {
  const cards = [
    { kind: 'Announcement', from: 'St. Patrick Parish', icon: 'herald', text: 'Adoration moves to the chapel this Thursday, 7–8pm. All are welcome.' },
    { kind: 'Event', from: 'Young Adults', icon: 'calendar', text: 'Theology on Tap · Friday 7pm · 14 going' },
    { kind: 'Prayer request', from: 'Maria G.', icon: 'candle', text: 'Please pray for my father, who has surgery tomorrow morning.', pray: 23 },
    { kind: 'Daily readings', from: 'Memorial of St. Cecilia', icon: 'book', text: '“Blessed are they who hear the word of God, and keep it.”' },
  ]
  // 0: empty → 1: notification → 2..5: cards arrive → hold → clear, repeat
  const [step, setStep] = useState(0) // reduced motion: CSS shows every card
  const phoneRef = useRef(null)
  useEffect(() => {
    if (reduceMotion()) return
    let timer, visible = false
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    if (phoneRef.current) io.observe(phoneRef.current)
    const durations = [900, 1500, 1200, 1200, 1200, 4200]
    const advance = (s) => {
      timer = setTimeout(() => {
        const next = visible ? (s + 1) % durations.length : s
        setStep(next)
        advance(next)
      }, durations[s])
    }
    advance(0)
    return () => { clearTimeout(timer); io.disconnect() }
  }, [])
  return (
    <section className="bg-cream py-28 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <div className="rv"><Eyebrow className="!justify-start">During the Week</Eyebrow></div>
          <h2 className="rv font-display font-semibold text-navy text-4xl md:text-6xl leading-[1.05] mt-4" style={d(1)}>
            The parish, <span className="italic text-gold-deep">in their pocket.</span>
          </h2>
          <p className="rv text-navy/60 text-lg leading-relaxed mt-6 max-w-lg" style={d(2)}>
            Announcements from the pastor go straight to parishioners&apos; phones. Events, prayer requests, and the day&apos;s readings
            sit together in one calm feed, with no ads and nothing designed to keep people scrolling.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              ['bell', 'Announcements arrive as a notification, never buried by an algorithm'],
              ['moon', 'Quiet by design: at most five parish notifications a day'],
              ['keys', 'Your confession tracker stays private, always'],
            ].map(([icon, t], i) => (
              <li key={t} className="rv flex items-start gap-4" style={d(i + 3)}>
                <Medallion name={icon} size="w-11 h-11" icon="w-5 h-5" className="flex-shrink-0" style={d(i + 3)} />
                <span className="text-navy/75 pt-2.5">{t}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="flex justify-center">
          <div ref={phoneRef} className="rv rv-scale relative">
            <div className="absolute -inset-16 rounded-full blur-3xl opacity-60" style={{ background: 'radial-gradient(circle, rgba(201,168,76,.35), transparent 65%)' }} />
            <div className="relative w-[300px] h-[610px] rounded-[48px] bg-navy-deep p-3 shadow-[0_40px_80px_-30px_rgba(14,24,48,.6)] ring-1 ring-gold/30">
              <div className="relative h-full w-full rounded-[38px] bg-cream overflow-hidden">
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-navy-deep z-20" />
                <div data-on={step >= 1 && step <= 2} className="notif absolute top-11 inset-x-3 z-10 rounded-2xl bg-white/95 backdrop-blur shadow-lg p-3 flex gap-3 items-center">
                  <span className="w-9 h-9 rounded-xl bg-navy grid place-items-center text-gold"><Emblem name="church" className="w-5 h-5" strokeWidth={2.4} /></span>
                  <div className="text-left min-w-0">
                    <p className="text-[11px] font-semibold text-navy">St. Patrick Parish</p>
                    <p className="text-[11px] text-navy/60 truncate">Adoration moves to the chapel this Thursday…</p>
                  </div>
                </div>
                <div className="pt-12 px-4">
                  <p className="font-display text-2xl font-semibold text-navy">Home</p>
                  <p className="text-[11px] text-gold-deep smallcaps !tracking-[.15em] mt-0.5">Ordinary Time</p>
                </div>
                <div className="px-3 mt-3 space-y-2.5">
                  {cards.map((c, i) => (
                    <div key={c.kind} data-on={step >= 2 + i} className="feed-card rounded-2xl bg-white border border-navy/[0.06] p-3.5 text-left shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gold-deep"><Emblem name={c.icon} className="w-4 h-4" strokeWidth={2.4} /></span>
                        <span className="text-[10px] smallcaps !tracking-[.14em] text-gold-deep">{c.kind}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-navy mt-1.5">{c.from}</p>
                      <p className={`text-[12px] leading-snug mt-0.5 ${c.kind === 'Daily readings' ? 'font-display italic text-[14px] text-navy/80' : 'text-navy/70'}`}>{c.text}</p>
                      {c.pray && <p className="text-[10px] text-gold-deep mt-2 font-semibold">I&apos;ll pray · {c.pray}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function ParishBand() {
  return (
    <section className="relative overflow-hidden py-24 px-6" style={{ background: 'linear-gradient(120deg, #B8973F 0%, #D9BC66 45%, #C9A84C 100%)' }}>
      <div className="absolute -right-24 top-1/2 -translate-y-1/2 opacity-[0.12] pointer-events-none">
        <RoseWindow className="w-[520px] h-[520px] text-navy-deep" />
      </div>
      <Reveal className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
        <div>
          <p className="rv smallcaps text-navy/70">For Parishes</p>
          <h2 className="rv font-display font-semibold text-navy-deep text-4xl md:text-5xl leading-tight mt-3" style={d(1)}>
            Keep your parishioners close <span className="italic">all week long.</span>
          </h2>
          <p className="rv text-navy/75 mt-4 max-w-lg text-lg" style={d(2)}>
            Admin dashboard, push announcements, event RSVPs, and more. From $59 a month, with a 90-day free trial.
          </p>
        </div>
        <div className="rv flex-shrink-0" style={d(3)}>
          <Link to="/parishes" className="btn-ghost inline-flex items-center gap-2 bg-navy-deep text-white font-semibold px-8 py-4 rounded-full hover:bg-navy">
            Learn More <Arrow />
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

function Values() {
  return (
    <section className="bg-cream py-28 px-6">
      <SectionHeading eyebrow="Our Commitment" title={<>No algorithm. No ads. <span className="italic text-gold-deep">No data sold.</span></>} />
      <Reveal className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-7 mt-16">
        {VALUES.map((v, i) => (
          <div key={v.title} {...glowHandlers()} className="rv card-glow arch bg-white border border-gold/25 px-8 pt-14 pb-10 text-center shadow-[0_20px_50px_-30px_rgba(27,42,74,.35)]" style={d(i, 150)}>
            <Medallion name={v.icon} size="w-20 h-20" icon="w-10 h-10" className="mx-auto" style={d(i, 150)} />
            <h3 className="font-display text-2xl font-semibold text-navy mt-7">{v.title}</h3>
            <p className="text-navy/60 text-[15px] leading-relaxed mt-3">{v.desc}</p>
          </div>
        ))}
      </Reveal>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-navy-deep py-32 px-6 text-center">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 50%, #22385f 0%, #0E1830 75%)' }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <RoseWindow className="w-[700px] h-[700px] shrink-0 text-gold/[0.10]" />
      </div>
      <Reveal className="relative max-w-3xl mx-auto">
        <div className="rv flex justify-center"><Ornament className="w-56 text-gold/70" /></div>
        <blockquote className="rv font-display italic text-white/85 text-2xl md:text-3xl leading-snug mt-8" style={d(1)}>
          “For where there are two or three gathered together in my name, there am I in the midst of them.”
        </blockquote>
        <p className="rv smallcaps text-gold/80 mt-4" style={d(2)}>Matthew 18:20</p>
        <h2 className="rv font-display font-semibold text-white text-5xl md:text-7xl leading-[1.02] mt-14" style={d(3)}>
          Your parish community <span className="italic gilded">is waiting.</span>
        </h2>
        <div className="rv mt-11" style={d(4)}><GoldButton href={APP_URL} className="text-base px-10">Get Started, It&apos;s Free</GoldButton></div>
      </Reveal>
    </section>
  )
}

export default function MarketingHome() {
  return (
    <MarketingLayout>
      <Hero />
      <Problem />
      <Layers />
      <PhoneShowcase />
      <ParishBand />
      <Values />
      <FinalCta />
    </MarketingLayout>
  )
}
