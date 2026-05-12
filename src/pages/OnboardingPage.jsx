import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BuildingLibraryIcon, UserGroupIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTranslation } from '../utils/i18n'
import { supabase } from '../lib/supabase'
import Button from '../components/shared/Button'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { getLiturgicalSeason } from '../utils/liturgical'
import { format } from 'date-fns'

export default function OnboardingPage() {
  useEffect(() => { document.title = 'Welcome | Communio' }, [])
  const { t } = useTranslation('auth')
  const { profile, updateProfile, user } = useAuth()
  const navigate = useNavigate()

  const isClergy = ['ordained', 'religious'].includes(profile?.vocation_state)
  const totalSteps = isClergy ? 4 : 3
  const firstName = profile?.full_name?.split(' ')[0] || 'Friend'
  const season = getLiturgicalSeason()

  const [step, setStep] = useState(1)
  const [parish, setParish] = useState(null)
  const [parishQuery, setParishQuery] = useState('')
  const [parishResults, setParishResults] = useState([])
  const [parishSearching, setParishSearching] = useState(false)
  const [suggestedGroups, setSuggestedGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [joinedGroups, setJoinedGroups] = useState(new Set())
  const [joiningGroup, setJoiningGroup] = useState(null)

  // Load parish if user has one
  useEffect(() => {
    if (profile?.parish_id) {
      supabase.from('parishes').select('id, name, city, state, diocese')
        .eq('id', profile.parish_id).single()
        .then(({ data }) => { if (data) setParish(data) })
    }
  }, [profile?.parish_id])

  // Inline parish search
  useEffect(() => {
    const q = parishQuery.trim()
    if (q.length < 2) { setParishResults([]); return }
    const timer = setTimeout(async () => {
      setParishSearching(true)
      const { data } = await supabase.from('parishes')
        .select('id, name, city, state')
        .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
        .limit(5)
      setParishResults(data ?? [])
      setParishSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [parishQuery])

  async function selectParish(p) {
    setParish(p)
    setParishQuery('')
    setParishResults([])
    // Save to profile and follow
    await updateProfile({ parish_id: p.id })
    await supabase.from('parish_follows').upsert(
      { parish_id: p.id, user_id: user.id },
      { onConflict: 'parish_id,user_id' }
    )
  }

  // Load suggested groups for step 2 — only from parishes the user follows
  useEffect(() => {
    if (step !== 2) return
    setGroupsLoading(true)

    if (!profile?.parish_id) {
      // No parish set yet — show empty state
      setSuggestedGroups([])
      setGroupsLoading(false)
      return
    }

    supabase.from('groups')
      .select('id, name, category, member_count, parish_id')
      .eq('parish_id', profile.parish_id)
      .limit(6)
      .then(({ data }) => { setSuggestedGroups(data || []); setGroupsLoading(false) })
  }, [step, profile])

  async function joinGroup(groupId) {
    if (!profile?.id || joinedGroups.has(groupId)) return
    setJoiningGroup(groupId)
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: profile.id, role: 'member' })
    if (!error) setJoinedGroups(prev => new Set([...prev, groupId]))
    setJoiningGroup(null)
  }

  async function finish() {
    await updateProfile({ onboarding_completed: true })
    navigate('/', { replace: true })
  }

  function skip() {
    updateProfile({ onboarding_completed: true })
    navigate('/', { replace: true })
  }

  if (!profile) return <LoadingSpinner fullPage />

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Skip */}
      <div className="flex justify-end p-4">
        <button onClick={skip} className="text-sm text-gray-400 hover:text-navy transition-colors min-h-[44px] px-2">
          Skip
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-6 pt-1 pb-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(n => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-all duration-300 ${n <= step ? 'bg-gold' : 'bg-gray-200'}`} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">Step {step} of {totalSteps}</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">

          {/* ── STEP 1 — Welcome + parish ── */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center gap-5">
              <svg viewBox="0 0 60 60" className="w-16 h-16">
                <rect width="60" height="60" rx="30" fill="#1B2A4A"/>
                <rect x="27" y="12" width="6" height="36" fill="#C9A84C"/>
                <rect x="15" y="24" width="30" height="6" fill="#C9A84C"/>
              </svg>
              <div>
                <h1 className="text-2xl font-bold text-navy">{t('onboarding.step1_title', { name: firstName })}</h1>
                <p className="text-gray-500 mt-1 text-sm">{t('onboarding.step1_body')}</p>
              </div>

              {/* Parish — show selected or inline search */}
              {parish ? (
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-lightbg rounded-lg flex items-center justify-center flex-shrink-0">
                      <BuildingLibraryIcon className="w-5 h-5 text-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy text-sm truncate">{parish.name}</p>
                      <p className="text-gray-500 text-xs">{parish.city}, {parish.state}</p>
                      <p className="text-navy text-xs mt-1 font-medium">Your parish ✓</p>
                    </div>
                    <button onClick={() => { setParish(null); updateProfile({ parish_id: null }) }}
                      className="text-xs text-gray-400 hover:text-navy transition-colors px-1">
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left space-y-2">
                  <p className="text-sm font-semibold text-navy mb-2">Find your parish</p>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={parishQuery}
                      onChange={e => setParishQuery(e.target.value)}
                      placeholder="Search by name or city…"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy"
                    />
                    {parishSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2"><LoadingSpinner size="sm" /></div>
                    )}
                  </div>
                  {parishResults.length > 0 && (
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                      {parishResults.map(p => (
                        <button key={p.id} onClick={() => selectParish(p)}
                          className="w-full text-left px-3 py-2.5 hover:bg-lightbg transition-colors border-b border-gray-50 last:border-0 min-h-[44px]">
                          <p className="text-sm font-semibold text-navy">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.city}, {p.state}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {parishQuery.length >= 2 && !parishSearching && parishResults.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-1">No parishes found — try a different search.</p>
                  )}
                  {!parishQuery && (
                    <p className="text-xs text-gray-400 text-center">Optional — you can add this later</p>
                  )}
                </div>
              )}

              <Button variant="gold" fullWidth className="min-h-[52px] text-base font-semibold" onClick={() => setStep(2)}>
                {t('onboarding.continue')}
              </Button>
            </div>
          )}

          {/* ── STEP 2 — Groups ── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-navy">{t('onboarding.step2_title')}</h1>
                <p className="text-gray-500 mt-1 text-sm">{t('onboarding.step2_subtitle')}</p>
              </div>
              <div className="flex flex-col gap-3">
                {groupsLoading ? (
                  [1,2,3].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                      </div>
                      <div className="w-14 h-8 bg-gray-200 rounded-lg" />
                    </div>
                  ))
                ) : suggestedGroups.length > 0 ? suggestedGroups.map(g => (
                  <div key={g.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-lightbg rounded-lg flex items-center justify-center flex-shrink-0">
                      <UserGroupIcon className="w-5 h-5 text-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy text-sm truncate">{g.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{g.category?.replace('_',' ')} · {g.member_count||0} members</p>
                    </div>
                    <button
                      onClick={() => joinGroup(g.id)}
                      disabled={joinedGroups.has(g.id) || joiningGroup === g.id}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[36px] transition-colors ${
                        joinedGroups.has(g.id) ? 'bg-gold text-navy cursor-default' : 'bg-navy text-white hover:bg-opacity-90'
                      }`}>
                      {joiningGroup === g.id ? <LoadingSpinner size="sm" /> : joinedGroups.has(g.id) ? 'Joined ✓' : 'Join'}
                    </button>
                  </div>
                )) : (
                  ['Men\'s Group','Young Adults','Parish Community'].map(name => (
                    <div key={name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 opacity-50">
                      <div className="w-10 h-10 bg-lightbg rounded-lg flex items-center justify-center">
                        <UserGroupIcon className="w-5 h-5 text-navy" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-navy text-sm">{name}</p>
                        <p className="text-xs text-gray-400">Groups will appear as your community grows</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button variant="gold" fullWidth className="min-h-[52px] text-base font-semibold" onClick={() => setStep(3)}>
                {t('onboarding.continue')}
              </Button>
              <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-navy transition-colors text-center py-1">← Back</button>
            </div>
          )}

          {/* ── STEP 3 — Readings ── */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center gap-5">
              <div>
                <h1 className="text-2xl font-bold text-navy">{t('onboarding.step3_title')}</h1>
                <p className="text-gray-500 mt-1 text-sm">{t('onboarding.step3_subtitle')}</p>
              </div>
              <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-left">
                <div className="bg-navy px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-gold flex-shrink-0">
                      <path d="M8.5 2h3v6h6v3h-6v7h-3V11h-6V8h6z"/>
                    </svg>
                    <span className="text-white text-sm font-semibold">Today's Readings</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: season.color }} />
                    <span className="text-gray-300 text-xs">{season.label}</span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-3">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                  <div className="flex flex-col gap-2">
                    {[['First Reading','Isaiah 40:1-5'],['Responsorial Psalm','Psalm 85'],['Gospel','Mark 1:1-8']].map(([label,ref]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-28 flex-shrink-0">{label}</span>
                        <span className="text-sm text-navy font-medium">{ref}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500">{t('onboarding.step3_body')}</p>
              <Button variant="gold" fullWidth className="min-h-[52px] text-base font-semibold"
                onClick={() => isClergy ? setStep(4) : finish()}>
                {isClergy ? t('onboarding.continue') : t('onboarding.go_to_parish')}
              </Button>
              <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-navy transition-colors text-center py-1">← Back</button>
            </div>
          )}

          {/* ── STEP 4 — Clergy only: parish setup ── */}
          {step === 4 && isClergy && (
            <div className="flex flex-col items-center text-center gap-5">
              <div className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center">
                <BuildingLibraryIcon className="w-7 h-7 text-gold" />
              </div>
              <div>
                <p className="text-gold text-xs font-bold tracking-widest uppercase mb-1">For Priests</p>
                <h1 className="text-2xl font-bold text-navy leading-tight">Are you the pastor of a parish?</h1>
                <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                  Set up your parish on Communio — reach your parishioners with announcements, events, and a community feed.
                </p>
              </div>
              <div className="w-full bg-gold/10 border border-gold/20 rounded-2xl px-4 py-3 text-left">
                <p className="text-navy text-xs font-semibold mb-1">Includes a 90-day free trial</p>
                <p className="text-gray-500 text-xs">No credit card charged until day 91. Cancel any time.</p>
              </div>
              <div className="w-full space-y-3">
                <Button variant="gold" fullWidth className="min-h-[52px] text-base font-semibold"
                  onClick={async () => {
                    await updateProfile({ onboarding_completed: true })
                    navigate('/pastor-setup', { replace: true })
                  }}>
                  Yes, set up my parish →
                </Button>
                <button onClick={finish}
                  className="w-full text-sm text-gray-400 hover:text-navy transition-colors py-3 min-h-[44px]">
                  Not right now — go to the app
                </button>
              </div>
              <button onClick={() => setStep(3)} className="text-sm text-gray-400 hover:text-navy transition-colors py-1">← Back</button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
