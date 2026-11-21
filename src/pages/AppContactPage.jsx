import { useState, useEffect } from 'react'
import TopBar from '../components/shared/TopBar'
import { EnvelopeIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'
import useGoBack from '../hooks/useGoBack'
import { useTranslation } from 'react-i18next'
import SacredIcon from '../components/shared/SacredIcon'

const REASONS = [
  'I found a bug',
  'I have a feature request',
  'I need help with my account',
  'I have a question about my parish',
  'Something is not working',
  'Other',
]

export default function AppContactPage() {
  const { t } = useTranslation()
  useEffect(() => { document.title = `${t('common:contact.contact_us', 'Contact Us')} | inFold` }, [t])

  const goBack = useGoBack('/settings')
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
      toast.error(t('common:contact.could_not_send_message_please_email', 'Could not send message. Please email us directly at info@getinfold.app'))
    } else {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* Header */}
        <TopBar variant="navy" title={t('common:contact.contact_us', 'Contact Us')} back />
        <div className="bg-navy px-4 pb-5">
          <p className="text-gold text-xs font-semibold uppercase tracking-widest ml-10">{t('common:contact.support', 'Support')}</p>
        </div>

        <div className="px-4 pt-6 space-y-5">

          {submitted ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="mb-4 text-gold"><SacredIcon name="cross" className="w-12 h-12" /></div>
              <h2 className="font-black text-navy text-xl mb-2">{t('common:contact.message_sent', 'Message sent!')}</h2>
              <p className="text-gray-500 text-sm mb-6">
                {t('common:contact.we_ll_get_back_to_you', "We'll get back to you within 1–2 business days.")}
              </p>
              <button
                onClick={goBack}
                className="text-navy font-semibold text-sm hover:underline"
              >
                ← Back to settings
              </button>
            </div>
          ) : (
            <>
              {/* Email contact card */}
              <a
                href="mailto:info@getinfold.app"
                className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <EnvelopeIcon className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <p className="font-semibold text-navy text-sm">{t('common:contact.email_us_directly', 'Email us directly')}</p>
                  <p className="text-gold text-sm font-medium">info@getinfold.app</p>
                </div>
              </a>

              {/* Contact form */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-navy text-base mb-4">{t('common:contact.send_a_message', 'Send a message')}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">

                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1.5">
                      {t('common:contact.what_s_this_about', "What's this about?")}
                    </label>
                    <select aria-label={t('common:contact.what_s_this_about', "What's this about?")}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-navy focus:outline-none focus:border-navy appearance-none bg-white"
                    >
                      <option value="">{t('common:contact.select_a_topic', 'Select a topic')}</option>
                      {REASONS.map((r, i) => <option key={r} value={r}>{t(`common:contact.reason_${i}`, r)}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1.5">
                      {t('common:contact.your_message', 'Your message *')}
                    </label>
                    <textarea
                      required
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      rows={5}
                      placeholder={t('common:contact.describe_what_you_re_experiencing_or', "Describe what you're experiencing or what you'd like to share…")}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy resize-none"
                    />
                  </div>

                  {/* Auto-filled info note */}
                  {user?.email && (
                    <p className="text-xs text-gray-500">
                      {t('common:contact.reply_to', "We'll reply to")} <span className="font-medium text-gray-500">{user.email}</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="w-full bg-navy text-white font-bold py-3.5 rounded-2xl hover:bg-navy/90 disabled:opacity-50 transition-colors min-h-[48px]"
                  >
                    {submitting ? t('common:contact.sending', 'Sending…') : t('common:contact.send_message', 'Send Message')}
                  </button>
                </form>
              </div>

              <p className="text-center text-xs text-gray-500 pb-2">
                {t('common:contact.we_typically_respond_within_1_2', 'We typically respond within 1–2 business days.')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
