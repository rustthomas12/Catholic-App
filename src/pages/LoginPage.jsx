import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import Input from '../components/shared/Input'
import Button from '../components/shared/Button'
import { toast } from '../components/shared/Toast'

export default function LoginPage() {
  document.title = 'Sign In | Parish App'

  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('Invalid email or password. Please try again.')
    } else {
      navigate(returnUrl, { replace: true })
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
        <h1 className="text-2xl font-bold text-navy">Welcome back</h1>
        <p className="text-gray-500 mt-1 text-sm">Sign in to your parish community</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={EnvelopeIcon}
            required
            autoComplete="email"
            error={error ? ' ' : ''}
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={LockClosedIcon}
            rightIcon={showPassword ? EyeSlashIcon : EyeIcon}
            onRightIconClick={() => setShowPassword(v => !v)}
            required
            autoComplete="current-password"
            error={error}
          />

          <div className="flex justify-end -mt-1">
            <Link to="/forgot-password" className="text-sm text-gold hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" loading={loading} fullWidth className="mt-1">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Don't have an account?{' '}
          <Link to="/signup" className="text-navy font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>

      <p className="text-xs text-gray-400 mt-8 text-center max-w-xs">
        Made with faith in Massachusetts
      </p>
    </div>
  )
}
