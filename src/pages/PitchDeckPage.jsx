import { useState, useEffect } from 'react'

const slides = [
  { id: 1, type: 'cover' },
  { id: 2, type: 'problem' },
  { id: 3, type: 'solution' },
  { id: 4, type: 'whynow' },
  { id: 5, type: 'market' },
  { id: 6, type: 'competition' },
  { id: 7, type: 'business' },
  { id: 8, type: 'gtm' },
  { id: 9, type: 'traction' },
  { id: 10, type: 'founder' },
  { id: 11, type: 'financials' },
  { id: 12, type: 'ask' },
  { id: 13, type: 'vision' },
  { id: 14, type: 'closing' },
]

function SlideWrapper({ children, className = '', id }) {
  return (
    <section
      id={`slide-${id}`}
      className={`min-h-screen flex flex-col justify-center px-8 md:px-20 lg:px-32 py-20 border-b border-white/5 relative ${className}`}
    >
      {children}
    </section>
  )
}

function SlideNumber({ n }) {
  return (
    <div className="absolute top-8 right-10 text-white/20 text-sm font-mono tracking-widest">
      {String(n).padStart(2, '0')} / 14
    </div>
  )
}

function Tag({ children, color = 'gold' }) {
  const colors = {
    gold: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    blue: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    green: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  }
  return (
    <span className={`inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full ${colors[color]}`}>
      {children}
    </span>
  )
}

function SlideCover() {
  return (
    <SlideWrapper id={1} className="items-center text-center">
      <SlideNumber n={1} />
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Tag color="gold">SENT Summit Pitch Competition · Denver 2026</Tag>
        </div>
        <div className="mb-6">
          <div className="text-7xl md:text-9xl font-black tracking-tight text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Communio
          </div>
          <div className="text-2xl md:text-3xl text-amber-400 font-light tracking-wide">
            The Digital Parish Hall
          </div>
        </div>
        <div className="w-24 h-px bg-amber-500/50 mx-auto my-10" />
        <p className="text-white/50 text-lg tracking-widest font-light">
          Thomas Rust · Founder &amp; Builder
        </p>
        <p className="text-white/30 text-sm mt-2 tracking-wide">
          communio.app
        </p>
      </div>
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </SlideWrapper>
  )
}

