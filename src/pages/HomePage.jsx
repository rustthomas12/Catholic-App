import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BuildingLibraryIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { getLiturgicalSeason } from '../utils/liturgical'
import { format, differenceInDays } from 'date-fns'
import Feed from '../components/feed/Feed'
import FeedFilters from '../components/feed/FeedFilters'

const WELCOME_DISMISSED_KEY = 'parish_welcome_dismissed'

export default function HomePage() {
  document.title = 'Home | Parish App'
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [parish, setParish] = useState(null)
  const [groups, setGroups] = useState([])
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(WELCOME_DISMISSED_KEY) === '1'
  )
  const [activeFilter, setActiveFilter] = useState('all')

  const season = getLiturgicalSeason()
  const firstName = profile?.full_name?.split(' ')[0] || 'Friend'
  const isNewUser = profile?.created_at &&
    differenceInDays(new Date(), new Date(profile.created_at)) <= 7

  useEffect(() => {
    if (!profile) return

    if (profile.parish_id) {
      supabase.from('parishes')
        .select('id, name, city, state')
        .eq('id', profile.parish_id)
        .single()
        .then(({ data }) => { if (data) setParish(data) })
    }

    if (profile.id) {
      supabase.from('group_members')
        .select('groups(id, name, member_count, category)')
        .eq('user_id', profile.id)
        .limit(6)
        .then(({ data }) => {
          if (data) setGroups(data.map(d => d.groups).filter(Boolean))
        })
    }
  }, [profile])

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
        <div className="bg-white border-b border-gray-100">
          <div className="bg-navy px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 20 20" className="w-4 h-4 fill-gold">
                <path d="M8.5 2h3v6h6v3h-6v7h-3V11h-6V8h6z"/>
              </svg>
              <span className="text-white text-sm font-semibold">Today's Readings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: season.color }} />
              <span className="text-gray-300 text-xs">{season.label}</span>
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-400 mb-2">{format(new Date(), 'EEEE, MMMM d')}</p>
            <p className="text-navy text-sm leading-relaxed mb-3">
              Open the Faith tab for today's Mass readings and your parish community's prayer intentions.
            </p>
            <Link to="/faith" className="text-navy text-sm font-semibold hover:underline">
              Read today's readings →
            </Link>
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
        ) : (
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
        )}

        {/* Groups horizontal scroll */}
        {groups.length > 0 && (
          <div className="bg-white border-b border-gray-100 py-3">
            <div className="flex items-center justify-between px-4 mb-2">
              <h2 className="text-sm font-bold text-navy">My Groups</h2>
              <Link to="/groups" className="text-xs text-gray-400 hover:text-navy">See all</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 px-4" style={{ scrollbarWidth: 'none' }}>
              {groups.map(g => (
                <Link key={g.id} to={`/group/${g.id}`}
                  className="flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-3 w-36 hover:border-navy transition-colors">
                  <div className="w-8 h-8 bg-lightbg rounded-lg flex items-center justify-center mb-2">
                    <UserGroupIcon className="w-4 h-4 text-navy" />
                  </div>
                  <p className="text-xs font-semibold text-navy leading-tight truncate">{g.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{g.member_count || 0} members</p>
                </Link>
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-navy px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 20 20" className="w-4 h-4 fill-gold">
                  <path d="M8.5 2h3v6h6v3h-6v7h-3V11h-6V8h6z"/>
                </svg>
                <span className="text-white text-sm font-semibold">Today's Readings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: season.color }} />
                <span className="text-gray-300 text-xs">{season.label}</span>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-2">{format(new Date(), 'EEEE, MMMM d')}</p>
              <Link to="/faith" className="text-navy text-sm font-semibold hover:underline">
                Read today's readings →
              </Link>
            </div>
          </div>

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
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <BuildingLibraryIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="font-semibold text-navy text-sm mb-2">Connect with your parish</p>
              <Link to="/directory" className="text-sm text-navy font-semibold hover:underline">
                Find my parish →
              </Link>
            </div>
          )}

          {/* Groups */}
          {groups.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-navy">My Groups</h2>
                <Link to="/groups" className="text-xs text-gray-400 hover:text-navy">See all</Link>
              </div>
              <div className="flex flex-col gap-2">
                {groups.slice(0, 4).map(g => (
                  <Link key={g.id} to={`/group/${g.id}`}
                    className="flex items-center gap-2 hover:bg-lightbg rounded-lg p-1.5 transition-colors">
                    <div className="w-7 h-7 bg-lightbg rounded-lg flex items-center justify-center flex-shrink-0">
                      <UserGroupIcon className="w-4 h-4 text-navy" />
                    </div>
                    <p className="text-xs font-medium text-navy truncate flex-1">{g.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
