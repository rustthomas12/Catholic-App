import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTranslation } from '../utils/i18n'
import Input from '../components/shared/Input'
import Button from '../components/shared/Button'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import LanguageSwitcher from '../components/shared/LanguageSwitcher'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { signIn, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Redirect already-authenticated users
  useEffect(() => {
    if (!loading && isAuthenticated) navigate(returnUrl, { replace: true })
  }, [isAuthenticated, loading, navigate, returnUrl])

  if (loading) return <LoadingSpinner fullPage />

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return
    setError('')
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error)
      setPassword('')
    } else {
      navigate(returnUrl, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      {/* Language switcher — top right, accessible before login */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher variant="compact" />
      </div>
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mb-4 shadow-md">
          <svg viewBox="0 0 40 40" className="w-10 h-10">
            <rect width="40" height="40" rx="20" fill="#1B2A4A"/>
            <rect x="18" y="8" width="4" height="24" fill="#C9A84C"/>
            <rect x="10" y="16" width="20" height="4" fill="#C9A84C"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-navy">{t('login.title')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{tc('app.tagline')}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-md p-8 md:p-10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label={t('login.email')}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={EnvelopeIcon}
            required
            autoComplete="email"
          />

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold text-navy">{t('login.password')}</label>
              <Link to="/forgot-password" className="text-xs text-gold hover:underline">
                {t('login.forgot')}
              </Link>
            </div>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={LockClosedIcon}
              rightIcon={showPassword ? EyeSlashIcon : EyeIcon}
              onRightIconClick={() => setShowPassword(v => !v)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700 animate-in fade-in">
              <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" loading={submitting} fullWidth disabled={!email || !password} className="min-h-[48px] mt-1">
            {t('login.submit')}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('login.no_account')}{' '}
          <Link to="/signup" className="text-navy font-semibold hover:underline">
            {t('login.sign_up')}
          </Link>
        </p>
      </div>

      <p className="text-xs text-gray-400 mt-8 text-center">Made with faith in Massachusetts</p>
    </div>
  )
}
