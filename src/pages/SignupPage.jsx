import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EnvelopeIcon, LockClosedIcon, UserIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import Input from '../components/shared/Input'
import Button from '../components/shared/Button'

const VOCATIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'religious', label: 'Religious' },
  { value: 'ordained', label: 'Ordained' },
]

export default function SignupPage() {
  document.title = 'Sign Up | Parish App'

  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [vocation, setVocation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!fullName.trim()) e.fullName = 'Name is required'
    if (!email) e.email = 'Email is required'
    if (password.length < 8) e.password = 'Password must be at least 8 characters'
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match'
    if (!agreed) e.agreed = 'You must agree to continue'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    const { error } = await signUp(email, password, { fullName, vocationState: vocation || null })
    setLoading(false)
    if (error) {
      setErrors({ submit: error.message })
    } else {
      navigate('/onboarding', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mb-4 shadow-md">
          <svg viewBox="0 0 40 56" className="w-8 h-10 fill-gold">
            <path d="M17 0h6v16h16v6H23v34h-6V22H0v-6h17z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-navy">Join your parish community</h1>
        <p className="text-gray-500 mt-1 text-sm">Connect with Catholics near you</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Thomas Rust"
            icon={UserIcon}
            required
            error={errors.fullName}
            autoComplete="name"
          />
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={EnvelopeIcon}
            required
            error={errors.email}
            autoComplete="email"
          />
          <Input
            label="Password"
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
          <Input
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            icon={LockClosedIcon}
            required
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          {/* Vocation picker */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">
              I am... <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {VOCATIONS.map(v => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVocation(vocation === v.value ? '' : v.value)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    vocation === v.value
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-navy border-gray-200 hover:border-navy'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 accent-navy"
            />
            <span className="text-sm text-gray-500">
              I agree to the{' '}
              <Link to="/terms" className="text-navy underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-navy underline">Privacy Policy</Link>
            </span>
          </label>
          {errors.agreed && <p className="text-sm text-red-500 -mt-2">{errors.agreed}</p>}
          {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}

          <Button type="submit" loading={loading} fullWidth className="mt-1">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-navy font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
