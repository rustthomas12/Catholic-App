import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BuildingLibraryIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { useFollowedParishes } from '../hooks/useParish.js'
import { supabase } from '../lib/supabase'
import { differenceInDays } from 'date-fns'
import Feed from '../components/feed/Feed'
import FeedFilters from '../components/feed/FeedFilters'
import ReadingsCard from '../components/faith/ReadingsCard'
import { useReadings } from '../hooks/useReadings'
import GroupCard from '../components/groups/GroupCard'

const WELCOME_DISMISSED_KEY = 'parish_welcome_dismissed'

// Module-level cache — persists across navigations within the same session
let _homeParishCache = null  // { parishId, data }
let _homeGroupsCache = null  // { userId, data }

export default function HomePage() {
  document.title = 'Home | Parish App'
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [parish, setParish] = useState(() =>
    profile?.parish_id && _homeParishCache?.parishId === profile.parish_id
      ? _homeParishCache.data
      : null
  )
  const [groups, setGroups] = useState(() =>
    profile?.id && _homeGroupsCache?.userId === profile.id
      ? _homeGroupsCache.data
      : []
  )
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(WELCOME_DISMISSED_KEY) === '1'
  )
  const [activeFilter, setActiveFilter] = useState('all')

  const { parishes: followedParishes } = useFollowedParishes()
  const hasParish = !!parish || followedParishes.length > 0

  const { readings: homeReadings, loading: readingsLoading, error: readingsError,
          liturgicalInfo, feastInfo, todayFormatted } = useReadings()
  const firstName = profile?.full_name?.split(' ')[0] || 'Friend'
  const isNewUser = profile?.created_at &&
    differenceInDays(new Date(), new Date(profile.created_at)) <= 7

  const parishId = profile?.parish_id
  const profileId = profile?.id

  useEffect(() => {
    if (!profileId) return

    // Parish — only fetch if parishId changed or cache is missing
    if (parishId) {
      if (_homeParishCache?.parishId === parishId) {
        setParish(_homeParishCache.data)
      } else {
        supabase.from('parishes')
          .select('id, name, city, state')
          .eq('id', parishId)
          .single()
          .then(({ data }) => {
            if (data) {
              _homeParishCache = { parishId, data }
              setParish(data)
            }
          })
      }
    }

    // Groups — only fetch if userId changed or cache is missing
    if (_homeGroupsCache?.userId === profileId) {
      setGroups(_homeGroupsCache.data)
    } else {
      supabase.from('group_members')
        .select('groups(id, name, member_count, category)')
        .eq('user_id', profileId)
        .limit(6)
        .then(({ data }) => {
          const result = (data ?? []).map(d => d.groups).filter(Boolean)
          _homeGroupsCache = { userId: profileId, data: result }
          setGroups(result)
        })
    }
  }, [parishId, profileId])

  function dismissWelcome() {
    localStorage.setItem(WELCOME_DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      {/* ── Mobile: single column ── */}
      <div className="md:hidden max-w-2xl mx-auto pb-24">

        {/* Welcome card (first 7 days) */}
        {isNewUser && !dismissed && (
          <div className="bg-navy mx-0 px-4 py-5 relative overflow-hidden">
            <svg className="absolute right-4 top-4 w-16 h-20 opacity-10 fill-gold" viewBox="0 0 40 56">
              <path d="M17 0h6v16h16v6H23v34h-6V22H0v-6h17z"/>
            </svg>
            <button onClick={dismissWelcome}
              className="absolute top-3 right-3 text-white/50 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <p className="text-gold text-sm font-semibold mb-1">Welcome to Parish App</p>
            <p className="text-white font-bold text-lg mb-3">Welcome, {firstName}! Your parish community is waiting.</p>
            <div className="flex gap-2 flex-wrap">
              <Link to="/directory"
                className="bg-gold text-navy text-sm font-semibold px-4 py-2 rounded-lg min-h-[40px] flex items-center">
                Find my parish
              </Link>
              <Link to="/groups"
                className="bg-white/10 text-white text-sm font-medium px-4 py-2 rounded-lg min-h-[40px] flex items-center hover:bg-white/20 transition-colors">
                Browse groups
              </Link>
            </div>
          </div>
        )}

        {/* Daily faith card */}
        <div className="px-0 border-b border-gray-100">
          <div className="px-4 py-3">
            <ReadingsCard
              variant="compact"
              readings={homeReadings}
              loading={readingsLoading}
              error={readingsError}
              liturgicalInfo={liturgicalInfo}
              feastInfo={feastInfo}
              todayFormatted={todayFormatted}
            />
          </div>
        </div>

        {/* Parish card */}
        {parish ? (
          <div className="bg-white border-b border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-lightbg rounded-xl flex items-center justify-center flex-shrink-0">
                <BuildingLibraryIcon className="w-5 h-5 text-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-navy text-sm">{parish.name}</p>
                <p className="text-xs text-gray-500">{parish.city}, {parish.state}</p>
                <Link to={`/parish/${parish.id}`}
                  className="text-xs text-navy font-medium hover:underline mt-1 inline-block">
                  View your parish community →
                </Link>
              </div>
            </div>
          </div>
        ) : !hasParish ? (
          <div className="bg-white border-b border-gray-100 p-5 text-center">
            <BuildingLibraryIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="font-semibold text-navy text-sm mb-1">Connect with your parish</p>
            <p className="text-gray-500 text-xs mb-3">
              Find your parish to see announcements, events, and connect with your community.
            </p>
            <Link to="/directory"
              className="inline-flex items-center gap-1 text-sm text-navy font-semibold hover:underline">
              Find my parish →
            </Link>
          </div>
        ) : null}

        {/* Groups horizontal scroll */}
        {groups.length > 0 && (
          <div className="bg-white border-b border-gray-100 py-3">
            <div className="flex items-center justify-between px-4 mb-2">
              <h2 className="text-sm font-bold text-navy">My Groups</h2>
              <Link to="/groups" className="text-xs text-gray-400 hover:text-navy">See all</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 px-4" style={{ scrollbarWidth: 'none' }}>
              {groups.map(g => (
                <GroupCard key={g.id} group={g} compact isMember />
              ))}
            </div>
          </div>
        )}

        {/* Feed section */}
        <div className="border-t-4 border-gray-100">
          <FeedFilters activeFilter={activeFilter} onChange={setActiveFilter} />
          <Feed
            filter={activeFilter}
            showCreatePost
            emptyMessage="Your feed is quiet"
            emptySubtext="Follow your parish to see posts here"
            emptyAction={{ label: 'Find my parish', onClick: () => navigate('/directory') }}
          />
        </div>
      </div>

      {/* ── Desktop: two-column layout ── */}
      <div className="hidden md:flex gap-6 max-w-5xl mx-auto px-6 pt-6 pb-12">
        {/* Left: feed */}
        <div className="flex-1 min-w-0">
          <FeedFilters activeFilter={activeFilter} onChange={setActiveFilter} />
          <div className="mt-2">
            <Feed
              filter={activeFilter}
              showCreatePost
              emptyMessage="Your feed is quiet"
              emptySubtext="Follow your parish to see posts here"
              emptyAction={{ label: 'Find my parish', onClick: () => navigate('/directory') }}
            />
          </div>
        </div>

        {/* Right: sidebar cards */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
          {/* Welcome card */}
          {isNewUser && !dismissed && (
            <div className="bg-navy rounded-2xl p-5 relative overflow-hidden">
              <svg className="absolute right-4 top-4 w-16 h-20 opacity-10 fill-gold" viewBox="0 0 40 56">
                <path d="M17 0h6v16h16v6H23v34h-6V22H0v-6h17z"/>
              </svg>
              <button onClick={dismissWelcome}
                className="absolute top-3 right-3 text-white/50 hover:text-white p-1">
                <XMarkIcon className="w-5 h-5" />
              </button>
              <p className="text-gold text-sm font-semibold mb-1">Welcome</p>
              <p className="text-white font-bold text-base mb-3">Welcome, {firstName}!</p>
              <Link to="/directory"
                className="block bg-gold text-navy text-sm font-semibold px-4 py-2 rounded-lg text-center">
                Find my parish
              </Link>
            </div>
          )}

          {/* Daily faith card */}
          <ReadingsCard
            variant="compact"
            readings={homeReadings}
            loading={readingsLoading}
            error={readingsError}
            liturgicalInfo={liturgicalInfo}
            feastInfo={feastInfo}
            todayFormatted={todayFormatted}
          />

          {/* Parish card */}
          {parish ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-lightbg rounded-xl flex items-center justify-center flex-shrink-0">
                  <BuildingLibraryIcon className="w-5 h-5 text-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-navy text-sm">{parish.name}</p>
                  <p className="text-xs text-gray-500">{parish.city}, {parish.state}</p>
                  <Link to={`/parish/${parish.id}`}
                    className="text-xs text-navy font-medium hover:underline mt-1 inline-block">
                    View parish →
                  </Link>
                </div>
              </div>
            </div>
          ) : !hasParish ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <BuildingLibraryIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="font-semibold text-navy text-sm mb-2">Connect with your parish</p>
              <Link to="/directory" className="text-sm text-navy font-semibold hover:underline">
                Find my parish →
              </Link>
            </div>
          ) : null}

          {/* Groups */}
          {groups.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-navy">My Groups</h2>
                <Link to="/groups" className="text-xs text-gray-400 hover:text-navy">See all</Link>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {groups.slice(0, 4).map(g => (
                  <GroupCard key={g.id} group={g} compact isMember />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
