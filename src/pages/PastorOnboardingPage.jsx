import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BuildingLibraryIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'

const TIERS = [
  {
    key: 'small',
    label: 'Small Parish',
    range: 'Under 200 parishioners',
    price: '$59',
    desc: 'Perfect for smaller communities getting started with digital parish life.',
  },
  {
    key: 'medium',
    label: 'Standard Parish',
    range: '200–500 parishioners',
    price: '$119',
    desc: 'Our most popular plan for active mid-size parishes.',
    featured: true,
  },
  {
    key: 'large',
    label: 'Large Parish',
    range: '500–1,500 parishioners',
    price: '$229',
    desc: 'For larger parishes with multiple groups and high engagement.',
  },
  {
    key: 'cathedral',
    label: 'Cathedral',
    range: '1,500+ parishioners',
    price: '$389',
    desc: 'Full-featured plan for cathedrals and major parishes.',
  },
]

function tierForCount(count) {
  if (count < 200) return 'small'
  if (count < 500) return 'medium'
  if (count < 1500) return 'large'
  return 'cathedral'
}

// ── Step 1: Ask if they're a pastor ────────────────────────
function StepAsk({ onYes, onSkip }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mx-auto mb-6">
        <BuildingLibraryIcon className="w-8 h-8 text-gold" />
      </div>
      <h1 className="text-2xl font-black text-navy mb-2">Are you the pastor of a parish?</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
        As a priest, you can set up your parish on Communio — giving your parishioners
        a home between Masses.
      </p>
      <div className="space-y-3">
        <button
          onClick={onYes}
          className="w-full bg-navy text-white font-bold py-4 rounded-2xl hover:bg-navy/90 transition-colors"
        >
          Yes, set up my parish →
        </button>
        <button
          onClick={onSkip}
          className="w-full text-gray-400 text-sm py-3 hover:text-navy transition-colors"
        >
          Not right now
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Parish search ───────────────────────────────────
function StepParish({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  const search = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('parishes')
      .select('id, name, city, state, diocese')
      .or(`name.ilike.%${q.trim()}%,city.ilike.%${q.trim()}%`)
      .limit(8)
    setResults(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  return (
    <div>
      <h1 className="text-2xl font-black text-navy mb-2">Find your parish</h1>
      <p className="text-gray-500 text-sm mb-6">Search by parish name or city.</p>

      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          placeholder="St. Patrick's Parish, Worcester..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy"
        />
      </div>

      {loading && <p className="text-center text-gray-400 text-sm py-4">Searching…</p>}

      {results.length > 0 && (
        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
          {results.map(parish => (
            <button
              key={parish.id}
              onClick={() => setSelected(parish)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                selected?.id === parish.id
                  ? 'border-navy bg-navy/5'
                  : 'border-gray-100 bg-white hover:bg-lightbg'
              }`}
            >
              <div className="w-8 h-8 bg-navy/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <BuildingLibraryIcon className="w-4 h-4 text-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy text-sm truncate">{parish.name}</p>
                <p className="text-gray-400 text-xs">{parish.city}, {parish.state}</p>
              </div>
              {selected?.id === parish.id && (
                <CheckCircleSolid className="w-5 h-5 text-navy flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">
          No parishes found. Try a different name or city.
        </p>
      )}

      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected}
        className="w-full bg-navy text-white font-bold py-4 rounded-2xl disabled:opacity-40 hover:bg-navy/90 transition-colors"
      >
        {selected ? `Continue with ${selected.name}` : 'Select a parish to continue'}
      </button>
    </div>
  )
}

// ── Step 3: Parishioner count → tier ───────────────────────
function StepSize({ parish, onSelect }) {
  const [count, setCount] = useState('')
  const [selectedTier, setSelectedTier] = useState(null)

  const SIZE_OPTIONS = [
    { label: 'Under 200', value: 100 },
    { label: '200–500', value: 300 },
    { label: '500–1,500', value: 800 },
    { label: 'Over 1,500', value: 2000 },
  ]

  function pickCount(value) {
    setCount(value)
    setSelectedTier(tierForCount(value))
  }

  const tier = TIERS.find(t => t.key === selectedTier)

  return (
    <div>
      <h1 className="text-2xl font-black text-navy mb-1">How large is your parish?</h1>
      <p className="text-gray-500 text-sm mb-6">
        We'll recommend the right plan for <span className="font-semibold text-navy">{parish.name}</span>.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {SIZE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => pickCount(opt.value)}
            className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all ${
              count === opt.value
                ? 'bg-navy text-white border-navy'
                : 'bg-white border-gray-200 text-navy hover:bg-lightbg'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {tier && (
        <div className={`rounded-2xl border p-5 mb-6 ${tier.featured ? 'border-gold bg-gold/5' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-bold text-navy text-base">{tier.label}</p>
              <p className="text-gray-500 text-xs">{tier.range}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-navy">{tier.price}</p>
              <p className="text-gray-400 text-xs">/month</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">{tier.desc}</p>
          {tier.featured && (
            <span className="inline-block mt-2 text-xs bg-gold text-navy font-bold px-2 py-0.5 rounded-full">
              Most Popular
            </span>
          )}
        </div>
      )}

      {/* Show all tiers collapsed */}
      <details className="mb-6">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-navy transition-colors select-none">
          View all plans
        </summary>
        <div className="mt-3 space-y-2">
          {TIERS.map(t => (
            <button
              key={t.key}
              onClick={() => setSelectedTier(t.key)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                selectedTier === t.key ? 'border-navy bg-navy/5' : 'border-gray-100 bg-white hover:bg-lightbg'
              }`}
            >
              <div className="text-left">
                <span className="font-semibold text-navy">{t.label}</span>
                <span className="text-gray-400 text-xs ml-2">{t.range}</span>
              </div>
              <span className="font-bold text-navy">{t.price}/mo</span>
            </button>
          ))}
        </div>
      </details>

      <button
        onClick={() => tier && onSelect(tier)}
        disabled={!tier}
        className="w-full bg-navy text-white font-bold py-4 rounded-2xl disabled:opacity-40 hover:bg-navy/90 transition-colors"
      >
        {tier ? `Continue with ${tier.label}` : 'Select a size to continue'}
      </button>
    </div>
  )
}

// ── Step 4: Trial + checkout ────────────────────────────────
function StepTrial({ parish, tier, user, onBack }) {
  const [loading, setLoading] = useState(false)

  async function startTrial() {
    setLoading(true)
    try {
      // Add as parish admin immediately — no race condition with Stripe webhook
      const { error: adminErr } = await supabase
        .from('parish_admins')
        .upsert(
          { parish_id: parish.id, user_id: user.id, role: 'admin' },
          { onConflict: 'parish_id,user_id' }
        )
      if (adminErr) throw adminErr

      // Create Stripe checkout session
      const res = await fetch('/api/create-parish-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parishId:    parish.id,
          parishName:  parish.name,
          adminUserId: user.id,
          adminEmail:  user.email,
          tierKey:     tier.key,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')

      // Redirect to Stripe
      window.location.href = data.url
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-navy mb-2">Start your free trial</h1>
      <p className="text-gray-500 text-sm mb-6">
        You will <span className="font-semibold text-navy">not be charged for 90 days</span>.
        Enter your card now to keep things running after your trial.
      </p>

      {/* Parish + plan summary */}
      <div className="bg-lightbg rounded-2xl p-5 mb-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-navy/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <BuildingLibraryIcon className="w-5 h-5 text-navy" />
          </div>
          <div>
            <p className="font-bold text-navy text-sm">{parish.name}</p>
            <p className="text-gray-400 text-xs">{parish.city}, {parish.state}</p>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-navy text-sm">{tier.label} Plan</p>
            <p className="text-gray-400 text-xs">{tier.range}</p>
          </div>
          <div className="text-right">
            <p className="font-black text-navy text-lg">{tier.price}<span className="text-sm font-normal text-gray-400">/mo</span></p>
            <p className="text-xs text-gold font-semibold">after 90-day trial</p>
          </div>
        </div>
      </div>

      {/* Trial callout */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <CheckCircleSolid className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-green-800 text-sm">3 months free — no charge until day 91</p>
          <p className="text-green-700 text-xs mt-0.5 leading-relaxed">
            Your card is saved now so there's no interruption when the trial ends.
            Cancel any time before day 91 and you will never be charged.
          </p>
        </div>
      </div>

      {/* What's included */}
      <div className="mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Included in your trial</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            'Parish admin dashboard',
            'Announcements & events',
            'Mass times editor',
            'Parishioner directory',
            'Push notifications',
            'Platform integrations',
            'Community groups',
            '90-day free trial',
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircleIcon className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={startTrial}
        disabled={loading}
        className="w-full bg-navy text-white font-bold py-4 rounded-2xl hover:bg-navy/90 disabled:opacity-60 transition-colors mb-3"
      >
        {loading ? 'Preparing checkout…' : 'Start Free Trial →'}
      </button>

      <button
        onClick={onBack}
        className="w-full text-gray-400 text-sm py-2 hover:text-navy transition-colors"
      >
        ← Change plan
      </button>

      <p className="text-center text-gray-300 text-xs mt-3">
        Secured by Stripe · Cancel anytime · No charge for 90 days
      </p>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────
export default function PastorOnboardingPage() {
  useEffect(() => { document.title = 'Set Up Your Parish | Communio' }, [])

  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [step, setStep] = useState(1)
  const [selectedParish, setSelectedParish] = useState(null)
  const [selectedTier, setSelectedTier] = useState(null)

  // If not ordained/religious, redirect home
  useEffect(() => {
    if (profile && !['ordained', 'religious'].includes(profile.vocation_state)) {
      navigate('/', { replace: true })
    }
  }, [profile, navigate])

  // If already a parish admin somewhere, skip to home
  useEffect(() => {
    if (!user) return
    supabase
      .from('parish_admins')
      .select('parish_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => {
        if ((count ?? 0) > 0) navigate('/', { replace: true })
      })
  }, [user, navigate])

  function handleSkip() {
    navigate('/', { replace: true })
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      {/* Progress dots */}
      {step > 1 && (
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map(n => (
            <div
              key={n}
              className={`rounded-full transition-all ${
                n === step ? 'w-6 h-2 bg-navy' : n < step ? 'w-2 h-2 bg-navy/40' : 'w-2 h-2 bg-gray-200'
              }`}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {step === 1 && (
          <StepAsk
            onYes={() => setStep(2)}
            onSkip={handleSkip}
          />
        )}
        {step === 2 && (
          <StepParish
            onSelect={parish => { setSelectedParish(parish); setStep(3) }}
          />
        )}
        {step === 3 && selectedParish && (
          <StepSize
            parish={selectedParish}
            onSelect={tier => { setSelectedTier(tier); setStep(4) }}
          />
        )}
        {step === 4 && selectedParish && selectedTier && (
          <StepTrial
            parish={selectedParish}
            tier={selectedTier}
            user={user}
            onBack={() => setStep(3)}
          />
        )}
      </div>

      {/* Skip link */}
      {step === 1 && (
        <p className="text-xs text-gray-300 mt-6">
          You can set up your parish later from Settings.
        </p>
      )}
    </div>
  )
}
