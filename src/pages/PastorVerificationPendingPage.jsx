import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircleIcon, ClockIcon, EnvelopeIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

const STEPS = [
  {
    icon: CheckCircleIcon,
    key: 'submitted',
    title: 'Application submitted',
    body: 'Your 90-day free trial has started. No card needed until it ends.',
    done: true,
  },
  {
    icon: ClockIcon,
    key: 'review',
    title: 'Under review',
    body: 'Your parish page is live now. Our team will verify your role, typically within 1–2 business days.',
    done: false,
  },
  {
    icon: BuildingLibraryIcon,
    key: 'activated',
    title: 'Parish activated',
    body: "Once approved, announcements, events and notifications unlock. Meanwhile you can set up Mass times and parish details.",
    done: false,
  },
]

export default function PastorVerificationPendingPage() {
  const { t } = useTranslation()
  useEffect(() => { document.title = 'Application Submitted | inFold' }, [])
  const [params] = useSearchParams()
  const parishId = params.get('parish_id')

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Icon + heading */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-navy rounded-full flex items-center justify-center mb-5 shadow-lg">
            <EnvelopeIcon className="w-9 h-9 text-gold" />
          </div>
          <h1 className="text-2xl font-bold text-navy leading-tight">
            {t('parish:pending.application_received', 'Application received!')}
          </h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-xs">
            {t('parish:pending.thanks', 'Thank you for registering your parish on inFold. Here’s what happens next.')}
          </p>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col gap-5">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-4">
                {/* Line connector */}
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    s.done ? 'bg-gold' : 'bg-gray-100'
                  }`}>
                    <s.icon className={`w-5 h-5 ${s.done ? 'text-navy' : 'text-gray-500'}`} />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px h-6 bg-gray-100 mt-1" />
                  )}
                </div>
                <div className="pt-1 pb-1">
                  <p className={`text-sm font-semibold ${s.done ? 'text-navy' : 'text-gray-500'}`}>
                    {t(`parish:pending.step_${s.key}_title`, s.title)}
                    {i === 1 && (
                      <span className="ml-2 inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {t('parish:pending.in_progress', 'In progress')}
                      </span>
                    )}
                  </p>
                  <p className={`text-xs mt-0.5 leading-relaxed ${s.done ? 'text-gray-500' : 'text-gray-500'}`}>
                    {t(`parish:pending.step_${s.key}_body`, s.body)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info note */}
        <div className="bg-navy/5 border border-navy/10 rounded-xl px-4 py-3 mb-7 text-sm text-navy/70 leading-relaxed">
          <span className="font-semibold text-navy">{t('parish:pending.what_to_expect', 'What to expect:')}</span> {t('parish:pending.expect_text', 'You’ll get a notification once you’re verified. Until then, set up Mass times and parish details from your dashboard.')}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {parishId && (
            <Link
              to={`/parish-admin/${parishId}?tab=masstimes`}
              className="w-full bg-gold text-navy text-sm font-semibold py-3.5 rounded-xl text-center hover:bg-gold/90 transition-colors min-h-[52px] flex items-center justify-center"
            >
              {t('parish:pending.open_dashboard', 'Open your parish dashboard')}
            </Link>
          )}
          {parishId && (
            <Link
              to={`/parish/${parishId}`}
              className="w-full bg-navy text-white text-sm font-semibold py-3.5 rounded-xl text-center hover:bg-opacity-90 transition-colors min-h-[52px] flex items-center justify-center"
            >
              {t('parish:pending.view_your_parish_page', 'View your parish page')}
            </Link>
          )}
          <Link
            to="/"
            className={`w-full text-sm font-semibold py-3.5 rounded-xl text-center transition-colors min-h-[52px] flex items-center justify-center ${
              parishId
                ? 'text-gray-500 hover:text-navy'
                : 'bg-navy text-white hover:bg-opacity-90'
            }`}
          >
            {t('parish:pending.go_to_the_app', 'Go to the app')}
          </Link>
        </div>

      </div>
    </div>
  )
}
