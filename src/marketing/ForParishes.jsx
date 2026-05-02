import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MarketingLayout, { APP_URL } from './MarketingLayout'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'

const TIERS = [
  { label: 'Small', price: '$49', size: 'Under 200 parishioners', features: ['All platform features', 'Parish admin dashboard', 'Push notifications', '90-day free trial'] },
  { label: 'Medium', price: '$99', size: '200–500 parishioners', featured: true, features: ['Everything in Small', 'Priority support', 'CSV export', 'Scheduled posts'] },
  { label: 'Large', price: '$199', size: '500–1,500 parishioners', features: ['Everything in Medium', 'Multi-parish admin', 'Parish cluster support', 'Analytics'] },
  { label: 'Cathedral', price: '$349', size: '1,500+ parishioners', features: ['Everything in Large', 'Dedicated onboarding', 'Custom contract available'] },
]

const ADMIN_FEATURES = [
  { icon: '📊', title: 'Admin Dashboard', desc: 'Full control over your parish presence — posts, events, parishioners, and billing in one place.' },
  { icon: '📣', title: 'Push Announcements', desc: "Send important announcements that land directly on parishioners' phones — no algorithm, no spam filter." },
  { icon: '📅', title: 'Events & RSVPs', desc: 'Create events, set capacity, track who is going, and view a full attendee breakdown.' },
  { icon: '👥', title: 'Parishioner List', desc: 'See who follows your parish with name, vocation, and join date. Export to CSV anytime.' },
  { icon: '✏️', title: 'Mass Times Editor', desc: "Update your Mass schedule yourself — instantly visible to all followers. No webmaster needed." },
  { icon: '🤝', title: 'Groups Management', desc: 'Create and manage parish groups — Men\'s group, young adults, RCIA, Rosary Society, and more.' },
  { icon: '🔗', title: 'Parish Clusters', desc: 'Group multiple parishes under one pastoral name (e.g. "Carlo Acutis Parish"). Each site keeps its own page.' },
  { icon: '👨‍⚕️', title: 'Multi-Parish Clergy', desc: 'Pastors who serve multiple parishes can be set up as admin across all of them.' },
  { icon: '⏱', title: 'Scheduled Posts', desc: 'Write your Sunday bulletin post on Friday. Schedule it to go live at the right moment.' },
  { icon: '✉️', title: 'Inbox', desc: 'Receive direct messages from parishioners through a dedicated parish inbox.' },
]

function ParishApplicationForm() {
  const [form, setForm] = useState({ name: '', diocese: '', city: '', state: '', contact_name: '', contact_email: '', contact_phone: '', parishioners: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.contact_email || !form.name) return
    setSubmitting(true)
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
    if (error) {
      toast.error('Something went wrong. Please email us at hello@getcommunio.app')
    } else {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">✝</div>
        <h3 className="text-2xl font-black text-navy mb-2">Thank you!</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          We'll be in touch within 1–2 business days to get your parish set up on Communio.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5">Parish Name *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="St. Patrick's Parish"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5">Diocese</label>
          <input value={form.diocese} onChange={e => set('diocese', e.target.value)}
            placeholder="Diocese of Worcester"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5">City</label>
          <input value={form.city} onChange={e => set('city', e.target.value)}
            placeholder="Worcester"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5">State</label>
          <input value={form.state} onChange={e => set('state', e.target.value)}
            placeholder="MA"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5">Your Name *</label>
          <input required value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
            placeholder="Fr. John Smith"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5">Email *</label>
          <input required type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
            placeholder="pastor@stpatricks.org"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5">Phone (optional)</label>
          <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
            placeholder="(508) 555-0100"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5">Approximate # of Parishioners</label>
          <select value={form.parishioners} onChange={e => set('parishioners', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy appearance-none bg-white">
            <option value="">Select range</option>
            <option>Under 200</option>
            <option>200–500</option>
            <option>500–1,500</option>
            <option>1,500+</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-navy mb-1.5">Anything else you'd like us to know?</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          rows={3} placeholder="We have 3 linked churches, serve a bilingual community, etc."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none" />
      </div>
      <button type="submit" disabled={submitting || !form.name || !form.contact_email}
        className="w-full bg-navy text-white font-bold py-4 rounded-2xl hover:bg-navy/90 disabled:opacity-50 transition-colors">
        {submitting ? 'Submitting…' : 'Submit Parish Application'}
      </button>
      <p className="text-gray-400 text-xs text-center">We'll respond within 1–2 business days. 90-day free trial included.</p>
    </form>
  )
}

export default function ForParishesPage() {
  useEffect(() => { document.title = 'For Parishes — Communio' }, [])

  return (
    <MarketingLayout>

      {/* Hero */}
      <section className="bg-navy pt-32 pb-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-gold text-xs font-bold tracking-widest uppercase mb-4">For Pastors & Parish Staff</p>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Give your parishioners<br /><span className="text-gold">a home during the week.</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
            Replace scattered tools with one platform. Reach every parishioner
            with announcements that actually land — directly on their phone.
          </p>
          <a href="#apply" className="inline-block bg-gold text-navy font-bold px-8 py-4 rounded-2xl hover:bg-gold/90 transition-colors">
            Apply for Your Parish →
          </a>
        </div>
      </section>

      {/* Admin features */}
      <section className="bg-cream py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">Admin Tools</p>
            <h2 className="text-3xl md:text-4xl font-black text-navy">Everything a parish needs.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ADMIN_FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-navy text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-black text-navy">Simple flat pricing.<br />No per-seat fees.</h2>
            <p className="text-gray-500 mt-3">All plans include a 90-day free trial. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {TIERS.map((t, i) => (
              <div key={i} className={`rounded-2xl border p-7 flex flex-col ${t.featured ? 'bg-navy border-navy' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className={`text-xs font-bold tracking-widest uppercase mb-4 ${t.featured ? 'text-gold' : 'text-gray-400'}`}>{t.label}</div>
                <div className={`text-4xl font-black mb-1 ${t.featured ? 'text-white' : 'text-navy'}`}>{t.price}</div>
                <div className={`text-xs mb-5 ${t.featured ? 'text-white/50' : 'text-gray-400'}`}>/month · {t.size}</div>
                <ul className="space-y-2 flex-1">
                  {t.features.map((f, fi) => (
                    <li key={fi} className={`text-xs flex items-start gap-1.5 ${t.featured ? 'text-white/70' : 'text-gray-500'}`}>
                      <span className="text-gold mt-0.5">✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="bg-lightbg rounded-2xl p-6 text-center">
            <p className="text-navy font-semibold mb-1">All tiers include</p>
            <p className="text-gray-500 text-sm">Parish admin dashboard · Announcements & events · Mass times editor · Push notifications · Community feed · Faith content · 90-day free trial</p>
          </div>
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="bg-cream py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gold text-xs font-bold tracking-widest uppercase mb-3">Get Started</p>
            <h2 className="text-3xl md:text-4xl font-black text-navy mb-3">Parish Application</h2>
            <p className="text-gray-500">Fill this out and we'll get your parish set up with a free 90-day trial. We respond within 1–2 business days.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <ParishApplicationForm />
          </div>
          <p className="text-center text-gray-400 text-sm mt-6">
            Prefer email? Write us at{' '}
            <a href="mailto:hello@getcommunio.app" className="text-navy font-semibold hover:underline">hello@getcommunio.app</a>
          </p>
        </div>
      </section>

    </MarketingLayout>
  )
}
