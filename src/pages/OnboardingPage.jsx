import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BuildingLibraryIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTranslation } from '../utils/i18n'
import { supabase } from '../lib/supabase'
import Button from '../components/shared/Button'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { getLiturgicalSeason, formatLiturgicalDate } from '../utils/liturgical'
import { format } from 'date-fns'

export default function OnboardingPage() {
  document.title = 'Welcome | Communio'
  const { t } = useTranslation('auth')
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [parish, setParish] = useState(null)
  const [suggestedGroups, setSuggestedGroups] = useState([])
  const [joinedGroups, setJoinedGroups] = useState(new Set())
  const [joiningGroup, setJoiningGroup] = useState(null)

  const firstName = profile?.full_name?.split(' ')[0] || 'Friend'
  const season = getLiturgicalSeason()

  // Load parish if user has one
  useEffect(() => {
    if (profile?.parish_id) {
      supabase.from('parishes').select('id, name, city, state, diocese')
        .eq('id', profile.parish_id).single()
        .then(({ data }) => { if (data) setParish(data) })
    }
  }, [profile?.parish_id])

  // Load suggested groups for step 2
  useEffect(() => {
    if (step !== 2) return
    const vocMap = { married: 'families', single: 'young_adults', ordained: 'parish', religious: 'parish' }
    const cat = vocMap[profile?.vocation_state] || 'other'

    supabase.from('groups')
      .select('id, name, category, member_count, parish_id')
      .or(
        profile?.parish_id
          ? `parish_id.eq.${profile.parish_id},category.eq.${cat}`
          : `category.eq.${cat}`
      )
      .limit(6)
      .then(({ data }) => setSuggestedGroups(data || []))
  }, [step, profile])

  async function joinGroup(groupId) {
    if (!profile?.id || joinedGroups.has(groupId)) return
    setJoiningGroup(groupId)
    await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: profile.id,
      role: 'member',
    })
    setJoinedGroups(prev => new Set([...prev, groupId]))
    setJoiningGroup(null)
  }

  async function finish() {
    await updateProfile({ onboarding_completed: true })
    navigate('/', { replace: true })
  }

  function skip() {
    navigate('/', { replace: true })
  }

  if (!profile) return <LoadingSpinner fullPage />

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button onClick={skip} className="text-sm text-gray-400 hover:text-navy transition-colors min-h-[44px] px-2">
          Skip
        </button>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center gap-5">
              <svg viewBox="0 0 60 60" className="w-16 h-16">
                <rect width="60" height="60" rx="30" fill="#1B2A4A"/>
                <rect x="27" y="12" width="6" height="36" fill="#C9A84C"/>
                <rect x="15" y="24" width="30" height="6" fill="#C9A84C"/>
              </svg>

              <div>
                <h1 className="text-2xl font-bold text-navy">
                  {t('onboarding.step1_title', { name: firstName })}
                </h1>
                <p className="text-gray-500 mt-1 text-sm">{t('onboarding.step1_body')}</p>
              </div>

              {/* Parish card */}
              {parish ? (
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-lightbg rounded-lg flex items-center justify-center flex-shrink-0">
                      <BuildingLibraryIcon className="w-5 h-5 text-navy" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy text-sm">{parish.name}</p>
                      <p className="text-gray-500 text-xs">{parish.city}, {parish.state}</p>
                      {parish.diocese && <p className="text-gray-400 text-xs">{parish.diocese}</p>}
                      <p className="text-navy text-xs mt-1 font-medium">Your parish community is here</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                  <BuildingLibraryIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Find your parish to connect with your community</p>
                  <button onClick={() => navigate('/directory')}
                    className="mt-2 text-sm text-navy font-semibold hover:underline">
                    Find my parish →
                  </button>
                </div>
              )}

              <Button variant="gold" fullWidth className="min-h-[52px] text-base font-semibold" onClick={() => setStep(2)}>
                {t('onboarding.continue')}
              </Button>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-navy">{t('onboarding.step2_title')}</h1>
                <p className="text-gray-500 mt-1 text-sm">{t('onboarding.step2_subtitle')}</p>
              </div>

              <div className="flex flex-col gap-3">
                {suggestedGroups.length > 0 ? suggestedGroups.map(g => (
                  <div key={g.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-lightbg rounded-lg flex items-center justify-center flex-shrink-0">
                      <UserGroupIcon className="w-5 h-5 text-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy text-sm truncate">{g.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{g.category?.replace('_', ' ')} · {g.member_count || 0} members</p>
                    </div>
                    <button
                      onClick={() => joinGroup(g.id)}
                      disabled={joinedGroups.has(g.id) || joiningGroup === g.id}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[36px] transition-colors ${
                        joinedGroups.has(g.id)
                          ? 'bg-gold text-navy cursor-default'
                          : 'bg-navy text-white hover:bg-opacity-90'
                      }`}>
                      {joiningGroup === g.id ? '...' : joinedGroups.has(g.id) ? 'Joined ✓' : 'Join'}
                    </button>
                  </div>
                )) : (
                  // Empty state — decorative placeholders
                  ["Men's Group", "Young Adults", "Parish Community"].map(name => (
                    <div key={name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 opacity-60">
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
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center gap-5">
              <div>
                <h1 className="text-2xl font-bold text-navy">{t('onboarding.step3_title')}</h1>
                <p className="text-gray-500 mt-1 text-sm">{t('onboarding.step3_subtitle')}</p>
              </div>

              {/* Mock readings card */}
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
                    {[
                      ['First Reading', 'Isaiah 40:1-5'],
                      ['Responsorial Psalm', 'Psalm 85'],
                      ['Gospel', 'Mark 1:1-8'],
                    ].map(([label, ref]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-28 flex-shrink-0">{label}</span>
                        <span className="text-sm text-navy font-medium">{ref}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500">{t('onboarding.step3_body')}</p>

              <Button variant="gold" fullWidth className="min-h-[52px] text-base font-semibold" onClick={finish}>
                {t('onboarding.go_to_parish')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pb-8">
        {[1, 2, 3].map(n => (
          <div key={n} className={`rounded-full transition-all ${n === step ? 'w-6 h-2 bg-gold' : 'w-2 h-2 bg-gray-300'}`} />
        ))}
      </div>
    </div>
  )
}
