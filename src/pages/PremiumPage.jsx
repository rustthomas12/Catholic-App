import { useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../hooks/useAuth.jsx'
import { toast } from '../components/shared/Toast'

const FEATURES = [
  'Peer-to-peer direct messaging',
  'Confession tracker & prayer journal',
  'Examination of conscience guide',
  'Full saint biographies',
  'Unlimited group creation',
  'Support the mission of Communio',
]

function CheckItem({ text }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircleIcon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
      <span className="text-sm text-navy">{text}</span>
    </li>
  )
}

export default function PremiumPage() {
  document.title = 'Go Premium | Communio'

  const { user, profile, isPremium, subscriptionStatus, subscriptionInterval } = useAuth()
  const [interval, setInterval] = useState('year')
  const [loading, setLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [sponsorCode, setSponsorCode] = useState('')

  const monthlyPriceId = import.meta.env.VITE_STRIPE_PRICE_MONTHLY
  const yearlyPriceId  = import.meta.env.VITE_STRIPE_PRICE_YEARLY

  async function handleSubscribe() {
    if (!user) return
    setLoading(true)
    try {
      const priceId = interval === 'year' ? yearlyPriceId : monthlyPriceId
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id, userEmail: user.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      window.location.href = data.url
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
      setLoading(false)
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
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      window.location.href = data.url
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
      setPortalLoading(false)
    }
  }

  function handleSponsorCode(e) {
    e.preventDefault()
    alert('Parish sponsorship codes are coming soon. Check with your pastor.')
  }

  const isPastDue = subscriptionStatus === 'past_due'
  const renewsAt = profile?.premium_expires_at
    ? format(parseISO(profile.premium_expires_at), 'MMMM d, yyyy')
    : null
  const planLabel = subscriptionInterval === 'year' ? 'Yearly plan' : subscriptionInterval === 'month' ? 'Monthly plan' : null

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-gold">
              <path d="M10.5 3h3v6h6.5v3H13.5v9h-3V12H3.5V9h7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">Go Premium</h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            Support Communio and unlock the full experience.
          </p>
        </div>

        {/* Past due warning */}
        {isPastDue && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Payment failed</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Please update your payment method to keep premium access.
              </p>
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

        {/* Current subscriber state */}
        {isPremium && !isPastDue ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 text-center">
            <CheckCircleIcon className="w-12 h-12 text-gold mx-auto mb-2" />
            <p className="font-bold text-navy text-lg">You're a Premium member</p>
            {planLabel && (
              <p className="text-sm text-gray-500 mt-1">{planLabel}</p>
            )}
            {renewsAt && (
              <p className="text-xs text-gray-400 mt-0.5">Renews {renewsAt}</p>
            )}
            <button
              onClick={handleManage}
              disabled={portalLoading}
              className="mt-4 text-sm font-bold text-navy border border-gray-200 px-5 py-2.5 rounded-xl hover:border-navy transition-colors disabled:opacity-60"
            >
              {portalLoading ? 'Opening…' : 'Manage subscription →'}
            </button>
          </div>
        ) : (
          <>
            {/* Interval toggle */}
            <div className="flex items-center justify-center gap-1 mb-5">
              <button
                onClick={() => setInterval('month')}
                className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-colors ${
                  interval === 'month' ? 'bg-navy text-white' : 'text-gray-400 hover:text-navy'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval('year')}
                className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-colors ${
                  interval === 'year' ? 'bg-navy text-white' : 'text-gray-400 hover:text-navy'
                }`}
              >
                Yearly
                <span className="ml-1.5 text-[10px] font-bold bg-gold text-navy px-1.5 py-0.5 rounded-full">
                  save 33%
                </span>
              </button>
            </div>

            {/* Pricing cards */}
            <div className="space-y-3 mb-6">
              {/* Monthly card */}
              <div
                onClick={() => setInterval('month')}
                className={`bg-white rounded-2xl border-2 shadow-sm p-5 cursor-pointer transition-colors ${
                  interval === 'month' ? 'border-navy' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-navy">Individual Premium</p>
                    <p className="text-xs text-gray-500 mt-0.5">Monthly billing</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-navy">$4.99</p>
                    <p className="text-xs text-gray-400">/ month</p>
                  </div>
                </div>
                {interval === 'month' && (
                  <div className="mt-3 w-full h-0.5 bg-gold rounded-full" />
                )}
              </div>

              {/* Yearly card */}
              <div
                onClick={() => setInterval('year')}
                className={`bg-white rounded-2xl border-2 shadow-sm p-5 cursor-pointer transition-colors relative ${
                  interval === 'year' ? 'border-gold' : 'border-gray-100'
                }`}
              >
                <span className="absolute -top-2.5 right-4 bg-gold text-navy text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  Best value
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-navy">Individual Premium</p>
                    <p className="text-xs text-gray-500 mt-0.5">~$3.33/month, billed annually</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-navy">$39.99</p>
                    <p className="text-xs text-gray-400">/ year</p>
                  </div>
                </div>
                {interval === 'year' && (
                  <div className="mt-3 w-full h-0.5 bg-gold rounded-full" />
                )}
              </div>
            </div>

            {/* Subscribe button */}
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-gold text-navy font-bold py-4 rounded-2xl text-base hover:bg-gold/90 disabled:opacity-60 transition-colors"
            >
              {loading
                ? 'Redirecting…'
                : interval === 'year'
                  ? 'Subscribe — $39.99/year'
                  : 'Subscribe — $4.99/month'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Cancel anytime. Billed securely through Stripe.
            </p>
          </>
        )}

        {/* Feature list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-6">
          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-4">
            What's included
          </p>
          <ul className="space-y-3">
            {FEATURES.map(f => <CheckItem key={f} text={f} />)}
          </ul>
        </div>

        {/* Parish sponsorship code */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="font-semibold text-navy text-sm mb-1">Parish-sponsored? Enter your code.</p>
          <p className="text-xs text-gray-500 mb-3">
            Some parishes sponsor Premium for their members. Enter your 6-character code below.
          </p>
          <form onSubmit={handleSponsorCode} className="flex gap-2">
            <input
              value={sponsorCode}
              onChange={e => setSponsorCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="e.g. STPAT4"
              maxLength={6}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-navy tracking-widest"
            />
            <button
              type="submit"
              disabled={sponsorCode.length !== 6}
              className="px-4 py-2 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy/90 disabled:opacity-40 transition-colors"
            >
              Apply
            </button>
          </form>
        </div>

        {/* Scripture */}
        <div className="text-center mt-8">
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
