import { useLocation, useNavigate, Link } from 'react-router-dom'
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useState } from 'react'

export default function CheckEmailPage() {
  document.title = 'Check your email | Communio'

  const { state } = useLocation()
  const navigate  = useNavigate()
  const email     = state?.email || 'your email'

  const [resent,    setResent]    = useState(false)
  const [resending, setResending] = useState(false)

  async function handleResend() {
    setResending(true)
    await supabase.auth.resend({
      type: 'signup',
      email: state?.email,
      options: { emailRedirectTo: window.location.origin + '/onboarding' },
    })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 5000)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <div className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center mb-8 shadow-md">
        <svg viewBox="0 0 40 40" className="w-9 h-9">
          <rect width="40" height="40" rx="20" fill="#1B2A4A"/>
          <rect x="18" y="8" width="4" height="24" fill="#C9A84C"/>
          <rect x="10" y="16" width="20" height="4" fill="#C9A84C"/>
        </svg>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-md p-8 text-center">

        {/* Icon */}
        <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <EnvelopeIcon className="w-8 h-8 text-gold" />
        </div>

        <h1 className="text-xl font-bold text-navy mb-2">Check your inbox</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-1">
          We sent a verification link to
        </p>
        <p className="font-semibold text-navy text-sm mb-6 break-all">{email}</p>

        <p className="text-gray-500 text-xs leading-relaxed mb-8">
          Click the link in the email to verify your account and complete signup.
          Check your spam folder if you don't see it.
        </p>

        {/* Resend */}
        <button
          onClick={handleResend}
          disabled={resending || resent || !state?.email}
          className="w-full py-3 border border-gray-200 rounded-xl text-sm font-semibold text-navy hover:bg-lightbg transition-colors disabled:opacity-50 mb-3"
        >
          {resent ? '✓ Email resent' : resending ? 'Sending…' : 'Resend verification email'}
        </button>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-navy transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
