import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../hooks/useAuth.jsx'
import { toast } from '../components/shared/Toast'

const TIERS = [
  {
    key: 'free',
    label: 'Free',
    price: '$0',
    period: 'always free',
    badge: null,
    badgeColor: null,
    description: 'Full access to everything.',
    priceId: null,
  },
  {
    key: 'supporter',
    label: 'Supporter',
    price: '$5',
    period: '/ month',
    badge: 'Supporter',
    badgeColor: 'bg-gray-400 text-white',
    description: 'Silver badge on your profile.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_SUPPORTER,
  },
  {
    key: 'member',
    label: 'Member ⭐',
    price: '$10',
    period: '/ month',
    badge: 'Member ⭐',
    badgeColor: 'bg-gold text-navy',
    description: 'Gold badge on your profile.',
    suggested: true,
    priceId: import.meta.env.VITE_STRIPE_PRICE_MEMBER,
  },
  {
    key: 'patron',
    label: 'Patron 🙏',
    price: '$25',
    period: '/ month',
    badge: 'Patron 🙏',
    badgeColor: 'bg-navy text-white',
    description: 'Navy badge on your profile.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_PATRON,
  },
]

const WHAT_YOU_GET = [
  'A badge on your profile',
  'Recognition in the supporter community',
  'The knowledge you\'re helping keep Communio free for everyone',
  'Nothing else — because nothing is locked',
]

const ONE_TIME_PRESETS = [10, 25, 50]

