import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircleIcon, ClockIcon, EnvelopeIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline'

const STEPS = [
  {
    icon: CheckCircleIcon,
    title: 'Application submitted',
    body: 'Your billing information has been received and your 90-day free trial has started.',
    done: true,
  },
  {
    icon: ClockIcon,
    title: 'Under review',
    body: 'Our team will verify your pastoral role — typically within 1–2 business days.',
    done: false,
  },
  {
    icon: BuildingLibraryIcon,
    title: 'Parish activated',
    body: "Once approved, you'll receive an email and your parish dashboard will be unlocked.",
    done: false,
  },
]

export default function PastorVerificationPendingPage() {
  useEffect(() => { document.title = 'Application Submitted | Communio' }, [])
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
            Application received!
          </h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-xs">
            Thank you for registering your parish on Communio. Here&rsquo;s what happens next.
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
                    <s.icon className={`w-5 h-5 ${s.done ? 'text-navy' : 'text-gray-400'}`} />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px h-6 bg-gray-100 mt-1" />
                  )}
                </div>
                <div className="pt-1 pb-1">
                  <p className={`text-sm font-semibold ${s.done ? 'text-navy' : 'text-gray-400'}`}>
                    {s.title}
                    {i === 1 && (
                      <span className="ml-2 inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        In progress
                      </span>
                    )}
                  </p>
                  <p className={`text-xs mt-0.5 leading-relaxed ${s.done ? 'text-gray-500' : 'text-gray-400'}`}>
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info note */}
        <div className="bg-navy/5 border border-navy/10 rounded-xl px-4 py-3 mb-7 text-sm text-navy/70 leading-relaxed">
          <span className="font-semibold text-navy">What to expect:</span> You&rsquo;ll receive an email at your registered address once your account is approved. No action is needed on your end.
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {parishId && (
            <Link
              to={`/parish/${parishId}`}
              className="w-full bg-navy text-white text-sm font-semibold py-3.5 rounded-xl text-center hover:bg-opacity-90 transition-colors min-h-[52px] flex items-center justify-center"
            >
              View your parish page
            </Link>
          )}
          <Link
            to="/"
            className={`w-full text-sm font-semibold py-3.5 rounded-xl text-center transition-colors min-h-[52px] flex items-center justify-center ${
              parishId
                ? 'text-gray-400 hover:text-navy'
                : 'bg-navy text-white hover:bg-opacity-90'
            }`}
          >
            Go to the app
          </Link>
        </div>

      </div>
    </div>
  )
}
