import { useState } from 'react'
import MarketingLayout from './MarketingLayout'
import { toast } from '../components/shared/Toast'
import Emblem from './Emblem'
import { Reveal, Medallion, PageHero, SectionHeading, GoldButton, Ornament, Arrow } from './ui'
import { glowHandlers, d } from './motion'

// Every plan includes every feature; the price follows parish size.
const TIERS = [
  { label: 'Small', price: '$59', size: 'Under 200 parishioners', features: ['Every feature included', '90-day free trial, no card needed', 'Email support'] },
  { label: 'Medium', price: '$119', size: '200–500 parishioners', featured: true, features: ['Every feature included', '90-day free trial, no card needed', 'Priority support'] },
  { label: 'Large', price: '$229', size: '500–1,500 parishioners', features: ['Every feature included', '90-day free trial, no card needed', 'Priority support', 'Help setting up clusters and multi-parish staff'] },
  { label: 'Cathedral', price: '$389', size: '1,500+ parishioners', features: ['Every feature included', '90-day free trial, no card needed', 'Dedicated onboarding', 'Custom contract available'] },
]

const ADMIN_FEATURES = [
  { icon: 'ledger', title: 'Admin Dashboard', desc: 'Full control over your parish presence: posts, events, parishioners, and billing in one place.' },
  { icon: 'herald', title: 'Push Announcements', desc: "Announcements from the pastor and staff go straight to parishioners' phones, with no algorithm and no spam filter. Overnight posts arrive at 8am." },
  { icon: 'stellaMaris', title: 'From the Parish', desc: 'New announcements and posts you feature sit at the top of the home feed until each parishioner has seen them.' },
  { icon: 'reach', title: 'Reach', desc: 'See how many parishioners saw each announcement, how many are active each week, and how your parish is growing. Totals only, never who read what.' },
  { icon: 'moon', title: 'Quiet Phones', desc: "Parishioner posts stay in the app, with one evening summary of the day's best post. Nobody gets more than five parish notifications a day." },
  { icon: 'shield', title: 'Moderation', desc: 'Reported posts go to your moderation queue. Hide a post in one tap, and appoint trusted parishioners as moderators. Community guidelines and a limit of three community posts per person a day keep things calm.' },
  { icon: 'scroll', title: 'Weekly Prompts', desc: "Optional weekly posts that get people talking: Sunday's homily, Monday's prayer intentions, Thursday's ride share to Mass." },
  { icon: 'calendar', title: 'Events & RSVPs', desc: 'Create events, set capacity, track who is going, and view a full attendee breakdown.' },
  { icon: 'register', title: 'Parishioner List', desc: 'See who follows your parish with name, vocation, and join date. Export to CSV anytime.' },
  { icon: 'clock', title: 'Mass Times Editor', desc: 'Update your Mass schedule yourself, instantly visible to all followers. No webmaster needed.' },
  { icon: 'fellowship', title: 'Groups Management', desc: "Create and manage parish groups: men's group, young adults, OCIA, Rosary Society, and more." },
  { icon: 'links', title: 'Parish Clusters', desc: 'Group several parishes under one pastoral name (e.g. "Carlo Acutis Parish"). Each church keeps its own page.' },
  { icon: 'spires', title: 'Multi-Parish Clergy', desc: 'Pastors who serve several parishes can be set up as admin across all of them.' },
  { icon: 'hourglass', title: 'Scheduled Posts', desc: 'Write your Sunday post on Friday, and schedule it to go live at the right moment.' },
  { icon: 'letter', title: 'Inbox', desc: 'Receive messages from parishioners in a dedicated parish inbox.' },
]

const EMPTY = { name: '', diocese: '', city: '', state: '', contact_name: '', contact_email: '', contact_phone: '', parishioners: '', notes: '' }

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="smallcaps text-[15px] text-navy/70">{label}{required && <span className="text-gold-deep"> *</span>}</span>
      {children}
    </label>
  )
}

