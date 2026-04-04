import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  EnvelopeIcon, LockClosedIcon, UserIcon, EyeIcon, EyeSlashIcon,
  ExclamationCircleIcon, CheckIcon, XMarkIcon, BuildingLibraryIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTranslation } from '../utils/i18n'
import { supabase } from '../lib/supabase'
import Input from '../components/shared/Input'
import Button from '../components/shared/Button'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const VOCATIONS = [
  { value: 'single', emoji: '🙏', key: 'vocation_single' },
  { value: 'married', emoji: '💒', key: 'vocation_married' },
  { value: 'religious', emoji: '✝️', key: 'vocation_religious' },
  { value: 'ordained', emoji: '🕊️', key: 'vocation_ordained' },
]

function passwordStrength(pw) {
  if (!pw || pw.length < 8) return { level: 0, label: 'Too short', color: 'bg-red-400' }
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw) || /\d/.test(pw)
  if (hasSpecial) return { level: 2, label: 'Strong', color: 'bg-green-500' }
  return { level: 1, label: 'Good', color: 'bg-orange-400' }
}

export default function SignupPage() {
  const { t } = useTranslation('auth')
  const { signUp, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [vocation, setVocation] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  // Parish search
  const [parishQuery, setParishQuery] = useState('')
  const [parishResults, setParishResults] = useState([])
  const [parishSearching, setParishSearching] = useState(false)
  const [selectedParish, setSelectedParish] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const parishDebounce = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!loading && isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, loading, navigate])

  // Parish search debounce
  useEffect(() => {
    if (!parishQuery || parishQuery.length < 2) {
      setParishResults([])
      setShowDropdown(false)
      return
    }
    clearTimeout(parishDebounce.current)
    parishDebounce.current = setTimeout(async () => {
      setParishSearching(true)
      const { data } = await supabase
        .from('parishes')
        .select('id, name, city, state, diocese')
        .or(`name.ilike.%${parishQuery}%,zip.eq.${parishQuery}`)
        .limit(8)
      setParishResults(data || [])
      setShowDropdown(true)
      setParishSearching(false)
    }, 400)
    return () => clearTimeout(parishDebounce.current)
  }, [parishQuery])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const strength = passwordStrength(password)
  const confirmMatch = confirm.length > 0 && confirm === password
  const confirmMismatch = confirm.length > 0 && confirm !== password

  function validate() {
    const e = {}
    if (!fullName.trim() || fullName.trim().length < 2) e.fullName = 'Enter your full name'
    if (!email || !/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email'
    if (password.length < 8) e.password = t('signup.error_password_weak')
    if (password !== confirm) e.confirm = t('signup.error_password_match') || 'Passwords do not match'
    if (!vocation) e.vocation = 'Please select your vocation'
    if (!agreed) e.agreed = 'You must agree to continue'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSubmitError('')
    setSubmitting(true)
    const { error } = await signUp(email, password, {
      fullName: fullName.trim(),
      parishId: selectedParish?.id || null,
      vocationState: vocation,
    })
    setSubmitting(false)
    if (error) {
      setSubmitError(error)
    } else {
      navigate('/onboarding', { replace: true })
    }
  }

  if (loading) return <LoadingSpinner fullPage />

  const canSubmit = fullName.trim().length >= 2 && email && password.length >= 8 &&
    password === confirm && vocation && agreed && !submitting

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center mb-3 shadow-md">
          <svg viewBox="0 0 40 40" className="w-9 h-9">
            <rect width="40" height="40" rx="20" fill="#1B2A4A"/>
            <rect x="18" y="8" width="4" height="24" fill="#C9A84C"/>
            <rect x="10" y="16" width="20" height="4" fill="#C9A84C"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-navy">{t('signup.title')}</h1>
        <p className="text-gray-500 mt-0.5 text-sm">{t('signup.subtitle')}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-md p-6 md:p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Name + Email */}
          <Input
            label={t('signup.full_name')}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Thomas Rust"
            icon={UserIcon}
            required
            error={errors.fullName}
            autoComplete="name"
          />
          <Input
            label={t('signup.email')}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={EnvelopeIcon}
            required
            error={errors.email}
            autoComplete="email"
          />

          {/* Password */}
          <div>
            <Input
              label={t('signup.password')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              icon={LockClosedIcon}
              rightIcon={showPassword ? EyeSlashIcon : EyeIcon}
              onRightIconClick={() => setShowPassword(v => !v)}
              required
              error={errors.password}
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

          {/* Confirm password */}
          <div className="relative">
            <Input
              label={t('signup.confirm_password')}
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              icon={LockClosedIcon}
              required
              error={errors.confirm}
              autoComplete="new-password"
            />
            {confirmMatch && (
              <CheckIcon className="absolute right-3 top-9 w-5 h-5 text-green-500 pointer-events-none" />
            )}
            {confirmMismatch && (
              <XMarkIcon className="absolute right-3 top-9 w-5 h-5 text-red-500 pointer-events-none" />
            )}
          </div>

          {/* Parish search */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-semibold text-navy mb-1">
              {t('signup.parish')} <span className="text-gray-400 font-normal">(optional)</span>
            </label>

            {selectedParish ? (
              <div className="flex items-center gap-3 bg-lightbg border border-gray-200 rounded-lg px-3 py-2.5">
                <BuildingLibraryIcon className="w-5 h-5 text-navy flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{selectedParish.name}</p>
                  <p className="text-xs text-gray-500">{selectedParish.city}, {selectedParish.state}</p>
                </div>
                <button type="button" onClick={() => { setSelectedParish(null); setParishQuery('') }}
                  className="text-gray-400 hover:text-navy p-1">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <BuildingLibraryIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={parishQuery}
                    onChange={e => setParishQuery(e.target.value)}
                    onFocus={() => parishResults.length > 0 && setShowDropdown(true)}
                    placeholder={t('signup.parish_placeholder')}
                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2.5 text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold text-sm"
                  />
                  {parishSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>

                {showDropdown && parishResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    {parishResults.map(p => (
                      <button key={p.id} type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-lightbg transition-colors border-b border-gray-50 last:border-0"
                        onClick={() => { setSelectedParish(p); setParishQuery(''); setShowDropdown(false) }}>
                        <p className="text-sm font-semibold text-navy">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.city}, {p.state}</p>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && parishResults.length === 0 && parishQuery.length >= 2 && !parishSearching && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-3 text-sm text-gray-500">
                    No parishes found. Try a different search.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Vocation */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">{t('signup.vocation')}</label>
            <div className="grid grid-cols-2 gap-2">
              {VOCATIONS.map(v => (
                <button key={v.value} type="button"
                  onClick={() => setVocation(vocation === v.value ? '' : v.value)}
                  className={`flex items-center gap-2 py-3 px-3 rounded-xl border-2 text-sm font-medium transition-all min-h-[52px] ${
                    vocation === v.value
                      ? 'border-navy bg-navy text-white'
                      : 'border-gray-200 bg-white text-navy hover:border-navy'
                  }`}>
                  <span className="text-lg leading-none">{v.emoji}</span>
                  <span>{t(`signup.${v.key}`)}</span>
                </button>
              ))}
            </div>
            {errors.vocation && <p className="mt-1 text-sm text-red-600">{errors.vocation}</p>}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-navy flex-shrink-0" />
            <span className="text-sm text-gray-500 leading-snug">
              {t('signup.terms').split('Terms of Service')[0]}
              <Link to="/terms" target="_blank" className="text-navy underline">Terms of Service</Link>
              {' and '}
              <Link to="/privacy" target="_blank" className="text-navy underline">Privacy Policy</Link>
            </span>
          </label>
          {errors.agreed && <p className="text-sm text-red-600 -mt-2">{errors.agreed}</p>}

          {submitError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
              <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <Button type="submit" loading={submitting} fullWidth disabled={!canSubmit} className="min-h-[48px]">
            {t('signup.submit')}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          {t('signup.has_account')}{' '}
          <Link to="/login" className="text-navy font-semibold hover:underline">{t('signup.sign_in')}</Link>
        </p>
      </div>
    </div>
  )
}
