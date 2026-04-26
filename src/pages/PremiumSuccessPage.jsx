import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../hooks/useAuth.jsx'

export default function PremiumSuccessPage() {
  document.title = 'Welcome to Premium | Communio'

  const { refreshProfile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Refresh auth context so isPremium becomes true immediately
    refreshProfile()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-cream md:pl-60 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <CheckCircleIcon className="w-20 h-20 text-gold mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-navy mb-2">Welcome to Premium!</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Your subscription is active. Thank you for supporting Communio.
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="w-full bg-gold text-navy font-bold py-4 rounded-2xl text-base hover:bg-gold/90 transition-colors"
        >
          Go to Home
        </button>
      </div>
    </div>
  )
}
