import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'

const REASONS = [
  'I found a bug',
  'I have a feature request',
  'I need help with my account',
  'I have a question about my parish',
  'Something is not working',
  'Other',
]

export default function AppContactPage() {
  useEffect(() => { document.title = 'Contact Us | Communio' }, [])

  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)

    const { error } = await supabase.from('contact_submissions').insert({
      name:    profile?.full_name || null,
      email:   user?.email || null,
      reason:  reason || null,
      message: message.trim(),
    })

    if (error) {
      toast.error('Could not send message. Please email us directly at info@getcommunio.app')
    } else {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* Header */}
        <div className="bg-navy px-4 pt-5 pb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white p-1 transition-colors">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <p className="text-gold text-xs font-semibold uppercase tracking-widest">Support</p>
              <h1 className="text-white font-bold text-xl">Contact Us</h1>
            </div>
          </div>
        </div>

        <div className="px-4 pt-6 space-y-5">

          {submitted ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="text-5xl mb-4">✝</div>
              <h2 className="font-black text-navy text-xl mb-2">Message sent!</h2>
              <p className="text-gray-500 text-sm mb-6">
                We'll get back to you within 1–2 business days.
              </p>
              <button
                onClick={() => navigate(-1)}
                className="text-navy font-semibold text-sm hover:underline"
              >
                ← Back to settings
              </button>
            </div>
          ) : (
            <>
              {/* Email contact card */}
              <a
                href="mailto:info@getcommunio.app"
                className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <EnvelopeIcon className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <p className="font-semibold text-navy text-sm">Email us directly</p>
                  <p className="text-gold text-sm font-medium">info@getcommunio.app</p>
                </div>
              </a>

              {/* Contact form */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-navy text-base mb-4">Send a message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">

                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1.5">
                      What's this about?
                    </label>
                    <select
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-navy focus:outline-none focus:border-navy appearance-none bg-white"
                    >
                      <option value="">Select a topic</option>
                      {REASONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1.5">
                      Your message *
                    </label>
                    <textarea
                      required
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      rows={5}
                      placeholder="Describe what you're experiencing or what you'd like to share…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy resize-none"
                    />
                  </div>

                  {/* Auto-filled info note */}
                  {user?.email && (
                    <p className="text-xs text-gray-400">
                      We'll reply to <span className="font-medium text-gray-500">{user.email}</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="w-full bg-navy text-white font-bold py-3.5 rounded-2xl hover:bg-navy/90 disabled:opacity-50 transition-colors min-h-[48px]"
                  >
                    {submitting ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              </div>

              <p className="text-center text-xs text-gray-400 pb-2">
                We typically respond within 1–2 business days.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
