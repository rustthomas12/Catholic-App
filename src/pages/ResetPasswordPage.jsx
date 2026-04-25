import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from '../utils/i18n'
import { supabase } from '../lib/supabase'
import Input from '../components/shared/Input'
import Button from '../components/shared/Button'

function passwordStrength(pw) {
  if (!pw || pw.length < 8) return { level: 0, label: 'Too short', color: 'bg-red-400' }
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw) || /\d/.test(pw)
  if (hasSpecial) return { level: 2, label: 'Strong', color: 'bg-green-500' }
  return { level: 1, label: 'Good', color: 'bg-orange-400' }
}

export default function ResetPasswordPage() {
  document.title = 'Reset Password | Communio'
  const { t } = useTranslation('auth')
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(3)

  const strength = passwordStrength(password)

  useEffect(() => {
    if (!success) return
    const interval = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) { clearInterval(interval); navigate('/login', { replace: true }); return 0 }
        return n - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [success, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError(t('signup.error_password_match') || 'Passwords do not match'); return }
    if (password.length < 8) { setError(t('signup.error_password_weak')); return }
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        setError('Reset link has expired. Please request a new one.')
      } else {
        setError(error.message)
      }
    } else {
      setSuccess(true)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mb-4 shadow-md">
          <LockClosedIcon className="w-8 h-8 text-gold" />
        </div>
        <h1 className="text-2xl font-bold text-navy">{t('reset.title')}</h1>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-md p-8">
        {success ? (
          <div className="flex flex-col items-center text-center gap-4">
            <CheckCircleIcon className="w-14 h-14 text-green-500" />
            <div>
              <p className="font-semibold text-navy text-lg">{t('reset.success')}</p>
              <p className="text-gray-400 text-sm mt-2">Redirecting in {countdown}...</p>
            </div>
            <Link to="/login" className="text-navy font-semibold text-sm hover:underline">
              Sign in now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Input
                label={t('reset.password')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New password"
                icon={LockClosedIcon}
                rightIcon={showPassword ? EyeSlashIcon : EyeIcon}
                onRightIconClick={() => setShowPassword(v => !v)}
                required
                autoComplete="new-password"
              />
              {password.length > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.level - 1 ? strength.color : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{strength.label}</span>
                </div>
              )}
            </div>

            <Input
              label={t('reset.confirm')}
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              icon={LockClosedIcon}
              required
              autoComplete="new-password"
            />

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
                {error.includes('expired') && (
                  <span> <Link to="/forgot-password" className="underline font-medium">Request a new one</Link></span>
                )}
              </div>
            )}

            <Button type="submit" loading={loading} fullWidth
              disabled={!password || password !== confirm || password.length < 8}
              className="min-h-[48px]">
              {t('reset.submit')}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