function SlideProblem() {
  return (
    <SlideWrapper id={2}>
      <SlideNumber n={2} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="blue">01 · Problem</Tag>
        <h2 className="mt-6 text-4xl md:text-6xl font-black text-white leading-tight mb-4">
          Most Catholics feel alone<br />
          <span className="text-amber-400">the moment they leave Mass.</span>
        </h2>
        <div className="w-16 h-px bg-amber-500/50 my-10" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { stat: '86%', label: 'of Catholic organizations feel unprepared for digital engagement', source: 'eCatholic 2025' },
            { stat: '4–6', label: 'disconnected tools pastors juggle weekly: email, Facebook, WhatsApp, bulletin, website', source: '' },
            { stat: '7%', label: 'of Catholic organizations report fully integrated digital communication systems', source: '' },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-8 hover:bg-white/8 transition-colors">
              <div className="text-5xl md:text-6xl font-black text-amber-400 mb-4">{item.stat}</div>
              <p className="text-white/70 text-sm leading-relaxed">{item.label}</p>
              {item.source && <p className="text-white/30 text-xs mt-3">{item.source}</p>}
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-6">
          <p className="text-amber-200/80 text-base leading-relaxed">
            <span className="text-amber-400 font-semibold">Bulletins go unread. Emails go to spam. Facebook algorithms bury parish posts.</span>
            {' '}The infrastructure of Catholic community life is broken — and no one has fixed it.
          </p>
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideSolution() {
  const pillars = [
    {
      icon: '⛪',
      title: 'Parish',
      desc: 'Announcements, events, Mass times, RSVP — reaches every parishioner without algorithm interference via push notifications.',
    },
    {
      icon: '✝️',
      title: 'Faith',
      desc: 'Daily readings, saint of the day, prayer journal, rosary tracker, confession tracker, Lent & Advent formation programs.',
    },
    {
      icon: '🤝',
      title: 'Community',
      desc: 'Groups, prayer requests, direct messaging to leaders, peer connections — the life of the parish, extended.',
    },
  ]
  return (
    <SlideWrapper id={3}>
      <SlideNumber n={3} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="green">02 · Solution</Tag>
        <h2 className="mt-6 text-4xl md:text-6xl font-black text-white leading-tight mb-2">
          Communio is the<br />
          <span className="text-amber-400">digital parish hall.</span>
        </h2>
        <div className="w-16 h-px bg-amber-500/50 my-10" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {pillars.map((p, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-8 hover:bg-white/8 transition-colors group">
              <div className="text-4xl mb-4">{p.icon}</div>
              <div className="text-xl font-bold text-white mb-3 group-hover:text-amber-400 transition-colors">{p.title}</div>
              <p className="text-white/60 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-wrap items-center gap-6">
          {['No algorithm', 'No ads', 'No data sold'].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-white/70 text-sm font-medium">{item}</span>
            </div>
          ))}
          <div className="ml-auto text-white/40 text-sm">Revenue from parish subscriptions — not attention.</div>
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideWhyNow() {
  const reasons = [
    {
      n: '1',
      title: 'Hallow proved the behavior',
      body: '20 million downloads and $51M ARR from a Catholic prayer app. Catholics adopt faith technology. The next category is community — and no one has built it yet.',
    },
    {
      n: '2',
      title: 'The post-COVID parish crisis',
      body: 'Mass attendance dropped 30–50% during COVID and has not fully recovered. Parishes are urgently looking for tools to re-engage lapsed parishioners. The timing is pastoral, not just commercial.',
    },
    {
      n: '3',
      title: 'Push notifications changed the game',
      body: 'iOS 16.4 (2023) added web push for PWAs. For the first time, a web app can send OS-level alerts without a $100K+ native app build. Communio exists because of this.',
    },
    {
      n: '4',
      title: 'AI-assisted solo development',
      body: 'Claude Code made it possible to build a production-grade platform solo, in months, at near-zero cost. The barrier to entry for a Catholic founder is lower than ever.',
    },
  ]
  return (
    <SlideWrapper id={4}>
      <SlideNumber n={4} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="purple">03 · Why Now</Tag>
        <h2 className="mt-6 text-4xl md:text-6xl font-black text-white leading-tight mb-4">
          Three forces converging<br />
          <span className="text-amber-400">to make this the moment.</span>
        </h2>
        <div className="w-16 h-px bg-amber-500/50 my-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reasons.map((r, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-8 flex gap-6 hover:bg-white/8 transition-colors">
              <div className="text-3xl font-black text-amber-500/40 font-mono shrink-0">{r.n}</div>
              <div>
                <div className="text-white font-bold text-lg mb-2">{r.title}</div>
                <p className="text-white/60 text-sm leading-relaxed">{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideMarket() {
  return (
    <SlideWrapper id={5}>
      <SlideNumber n={5} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="gold">04 · Market Opportunity</Tag>
        <h2 className="mt-6 text-4xl md:text-6xl font-black text-white leading-tight mb-4">
          The market is <span className="text-amber-400">massive.</span>
        </h2>
        <div className="w-16 h-px bg-amber-500/50 my-10" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { n: '70M', label: 'US Catholics' },
            { n: '17,500', label: 'US Catholic Parishes' },
            { n: '1.3B', label: 'Catholics Worldwide' },
            { n: '$51M', label: 'Hallow ARR — prayer only' },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center hover:bg-white/8 transition-colors">
              <div className="text-3xl md:text-4xl font-black text-amber-400 mb-2">{item.n}</div>
              <p className="text-white/50 text-xs">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'TAM', amount: '$2.3B', desc: '17,500 US parishes at blended $109/mo', color: 'from-amber-500/20 to-amber-500/5' },
            { label: 'SAM', amount: '$228M', desc: 'Est. 15% digitally ready parishes (Year 5 horizon)', color: 'from-blue-500/20 to-blue-500/5' },
            { label: 'SOM', amount: '$174K', desc: 'Year 3 target: 175 parishes — 1% of US market', color: 'from-emerald-500/20 to-emerald-500/5' },
          ].map((item, i) => (
            <div key={i} className={`rounded-2xl bg-gradient-to-br ${item.color} border border-white/10 p-8`}>
              <div className="text-xs font-black tracking-widest text-white/50 uppercase mb-2">{item.label}</div>
              <div className="text-4xl font-black text-white mb-3">{item.amount}</div>
              <p className="text-white/50 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideCompetition() {
  const rows = [
    { feature: 'Parish announcements & feed', communio: true, flocknote: true, hallow: false, parishsoft: 'partial', facebook: true },
    { feature: 'Parishioner-facing community', communio: true, flocknote: false, hallow: false, parishsoft: false, facebook: true },
    { feature: 'Daily faith content', communio: true, flocknote: false, hallow: true, parishsoft: false, facebook: false },
    { feature: 'Private confession tracker', communio: true, flocknote: false, hallow: false, parishsoft: false, facebook: false },
    { feature: 'No algorithm / no ads', communio: true, flocknote: true, hallow: true, parishsoft: true, facebook: false },
    { feature: 'Free for individuals', communio: true, flocknote: false, hallow: false, parishsoft: true, facebook: true },
    { feature: 'Parish admin dashboard', communio: true, flocknote: true, hallow: false, parishsoft: true, facebook: false },
  ]

  function Cell({ val }) {
    if (val === true) return <span className="text-emerald-400 font-bold">✓</span>
    if (val === false) return <span className="text-white/20">✗</span>
    return <span className="text-amber-400 text-xs">Partial</span>
  }

  const cols = ['Communio', 'Flocknote', 'Hallow', 'ParishSOFT', 'Facebook']
  const vals = ['communio', 'flocknote', 'hallow', 'parishsoft', 'facebook']

  return (
    <SlideWrapper id={6}>
      <SlideNumber n={6} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="blue">05 · Competition & Moat</Tag>
        <h2 className="mt-6 text-3xl md:text-5xl font-black text-white leading-tight mb-4">
          No one has built<br />
          <span className="text-amber-400">all three layers together.</span>
        </h2>
        <div className="w-16 h-px bg-amber-500/50 my-8" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 font-normal pb-4 pr-6 text-xs uppercase tracking-wider">Feature</th>
                {cols.map((c, i) => (
                  <th key={i} className={`text-center pb-4 px-4 text-xs font-bold tracking-wider uppercase ${i === 0 ? 'text-amber-400' : 'text-white/40'}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-4 pr-6 text-white/70">{row.feature}</td>
                  {vals.map((v, j) => (
                    <td key={j} className={`py-4 px-4 text-center ${j === 0 ? 'bg-amber-500/5 rounded' : ''}`}>
                      <Cell val={row[v]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5">
          <p className="text-amber-200/80 text-sm leading-relaxed">
            <span className="text-amber-400 font-bold">Our moat:</span> The only platform combining parish communication + community + personal faith content in one free-for-individuals product.
          </p>
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideBusinessModel() {
  const tiers = [
    { label: 'Small', price: '$49', period: '/mo', size: 'Under 200 parishioners' },
    { label: 'Medium', price: '$99', period: '/mo', size: '200–500 parishioners', featured: true },
    { label: 'Large', price: '$199', period: '/mo', size: '500–1,500 parishioners' },
    { label: 'Cathedral', price: '$349', period: '/mo', size: '1,500+ parishioners' },
  ]
  const features = [
    'Parish admin dashboard', 'Announcements & events', 'Mass times editor',
    'Parishioner directory', 'Push notifications', 'Community feed',
    'Faith content', '90-day free trial',
  ]
  return (
    <SlideWrapper id={7}>
      <SlideNumber n={7} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="green">06 · Business Model</Tag>
        <h2 className="mt-6 text-4xl md:text-5xl font-black text-white leading-tight mb-2">
          Free for every Catholic.<br />
          <span className="text-amber-400">Parishes pay a simple flat fee.</span>
        </h2>
        <div className="w-16 h-px bg-amber-500/50 my-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {tiers.map((t, i) => (
            <div key={i} className={`rounded-2xl border p-6 text-center transition-colors ${t.featured ? 'bg-amber-500/15 border-amber-500/40' : 'bg-white/5 border-white/10 hover:bg-white/8'}`}>
              <div className={`text-xs font-bold tracking-widest uppercase mb-4 ${t.featured ? 'text-amber-400' : 'text-white/40'}`}>{t.label}</div>
              <div className={`text-4xl font-black mb-1 ${t.featured ? 'text-amber-400' : 'text-white'}`}>{t.price}</div>
              <div className="text-white/40 text-xs mb-4">{t.period}</div>
              <div className="text-white/60 text-xs">{t.size}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-4">All tiers include</div>
            <div className="grid grid-cols-2 gap-2">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-white/70 text-sm">
                  <span className="text-emerald-400 text-xs">✓</span> {f}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col justify-center gap-4">
            {[
              { label: 'Blended avg', val: '$109/month' },
              { label: 'Income replacement', val: '46 parishes' },
              { label: 'US market share', val: '0.26%' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <span className="text-white/40 text-sm">{item.label}</span>
                <span className="text-amber-400 font-bold">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideGTM() {
  const phases = [
    {
      phase: 'Phase 1',
      title: 'Local Beachhead',
      time: 'Months 1–12',
      goal: '10–20 paying parishes in MA',
      items: [
        'Personal outreach to pastors in Worcester & Boston dioceses',
        'SENT network introductions',
        'Lent 2027 campaign: bulletin inserts + pulpit scripts for 20 parishes',
      ],
      color: 'from-amber-500/20 to-amber-500/5',
      border: 'border-amber-500/30',
    },
    {
      phase: 'Phase 2',
      title: 'Diocese Partnerships',
      time: 'Months 13–24',
      goal: '1–2 diocese endorsements → 80–160 parishes',
      items: [
        'Diocese director meetings (1 call = 80 pastors)',
        'Deanery meeting referral program',
        'Case study from Phase 1 parishes',
      ],
      color: 'from-blue-500/20 to-blue-500/5',
      border: 'border-blue-500/30',
    },
    {
      phase: 'Phase 3',
      title: 'National Network',
      time: 'Months 25–36',
      goal: '175–500 parishes, national presence',
      items: [
        'USCCB & national Catholic media relationships',
        'Spanish-language expansion (36% of US Catholics)',
        'Organization accounts: KofC, Exodus 90, FOCUS chapters',
      ],
      color: 'from-emerald-500/20 to-emerald-500/5',
      border: 'border-emerald-500/30',
    },
  ]
  return (
    <SlideWrapper id={8}>
      <SlideNumber n={8} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="purple">07 · Go-to-Market</Tag>
        <h2 className="mt-6 text-4xl md:text-5xl font-black text-white leading-tight mb-2">
          Parish sales is <span className="text-amber-400">pastoral,</span><br />not cold outreach.
        </h2>
        <div className="w-16 h-px bg-amber-500/50 my-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {phases.map((p, i) => (
            <div key={i} className={`rounded-2xl bg-gradient-to-br ${p.color} border ${p.border} p-8`}>
              <div className="text-xs font-black tracking-widest text-white/40 uppercase mb-1">{p.phase}</div>
              <div className="text-lg font-bold text-white mb-1">{p.title}</div>
              <div className="text-xs text-white/40 mb-4 font-mono">{p.time}</div>
              <div className="text-sm text-white/80 font-semibold mb-4 pb-4 border-b border-white/10">Goal: {p.goal}</div>
              <ul className="space-y-2">
                {p.items.map((item, j) => (
                  <li key={j} className="flex gap-2 text-white/60 text-xs leading-relaxed">
                    <span className="text-amber-400 mt-0.5 shrink-0">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'CAC', val: '$75–$200' },
            { label: '3-yr LTV', val: '$3,500–$12,500' },
            { label: 'LTV:CAC', val: '25:1 – 85:1' },
            { label: 'Est. Churn', val: '8%/yr' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-amber-400 font-bold text-lg">{item.val}</div>
              <div className="text-white/40 text-xs mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideTraction() {
  const metrics = [
    { icon: '⛪', stat: '559', label: 'Verified MA parishes in directory' },
    { icon: '📱', stat: 'Live', label: 'PWA deployed — iOS & Android' },
    { icon: '🛠', stat: '11+', label: 'Completed build phases' },
    { icon: '💳', stat: 'Live', label: 'Stripe billing infrastructure' },
    { icon: '🔔', stat: 'Live', label: 'Web push notifications wired' },
    { icon: '📔', stat: 'Live', label: 'Confession tracker & prayer journal' },
  ]
  return (
    <SlideWrapper id={9}>
      <SlideNumber n={9} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="green">08 · Product & Traction</Tag>
        <h2 className="mt-6 text-4xl md:text-5xl font-black text-white leading-tight mb-2">
          This is not a concept.<br />
          <span className="text-amber-400">It exists.</span>
        </h2>
        <div className="w-16 h-px bg-amber-500/50 my-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {metrics.map((m, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/8 transition-colors">
              <div className="text-3xl mb-3">{m.icon}</div>
              <div className="text-2xl font-black text-amber-400 mb-1">{m.stat}</div>
              <p className="text-white/60 text-xs">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-wrap items-center gap-4 justify-between">
          <a href="https://communio.app" target="_blank" rel="noopener noreferrer" className="text-amber-400 font-bold hover:text-amber-300 transition-colors">
            communio.app
          </a>
          <div className="flex flex-wrap gap-3">
            {['React', 'Supabase', 'Vercel'].map((t, i) => (
              <span key={i} className="text-xs bg-white/10 text-white/60 px-3 py-1 rounded-full">{t}</span>
            ))}
          </div>
          <div className="text-white/40 text-sm">$0 infrastructure cost at current scale</div>
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideFounder() {
  const facts = [
    { icon: '✝️', label: 'Practicing Catholic, Central Massachusetts' },
    { icon: '👨‍👧‍👦', label: 'Father of twins' },
    { icon: '💼', label: 'Independent insurance professional' },
    { icon: '💻', label: 'Built Communio solo using Claude Code' },
    { icon: '📍', label: 'Parishioner — felt the isolation firsthand' },
    { icon: '🎓', label: 'Philosophically & analytically educated' },
  ]
  return (
    <SlideWrapper id={10}>
      <SlideNumber n={10} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="gold">09 · The Founder</Tag>
        <h2 className="mt-6 text-4xl md:text-5xl font-black text-white leading-tight mb-4">
          Thomas Rust
        </h2>
        <div className="text-amber-400 text-lg mb-8">Founder &amp; Builder, Communio</div>
        <div className="w-16 h-px bg-amber-500/50 mb-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="grid grid-cols-1 gap-3">
              {facts.map((f, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5">
                  <span className="text-2xl shrink-0">{f.icon}</span>
                  <span className="text-white/70 text-sm">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <blockquote className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-8">
              <p className="text-amber-100/90 text-lg leading-relaxed italic">
                "I built this because I felt the isolation myself. I looked for something like this and it didn't exist. So I built it."
              </p>
            </blockquote>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="text-white/40 text-xs uppercase tracking-widest mb-4">Infrastructure</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Stack</span>
                  <span className="text-white/80">React · Supabase · Vercel · Claude Code</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-white/60">Monthly cost</span>
                  <span className="text-emerald-400 font-bold">$0</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-white/60">Scale before $200/mo</span>
                  <span className="text-white/80">50,000 MAU</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideFinancials() {
  const years = [
    { year: 'Year 1', arr: '$0', label: 'Building traction', parishes: '—', color: 'text-white/40' },
    { year: 'Year 2', arr: '$74K', label: 'Moderate scenario', parishes: '74 parishes · 8% churn', color: 'text-blue-400' },
    { year: 'Year 3', arr: '$174K', label: 'Moderate scenario', parishes: '149 parishes · 1 diocese partner', color: 'text-amber-400' },
  ]
  return (
    <SlideWrapper id={11}>
      <SlideNumber n={11} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="blue">10 · Financial Projections</Tag>
        <h2 className="mt-6 text-4xl md:text-5xl font-black text-white leading-tight mb-2">
          Conservative. Achievable.<br />
          <span className="text-amber-400">Mission-first.</span>
        </h2>
        <div className="w-16 h-px bg-amber-500/50 my-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {years.map((y, i) => (
            <div key={i} className={`rounded-2xl bg-white/5 border border-white/10 p-8 ${i === 2 ? 'md:ring-2 md:ring-amber-500/30' : ''}`}>
              <div className="text-xs font-black tracking-widest text-white/40 uppercase mb-4">{y.year}</div>
              <div className={`text-5xl font-black mb-3 ${y.color}`}>{y.arr}</div>
              <div className="text-white/60 text-sm mb-2">{y.label}</div>
              <div className="text-white/30 text-xs">{y.parishes}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Income replacement', val: '46 parishes' },
            { label: 'Blended avg', val: '$109/mo' },
            { label: '3-yr LTV', val: '$3,500–$12,500' },
            { label: 'LTV:CAC', val: '25:1 – 85:1' },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
              <div className="text-amber-400 font-bold text-lg mb-1">{item.val}</div>
              <div className="text-white/40 text-xs">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <div className="text-white/40 text-xs uppercase tracking-widest mb-3">Year 3 ARR Range</div>
          <div className="flex items-end gap-4">
            {[
              { label: 'Conservative', val: '$63K', h: 'h-8' },
              { label: 'Moderate', val: '$174K', h: 'h-16' },
              { label: 'Optimistic', val: '$546K', h: 'h-28' },
            ].map((bar, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="text-amber-400 font-bold text-sm">{bar.val}</div>
                <div className={`w-16 md:w-24 ${bar.h} rounded-t-lg bg-amber-500/30 border border-amber-500/40`} />
                <div className="text-white/40 text-xs text-center">{bar.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideAsk() {
  const items = [
    { icon: '⏱', title: 'Founder time', body: 'Reduce insurance hours. 20+ hours/week on Communio full-time.' },
    { icon: '🤝', title: 'Parish onboarding', body: 'Part-time community manager — the adoption toolkit is the product.' },
    { icon: '🎨', title: 'UX design pass', body: 'Professional design on the app before national launch.' },
    { icon: '🗺', title: 'National parish data', body: 'Expand from 559 MA parishes to all 17,500 US parishes.' },
    { icon: '✝️', title: 'First Lent campaign', body: 'The single highest-leverage adoption window in the Church year.' },
  ]
  return (
    <SlideWrapper id={12}>
      <SlideNumber n={12} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="purple">11 · The Ask</Tag>
        <h2 className="mt-6 text-4xl md:text-5xl font-black text-white leading-tight mb-2">
          Not venture capital.<br />
          <span className="text-amber-400">A Catholic investment in Catholic infrastructure.</span>
        </h2>
        <div className="w-16 h-px bg-amber-500/50 my-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {items.map((item, i) => (
            <div key={i} className="flex gap-5 rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/8 transition-colors">
              <div className="text-3xl shrink-0">{item.icon}</div>
              <div>
                <div className="text-white font-bold mb-1">{item.title}</div>
                <p className="text-white/60 text-sm leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-8 text-center">
          <p className="text-amber-200/90 text-xl leading-relaxed font-light italic">
            "The return is not a 10x exit.<br />
            It is the Church, served faithfully for decades."
          </p>
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideVision() {
  const stages = [
    { icon: '🌱', period: 'Year 1–2', label: 'Massachusetts', body: '50–175 parishes. Proof of model. First diocese relationship. Lent campaign proves adoption playbook.' },
    { icon: '🇺🇸', period: 'Year 3–5', label: 'National', body: '500–1,750 parishes across all 196 US dioceses. Spanish language. Organization network. $1M+ ARR.' },
    { icon: '✝️', period: 'Year 5–7', label: 'The Church', body: 'International expansion. Diocese dashboard product. 50,000+ active parishes worldwide.' },
    { icon: '⛪', period: 'Year 10', label: 'Infrastructure', body: 'Communio is infrastructure for the Church — like the bulletin, but alive. 1B+ Catholics with a digital home.' },
  ]
  return (
    <SlideWrapper id={13}>
      <SlideNumber n={13} />
      <div className="max-w-5xl mx-auto w-full">
        <Tag color="gold">12 · The Vision</Tag>
        <h2 className="mt-6 text-4xl md:text-5xl font-black text-white leading-tight mb-2">
          Where Communio is<br />
          <span className="text-amber-400">in 10 years.</span>
        </h2>
        <div className="w-16 h-px bg-amber-500/50 my-8" />
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/50 via-amber-500/20 to-transparent hidden md:block" />
          <div className="space-y-4">
            {stages.map((s, i) => (
              <div key={i} className="flex gap-6 md:pl-14 relative">
                <div className="absolute left-0 top-6 w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl hidden md:flex">
                  {s.icon}
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex gap-5 w-full hover:bg-white/8 transition-colors">
                  <div className="text-2xl md:hidden shrink-0">{s.icon}</div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-white/30">{s.period}</span>
                      <span className="text-white font-bold">{s.label}</span>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
          <p className="text-white/60 text-base italic leading-relaxed">
            "The question isn't whether you want to invest.<br />
            It's whether you think this is something the Church needs."
          </p>
        </div>
      </div>
    </SlideWrapper>
  )
}

function SlideClosing() {
  return (
    <SlideWrapper id={14} className="items-center text-center">
      <SlideNumber n={14} />
      <div className="max-w-3xl mx-auto">
        <div className="text-7xl md:text-9xl font-black tracking-tight text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          Communio
        </div>
        <div className="text-xl md:text-2xl text-amber-400 font-light tracking-wide mb-12">
          "Every Catholic. Every parish. Every day."
        </div>
        <div className="w-24 h-px bg-amber-500/50 mx-auto mb-12" />
        <blockquote className="text-white/70 text-lg md:text-xl leading-relaxed italic mb-12">
          "The question I'd leave you with isn't whether you want to invest.
          It's whether you think this is something the Church needs."
        </blockquote>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-white/40 text-sm">
          <a href="https://communio.app" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
            communio.app
          </a>
          <span className="hidden md:block">·</span>
          <span>Thomas Rust</span>
          <span className="hidden md:block">·</span>
          <span className="italic">Pro Ecclesia. Pro Fide.</span>
        </div>
      </div>
    </SlideWrapper>
  )
}

const SLIDE_COMPONENTS = {
  cover: SlideCover,
  problem: SlideProblem,
  solution: SlideSolution,
  whynow: SlideWhyNow,
  market: SlideMarket,
  competition: SlideCompetition,
  business: SlideBusinessModel,
  gtm: SlideGTM,
  traction: SlideTraction,
  founder: SlideFounder,
  financials: SlideFinancials,
  ask: SlideAsk,
  vision: SlideVision,
  closing: SlideClosing,
}

export default function PitchDeckPage() {
  const [activeSlide, setActiveSlide] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)

  const slideLabels = [
    'Cover', 'Problem', 'Solution', 'Why Now', 'Market', 'Competition',
    'Business Model', 'Go-to-Market', 'Traction', 'Founder', 'Financials', 'The Ask', 'Vision', 'Closing',
  ]

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = parseInt(entry.target.id.replace('slide-', ''))
            setActiveSlide(id)
          }
        })
      },
      { threshold: 0.4 }
    )
    slides.forEach((s) => {
      const el = document.getElementById(`slide-${s.id}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  function scrollTo(id) {
    document.getElementById(`slide-${id}`)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1525 50%, #0a1020 100%)', color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-white/10">
        <div
          className="h-full bg-amber-400 transition-all duration-300"
          style={{ width: `${(activeSlide / slides.length) * 100}%` }}
        />
      </div>

      {/* Nav dots — desktop */}
      <nav className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-2">
        {slides.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            title={slideLabels[s.id - 1]}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${activeSlide === s.id ? 'bg-amber-400 scale-150' : 'bg-white/20 hover:bg-white/50'}`}
          />
        ))}
      </nav>

      {/* Mobile menu button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed top-4 right-4 z-50 lg:hidden rounded-full bg-white/10 border border-white/20 backdrop-blur-sm px-4 py-2 text-white/70 text-xs font-medium"
      >
        {activeSlide} / {slides.length}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={() => setMenuOpen(false)}>
          <div className="flex flex-col gap-2 text-center" onClick={e => e.stopPropagation()}>
            {slideLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i + 1)}
                className={`px-6 py-2 rounded-full text-sm transition-colors ${activeSlide === i + 1 ? 'bg-amber-500/20 text-amber-400' : 'text-white/50 hover:text-white'}`}
              >
                {i + 1}. {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slides */}
      {slides.map((slide) => {
        const Component = SLIDE_COMPONENTS[slide.type]
        return <Component key={slide.id} />
      })}

      {/* Footer */}
      <footer className="text-center py-8 text-white/20 text-xs border-t border-white/5">
        Communio · communio.app · Pro Ecclesia. Pro Fide.
      </footer>
    </div>
  )
}