export default function PremiumPage() {
  useEffect(() => { document.title = 'Support the Mission | Communio' }, [])

  const { user, profile, donationTier, isDonor, isSupportedByParish, subscriptionStatus, refreshProfile } = useAuth()
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(null) // priceId of tier being loaded
  const [portalLoading, setPortalLoading] = useState(false)

  // One-time donation state
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [customAmount, setCustomAmount] = useState('')
  const [oneTimeLoading, setOneTimeLoading] = useState(false)

  // Parish sponsorship code state
  const [sponsorCode, setSponsorCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState(null)
  const [codeSuccess, setCodeSuccess] = useState(null)

  // Pre-fill code from QR scan: /premium?code=STPAT4
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) setSponsorCode(codeFromUrl.toUpperCase())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDollars = selectedPreset ?? (customAmount ? parseFloat(customAmount) : null)

  async function handleSubscribe(priceId) {
    if (!user) return
    setLoading(priceId)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          userEmail: user.email,
          mode: 'subscription',
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error('Something went wrong. Please try again.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  async function handleManage() {
    if (!profile?.stripe_customer_id) return
    setPortalLoading(true)
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeCustomerId: profile.stripe_customer_id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error('Something went wrong. Please try again.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleOneTimeDonation() {
    if (!user) return
    const cents = Math.round((selectedDollars || 0) * 100)
    if (!cents || cents < 100) {
      toast.error('Minimum donation is $1.00')
      return
    }
    setOneTimeLoading(true)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'payment',
          userId: user.id,
          userEmail: user.email,
          oneTimeAmount: cents,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error('Something went wrong. Please try again.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setOneTimeLoading(false)
    }
  }

  async function handleClaimCode(e) {
    e.preventDefault()
    if (!sponsorCode || sponsorCode.length !== 6) {
      setCodeError('Please enter a 6-character code.')
      return
    }
    setCodeLoading(true)
    setCodeError(null)
    setCodeSuccess(null)
    try {
      const res = await fetch('/api/claim-sponsorship-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sponsorCode.toUpperCase(), userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCodeError(data.error || 'Something went wrong.')
      } else {
        setCodeSuccess(`Premium activated by ${data.parishName}!`)
        await refreshProfile()
      }
    } catch {
      setCodeError('Network error. Please try again.')
    } finally {
      setCodeLoading(false)
    }
  }

  const isPastDue = subscriptionStatus === 'past_due'
  const tierSinceLabel = profile?.donation_tier_since
    ? format(parseISO(profile.donation_tier_since), 'MMMM yyyy')
    : null
  const tierDisplayName = {
    supporter: 'Supporter',
    member: 'Member',
    patron: 'Patron',
    benefactor: 'Benefactor',
  }[donationTier] ?? donationTier

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-gold">
              <path d="M10.5 3h3v6h6.5v3H13.5v9h-3V12H3.5V9h7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">Support the Mission</h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            Communio is free for everyone. If it has helped your faith life,
            consider supporting it so it stays that way.
          </p>
        </div>

        {/* Active donor thank-you banner */}
        {isDonor && !isPastDue && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 text-center">
            <CheckCircleIcon className="w-10 h-10 text-gold mx-auto mb-2" />
            <p className="font-bold text-navy">Thank you for supporting Communio</p>
            <p className="text-sm text-gray-500 mt-1">
              You're a <span className="font-semibold text-navy">{tierDisplayName}</span>
              {tierSinceLabel && <span className="text-gray-400"> · Since {tierSinceLabel}</span>}
            </p>
            {profile?.stripe_customer_id && (
              <button
                onClick={handleManage}
                disabled={portalLoading}
                className="mt-3 text-sm font-bold text-navy border border-gray-200 px-5 py-2 rounded-xl hover:border-navy transition-colors disabled:opacity-60"
              >
                {portalLoading ? 'Opening…' : 'Manage giving →'}
              </button>
            )}
          </div>
        )}

        {/* Parish-sponsored notice */}
        {isSupportedByParish && (
          <div className="bg-gold/10 rounded-2xl border border-gold/20 p-4 mb-6 text-center">
            <p className="text-navy font-semibold text-sm">Your parish is covering your Communio access. 🙏</p>
            <p className="text-gray-500 text-xs mt-1">
              You can still make an additional donation if you'd like to support the mission.
            </p>
          </div>
        )}

        {/* Past due warning */}
        {isPastDue && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Payment failed</p>
              <p className="text-xs text-amber-700 mt-0.5">Please update your payment method to keep your donor badge.</p>
              <button
                onClick={handleManage}
                disabled={portalLoading}
                className="mt-2 text-xs font-bold text-amber-800 underline hover:no-underline"
              >
                {portalLoading ? 'Opening…' : 'Update payment method'}
              </button>
            </div>
          </div>
        )}

        {/* Giving tier cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {TIERS.map((tier) => {
            const isCurrent = tier.key === (donationTier ?? 'free')
            const isLoadingThis = loading === tier.priceId

            return (
              <div
                key={tier.key}
                className={`bg-white rounded-2xl border-2 shadow-sm p-4 flex flex-col ${
                  isCurrent ? 'border-gold' : 'border-gray-100'
                } ${tier.suggested ? 'relative' : ''}`}
              >
                {tier.suggested && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gold text-navy text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    Suggested
                  </span>
                )}
                <p className="font-bold text-navy text-sm mb-1">{tier.label}</p>
                <p className="text-2xl font-bold text-navy leading-none">{tier.price}</p>
                <p className="text-xs text-gray-400 mb-3">{tier.period}</p>
                {tier.badge && (
                  <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full mb-3 ${tier.badgeColor}`}>
                    {tier.badge}
                  </span>
                )}
                <p className="text-xs text-gray-500 flex-1 mb-3">{tier.description}</p>

                {isCurrent ? (
                  <span className="text-xs font-bold text-gold text-center">Current</span>
                ) : tier.key === 'free' ? (
                  <span className="text-xs text-gray-300 text-center">Always free</span>
                ) : (
                  <button
                    onClick={() => handleSubscribe(tier.priceId)}
                    disabled={!!loading}
                    className="w-full py-2 bg-navy text-white text-xs font-bold rounded-xl hover:bg-navy/90 disabled:opacity-50 transition-colors"
                  >
                    {isLoadingThis ? 'Loading…' : 'Support →'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* What donors get */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">What you get</p>
          <ul className="space-y-2">
            {WHAT_YOU_GET.map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-navy">
                <CheckCircleIcon className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* One-time donation */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <p className="font-semibold text-navy text-sm mb-1">Make a one-time gift</p>
          <p className="text-xs text-gray-500 mb-4">
            One-time donors receive a <span className="font-semibold">Benefactor ✝</span> badge.
          </p>

          <div className="flex gap-2 mb-3">
            {ONE_TIME_PRESETS.map(amount => (
              <button
                key={amount}
                onClick={() => { setSelectedPreset(amount); setCustomAmount('') }}
                className={`flex-1 py-2 text-sm font-bold rounded-xl border-2 transition-colors ${
                  selectedPreset === amount
                    ? 'border-gold bg-gold/10 text-navy'
                    : 'border-gray-200 text-gray-600 hover:border-navy'
                }`}
              >
                ${amount}
              </button>
            ))}
            <div className={`flex-1 flex items-center border-2 rounded-xl px-3 transition-colors ${
              customAmount ? 'border-gold' : 'border-gray-200'
            }`}>
              <span className="text-sm text-gray-400 mr-1">$</span>
              <input
                type="number"
                min="1"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedPreset(null) }}
                placeholder="Other"
                className="w-full text-sm font-bold text-navy focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <button
            onClick={handleOneTimeDonation}
            disabled={!selectedDollars || oneTimeLoading}
            className="w-full py-3 bg-gold text-navy font-bold rounded-xl text-sm hover:bg-gold/90 disabled:opacity-40 transition-colors"
          >
            {oneTimeLoading
              ? 'Redirecting…'
              : selectedDollars
                ? `Give $${selectedDollars} →`
                : 'Give →'}
          </button>
        </div>

        {/* Parish sponsorship code — hidden if already parish-sponsored */}
        {!isSupportedByParish && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <p className="font-semibold text-navy text-sm mb-1">Parish-sponsored? Enter your code.</p>
            <p className="text-xs text-gray-500 mb-3">
              Some parishes sponsor Communio for their members. Enter your 6-character code below.
            </p>
            {codeSuccess ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-semibold">{codeSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleClaimCode} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={sponsorCode}
                    onChange={e => {
                      setSponsorCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                      setCodeError(null)
                    }}
                    placeholder="e.g. STPAT4"
                    maxLength={6}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-navy tracking-widest"
                  />
                  <button
                    type="submit"
                    disabled={sponsorCode.length !== 6 || codeLoading}
                    className="px-4 py-2 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy/90 disabled:opacity-40 transition-colors"
                  >
                    {codeLoading ? '…' : 'Apply'}
                  </button>
                </div>
                {codeError && <p className="text-xs text-red-500">{codeError}</p>}
              </form>
            )}
          </div>
        )}

        {/* Scripture */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-400 italic leading-relaxed">
            "Each of you should give what you have decided in your heart to give, not reluctantly
            or under compulsion, for God loves a cheerful giver."
          </p>
          <p className="text-xs text-gray-300 mt-1">— 2 Corinthians 9:7</p>
        </div>

        <p className="text-center text-xs text-gray-300 mt-4">
          Communio is not a registered 501(c)(3). Gifts are not tax-deductible.
        </p>

      </div>
    </div>
  )
}
