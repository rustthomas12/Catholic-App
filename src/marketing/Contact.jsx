import { useState } from 'react'
import { Link } from 'react-router-dom'
import MarketingLayout, { APP_URL } from './MarketingLayout'
import { toast } from '../components/shared/Toast'
import Emblem from './Emblem'
import { Reveal, Medallion, PageHero } from './ui'
import { d } from './motion'

const REASONS = [
  'I want to set up my parish',
  'I have a question about pricing',
  'I found a bug or issue',
  'I have a feature request',
  'Press / media inquiry',
  'General question',
]

const QUICK_LINKS = [
  { label: 'Set up your parish', to: '/parishes' },
  { label: 'See all features', to: '/features' },
  { label: 'Create a free account', href: `${APP_URL}/signup` },
  { label: 'Privacy Policy', href: `${APP_URL}/privacy` },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', reason: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.message) return
    setSubmitting(true)
    const { supabase } = await import('../lib/supabase')
    const { error } = await supabase.from('contact_submissions').insert({
      name: form.name || null,
      email: form.email,
      reason: form.reason || null,
      message: form.message,
    })
    if (error) toast.error('Something went wrong. Please email us directly at info@getinfold.app')
    else setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Get in Touch"
        title="We'd love to"
        accent="hear from you."
        sub="Whether you're a pastor, a parishioner, or simply curious, we read every message."
      />

      <section className="bg-cream py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Reveal className="space-y-5">
            <a href="mailto:info@getinfold.app" className="rv card-glow flex items-center gap-5 rounded-2xl bg-white border border-navy/[0.07] p-6 shadow-[0_14px_40px_-30px_rgba(27,42,74,.35)] hover:border-gold/40">
              <Medallion name="letter" size="w-14 h-14" icon="w-7 h-7" className="flex-shrink-0" />
              <div>
                <p className="smallcaps text-[15px] text-gold-deep">Email</p>
                <p className="text-navy font-medium mt-0.5">info@getinfold.app</p>
              </div>
            </a>

            <div className="rv rounded-2xl bg-white border border-navy/[0.07] p-6 shadow-[0_14px_40px_-30px_rgba(27,42,74,.35)]" style={d(1)}>
              <p className="smallcaps text-[15px] text-gold-deep mb-3">Quick links</p>
              {QUICK_LINKS.map((l) => {
                const cls = 'group flex items-center justify-between py-2.5 text-navy/80 hover:text-navy border-b border-navy/[0.06] last:border-0'
                const inner = (
                  <>
                    <span>{l.label}</span>
                    <span className="text-gold transition-transform duration-500 group-hover:translate-x-1">→</span>
                  </>
                )
                return l.to
                  ? <Link key={l.label} to={l.to} className={cls}>{inner}</Link>
                  : <a key={l.label} href={l.href} className={cls}>{inner}</a>
              })}
            </div>

            <div className="rv rounded-2xl bg-navy-deep p-6 flex items-center gap-4" style={d(2)}>
              <span className="emb-draw text-gold" style={d(2)}><Emblem name="hourglass" className="w-8 h-8" /></span>
              <div>
                <p className="text-white font-display text-xl font-semibold">Response time</p>
                <p className="text-white/55 text-sm">We usually reply within 1–2 business days.</p>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-2">
            <div className="rv rounded-3xl bg-white border border-gold/25 shadow-[0_30px_70px_-40px_rgba(27,42,74,.45)] p-8 md:p-12">
              {submitted ? (
                <div className="text-center py-14">
                  <Medallion name="dove" size="w-20 h-20" icon="w-10 h-10" className="mx-auto is-in" />
                  <h3 className="font-display text-4xl font-semibold text-navy mt-6">Message received.</h3>
                  <p className="text-navy/60 max-w-sm mx-auto mt-3">Thank you for reaching out. We&apos;ll reply within 1–2 business days.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-7">
                  <h2 className="font-display text-3xl md:text-4xl font-semibold text-navy">Send us a message</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
                    <label className="block">
                      <span className="smallcaps text-[15px] text-navy/70">Your name</span>
                      <input value={form.name} onChange={set('name')} placeholder="Fr. John Smith" className="field" />
                    </label>
                    <label className="block">
                      <span className="smallcaps text-[15px] text-navy/70">Email <span className="text-gold-deep">*</span></span>
                      <input required type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" className="field" />
                    </label>
                  </div>
                  <label className="block">
                    <span className="smallcaps text-[15px] text-navy/70">What&apos;s this about?</span>
                    <select value={form.reason} onChange={set('reason')} className="field appearance-none">
                      <option value="">Select a reason</option>
                      {REASONS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="smallcaps text-[15px] text-navy/70">Message <span className="text-gold-deep">*</span></span>
                    <textarea required value={form.message} onChange={set('message')} rows={5} placeholder="Tell us what's on your mind…" className="field resize-none" />
                  </label>
                  <button
                    type="submit"
                    disabled={submitting || !form.email || !form.message}
                    className="btn-gold w-full font-semibold py-4 rounded-full disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {submitting ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingLayout>
  )
}
