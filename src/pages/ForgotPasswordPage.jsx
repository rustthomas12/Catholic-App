import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { EnvelopeIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from '../utils/i18n'
import { useAuth } from '../hooks/useAuth.jsx'
import Input from '../components/shared/Input'
import Button from '../components/shared/Button'

export default function ForgotPasswordPage() {
  useEffect(() => { document.title = 'Forgot Password | Communio' }, [])
  const { t } = useTranslation('auth')
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    setError('')
    setLoading(true)
    await resetPassword(email)
    // Always show success — never reveal if email is registered
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mb-4 shadow-md">
          <LockClosedIcon className="w-8 h-8 text-gold" />
        </div>
        <h1 className="text-2xl font-bold text-navy">{t('forgot.title')}</h1>
        <p className="text-gray-500 mt-1 text-sm text-center">{t('forgot.subtitle')}</p>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-md p-8">
        {submitted ? (
          <div className="flex flex-col items-center text-center gap-4">
            <CheckCircleIcon className="w-14 h-14 text-green-500" />
            <div>
              <p className="font-semibold text-navy text-lg">Check your email</p>
              <p className="text-gray-500 text-sm mt-1">
                If an account exists for <span className="font-medium text-navy">{email}</span>, we sent a reset link.
              </p>
              <p className="text-gray-400 text-xs mt-2">The link expires in 1 hour.</p>
            </div>
            <Link to="/login" className="text-navy font-semibold text-sm hover:underline mt-2">
              {t('forgot.back_to_login')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label={t('forgot.email')}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              icon={EnvelopeIcon}
              required
              autoComplete="email"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={loading} fullWidth disabled={!email} className="min-h-[48px]">
              {t('forgot.submit')}
            </Button>
            <Link to="/login" className="text-center text-sm text-navy font-medium hover:underline">
              {t('forgot.back_to_login')}
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
