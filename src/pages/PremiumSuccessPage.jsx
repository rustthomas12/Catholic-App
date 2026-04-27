import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../hooks/useAuth.jsx'

const TIER_COPY = {
  supporter: {
    headline: 'Thank you for your support! 🙏',
    badge: 'Supporter',
  },
  member: {
    headline: 'Welcome, Member! ⭐',
    badge: 'Member',
  },
  patron: {
    headline: 'Thank you, Patron! 🙏',
    badge: 'Patron',
  },
  one_time: {
    headline: 'Thank you for your gift! ✝',
    badge: 'Benefactor',
  },
}

export default function PremiumSuccessPage() {
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const type = searchParams.get('type')    // 'one_time' or null
  const tier = searchParams.get('tier')    // 'supporter', 'member', 'patron', or null

  const copyKey = type === 'one_time' ? 'one_time' : (tier ?? 'supporter')
  const copy = TIER_COPY[copyKey] ?? TIER_COPY.supporter

  document.title = `${copy.headline} | Communio`

  useEffect(() => {
    // Refresh so badge appears immediately without page reload
    refreshProfile()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-cream md:pl-60 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <CheckCircleIcon className="w-20 h-20 text-gold mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-navy mb-2">{copy.headline}</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-2">
          Your generosity helps keep Communio free for every Catholic.
        </p>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          You've been given a <span className="font-semibold text-navy">{copy.badge}</span> badge on your profile.
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