function ParishApplicationForm() {
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.contact_email || !form.name) return
    setSubmitting(true)
    // Loaded only when someone sends the form, keeping the page itself light
    const { supabase } = await import('../lib/supabase')
    const { error } = await supabase.from('parish_applications').insert({
      parish_name: form.name,
      diocese: form.diocese,
      city: form.city,
      state: form.state,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone || null,
      parishioner_count: form.parishioners || null,
      notes: form.notes || null,
    })
    if (error) toast.error('Something went wrong. Please email us at info@getinfold.app')
    else setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <Reveal className="text-center py-14">
        <Medallion name="cross" size="w-20 h-20" icon="w-10 h-10" className="mx-auto" />
        <h3 className="font-display text-4xl font-semibold text-navy mt-6">Thank you.</h3>
        <p className="text-navy/60 max-w-sm mx-auto mt-3">We&apos;ll be in touch within 1–2 business days to set up your parish on inFold.</p>
      </Reveal>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
        <Field label="Parish name" required><input required value={form.name} onChange={set('name')} placeholder="St. Patrick's Parish" className="field" /></Field>
        <Field label="Diocese"><input value={form.diocese} onChange={set('diocese')} placeholder="Diocese of Worcester" className="field" /></Field>
        <Field label="City"><input value={form.city} onChange={set('city')} placeholder="Worcester" className="field" /></Field>
        <Field label="State"><input value={form.state} onChange={set('state')} placeholder="MA" className="field" /></Field>
        <Field label="Your name" required><input required value={form.contact_name} onChange={set('contact_name')} placeholder="Fr. John Smith" className="field" /></Field>
        <Field label="Email" required><input required type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="pastor@stpatricks.org" className="field" /></Field>
        <Field label="Phone (optional)"><input value={form.contact_phone} onChange={set('contact_phone')} placeholder="(508) 555-0100" className="field" /></Field>
        <Field label="Approximate parishioners">
          <select value={form.parishioners} onChange={set('parishioners')} className="field appearance-none">
            <option value="">Select a range</option>
            <option>Under 200</option>
            <option>200–500</option>
            <option>500–1,500</option>
            <option>1,500+</option>
          </select>
        </Field>
      </div>
      <Field label="Anything else we should know?">
        <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="We have 3 linked churches, serve a bilingual community, etc." className="field resize-none" />
      </Field>
      <button
        type="submit"
        disabled={submitting || !form.name || !form.contact_email}
        className="btn-gold w-full font-semibold py-4 rounded-full disabled:opacity-50 disabled:pointer-events-none"
      >
        {submitting ? 'Sending…' : 'Submit Parish Application'}
      </button>
      <p className="text-navy/45 text-xs text-center">We respond within 1–2 business days. Every plan begins with a 90-day free trial.</p>
    </form>
  )
}

