import { useEffect, useState } from 'react'
import MarketingLayout, { APP_URL } from './MarketingLayout'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'
import { Link } from 'react-router-dom'

const REASONS = [
  'I want to set up my parish',
  'I have a question about pricing',
  'I found a bug or issue',
  'I have a feature request',
  'Press / media inquiry',
  'General question',
]

export default function ContactPage() {
  useEffect(() => { document.title = 'Contact — Communio' }, [])
  const [form, setForm] = useState({ name: '', email: '', reason: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.message) return
    setSubmitting(true)
    const { error } = await supabase.from('contact_submissions').insert({
      name: form.name || null,
      email: form.email,
      reason: form.reason || null,
      message: form.message,
    })
    if (error) {
      toast.error('Something went wrong. Please email us directly at hello@getcommunio.app')
    } else {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  return (
    <MarketingLayout>

      {/* Hero */}
      <section className="bg-navy pt-32 pb-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-gold text-xs font-bold tracking-widest uppercase mb-4">Get In Touch</p>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            We'd love to hear from you.
          </h1>
          <p className="text-white/60 text-lg">
            Whether you're a pastor, a parishioner, or just curious — we read every message.
          </p>
        </div>
      </section>

      {/* Contact options + form */}
      <section className="bg-cream py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Left: contact options */}
          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Ways to Reach Us</p>
              <div className="space-y-4">
                {[
                  { icon: '✉️', label: 'Email', value: 'hello@getcommunio.app', href: 'mailto:hello@getcommunio.app' },
                ].map((c, i) => (
                  <a key={i} href={c.href} className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <span className="text-2xl">{c.icon}</span>
                    <div>
                      <p className="font-semibold text-navy text-sm">{c.label}</p>
                      <p className="text-gray-400 text-sm">{c.value}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Links</p>
              <div className="space-y-3 text-sm">
                <Link to="/parishes" className="flex items-center justify-between text-navy hover:text-gold transition-colors">
                  <span>Set up your parish</span>
                  <span>→</span>
                </Link>
                <Link to="/features" className="flex items-center justify-between text-navy hover:text-gold transition-colors">
                  <span>See all features</span>
                  <span>→</span>
                </Link>
                <a href={`${APP_URL}/signup`} className="flex items-center justify-between text-navy hover:text-gold transition-colors">
                  <span>Create a free account</span>
                  <span>→</span>
                </a>
                <a href={`${APP_URL}/privacy`} className="flex items-center justify-between text-navy hover:text-gold transition-colors">
                  <span>Privacy Policy</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            <div className="bg-navy rounded-2xl p-6 text-center">
              <p className="text-white font-bold mb-1">Response time</p>
              <p className="text-white/50 text-sm">We typically respond within 1–2 business days.</p>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            {submitted ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">✝</div>
                <h3 className="text-2xl font-black text-navy mb-2">Message received!</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Thank you for reaching out. We'll get back to you within 1–2 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-xl font-black text-navy mb-6">Send us a message</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-navy mb-1.5">Your Name</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="Fr. John Smith"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-navy mb-1.5">Email *</label>
                    <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1.5">What's this about?</label>
                  <select value={form.reason} onChange={e => set('reason', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy appearance-none bg-white">
                    <option value="">Select a reason</option>
                    {REASONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1.5">Message *</label>
                  <textarea required value={form.message} onChange={e => set('message', e.target.value)}
                    rows={5} placeholder="Tell us what's on your mind…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none" />
                </div>
                <button type="submit" disabled={submitting || !form.email || !form.message}
                  className="w-full bg-navy text-white font-bold py-4 rounded-2xl hover:bg-navy/90 disabled:opacity-50 transition-colors">
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

    </MarketingLayout>
  )
}