export default function ForParishesPage() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="For Pastors & Parish Staff"
        title="Give your parishioners"
        accent="a home during the week."
        sub="Replace scattered tools with one platform, and reach parishioners with announcements that actually land: directly on their phones."
      >
        <GoldButton href="#apply">Apply for Your Parish <Arrow /></GoldButton>
      </PageHero>

      {/* Admin tools */}
      <section className="bg-cream py-28 px-6">
        <SectionHeading eyebrow="Admin Tools" title={<>Everything a parish <span className="italic text-gold-deep">needs.</span></>} />
        <Reveal className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-16">
          {ADMIN_FEATURES.map((f, i) => (
            <div
              key={f.title}
              {...glowHandlers()}
              className="rv card-glow rounded-2xl bg-white border border-navy/[0.07] p-7 shadow-[0_14px_40px_-28px_rgba(27,42,74,.35)] hover:border-gold/40"
              style={d(i % 6, 80)}
            >
              <Medallion name={f.icon} size="w-14 h-14" icon="w-7 h-7" style={d(i % 6, 80)} />
              <h3 className="font-display text-2xl font-semibold text-navy mt-5">{f.title}</h3>
              <p className="text-navy/60 text-[15px] leading-relaxed mt-2">{f.desc}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Pricing */}
      <section className="bg-white py-28 px-6">
        <SectionHeading
          eyebrow="Pricing"
          title={<>Simple flat pricing. <span className="italic text-gold-deep">No per-seat fees.</span></>}
          sub="Every plan includes every feature and a 90-day free trial. Cancel anytime."
        />
        <Reveal className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-16 items-stretch">
          {TIERS.map((t, i) => (
            <div
              key={t.label}
              {...glowHandlers()}
              className={`rv card-glow relative rounded-3xl p-8 flex flex-col ${
                t.featured
                  ? 'bg-navy-deep text-white ring-1 ring-gold/60 shadow-[0_30px_60px_-30px_rgba(14,24,48,.8)] lg:-translate-y-3'
                  : 'bg-cream border border-navy/[0.07]'
              }`}
              style={d(i, 120)}
            >
              <p className={`smallcaps text-sm ${t.featured ? 'text-gold' : 'text-gold-deep'}`}>{t.label}</p>
              <p className={`font-display font-semibold text-6xl mt-4 ${t.featured ? 'text-white' : 'text-navy'}`}>{t.price}</p>
              <p className={`text-xs mt-1 ${t.featured ? 'text-white/50' : 'text-navy/50'}`}>per month · {t.size}</p>
              <div className={`h-px my-6 ${t.featured ? 'bg-gold/30' : 'bg-navy/10'}`} />
              <ul className="space-y-3 flex-1">
                {t.features.map((f) => (
                  <li key={f} className={`text-sm flex items-start gap-2.5 ${t.featured ? 'text-white/75' : 'text-navy/65'}`}>
                    <Emblem name="check" className="w-4 h-4 mt-0.5 text-gold flex-shrink-0" strokeWidth={3} />{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>
        <Reveal className="max-w-4xl mx-auto mt-12 text-center">
          <p className="rv smallcaps text-gold-deep">All plans include</p>
          <p className="rv text-navy/55 text-[15px] leading-relaxed mt-3" style={d(1)}>
            Parish admin dashboard · Announcements & events · Mass times editor · Push notifications · Reach · Moderation ·
            Scheduled posts · CSV export · Parish clusters & multi-parish staff · Community feed · Faith content
          </p>
        </Reveal>
      </section>

      {/* Dioceses */}
      <section id="dioceses" className="relative bg-navy py-28 px-6 overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #E8D59A 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="relative">
          <SectionHeading
            light
            eyebrow="For Dioceses"
            title={<>One plan for <span className="italic gilded">your parishes.</span></>}
            sub={<><span className="text-gold font-semibold">$49 per parish per month</span>, whatever the parish&apos;s size. You choose which parishes to cover, and can add more at any time.</>}
          />
          <Reveal className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {[
              { icon: 'crown', title: 'You choose the parishes', desc: 'Start with a few and add more as they come on board. The bill adjusts automatically.' },
              { icon: 'reach', title: 'See reach across the diocese', desc: 'Followers, weekly activity, and announcement reach for every covered parish and in total. Totals only.' },
              { icon: 'keys', title: 'Nobody pays twice', desc: 'A parish already paying for itself stops being charged when its current paid month ends. Its page and data stay.' },
            ].map((f, i) => (
              <div key={f.title} {...glowHandlers()} className="rv card-glow rounded-2xl border border-gold/25 bg-white/[0.04] p-8 text-center hover:border-gold/50" style={d(i, 130)}>
                <Medallion name={f.icon} size="w-16 h-16" icon="w-8 h-8" className="mx-auto" style={d(i, 130)} />
                <h3 className="font-display text-2xl font-semibold text-white mt-6">{f.title}</h3>
                <p className="text-white/60 text-[15px] leading-relaxed mt-3">{f.desc}</p>
              </div>
            ))}
          </Reveal>
          <Reveal className="text-center mt-12">
            <div className="rv"><GoldButton href="mailto:info@getinfold.app?subject=Diocese%20plan">Talk to us about a diocese plan <Arrow /></GoldButton></div>
          </Reveal>
        </div>
      </section>

      {/* Application */}
      <section id="apply" className="bg-cream py-28 px-6 scroll-mt-16">
        <SectionHeading
          eyebrow="Get Started"
          title={<>Parish <span className="italic text-gold-deep">Application</span></>}
          sub="Fill this out and we'll set up your parish with a free 90-day trial. We respond within 1–2 business days."
        />
        <Reveal className="max-w-3xl mx-auto mt-14">
          <div className="rv rounded-3xl bg-white border border-gold/25 shadow-[0_30px_70px_-40px_rgba(27,42,74,.45)] p-8 md:p-12">
            <ParishApplicationForm />
          </div>
          <p className="rv text-center text-navy/55 text-sm mt-7" style={d(1)}>
            Prefer email? Write to us at{' '}
            <a href="mailto:info@getinfold.app" className="text-navy font-semibold underline decoration-gold/50 underline-offset-4 hover:decoration-gold">info@getinfold.app</a>
          </p>
          <div className="rv flex justify-center mt-10" style={d(2)}><Ornament className="w-48 text-gold/70" /></div>
        </Reveal>
      </section>
    </MarketingLayout>
  )
}
