import { memo, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  HomeIcon, UserGroupIcon, MapIcon,
  BellIcon, Cog6ToothIcon, BuildingLibraryIcon,
  BuildingOffice2Icon, ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  MapIcon as MapIconSolid,
  BellIcon as BellIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
} from '@heroicons/react/24/solid'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useNotifications } from '../../hooks/useNotifications'
import { getLiturgicalSeason } from '../../utils/liturgical'
import Avatar from './Avatar'
import LanguageSwitcher from './LanguageSwitcher'
import { supabase } from '../../lib/supabase'

const PUBLIC_PATHS = [
  '/login', '/signup', '/onboarding',
  '/forgot-password', '/reset-password',
  '/terms', '/privacy', '/policy', '/pitch',
]

function CrossIcon({ solid = false, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-6 h-6 ${className}`} fill={solid ? 'currentColor' : 'none'} stroke={solid ? 'none' : 'currentColor'} strokeWidth="1.5">
      {solid
        ? <path d="M10.5 3h3v6h4.5v3H13.5v11h-3V12H6V9h4.5z" />
        : <><path d="M12 4v16M8 8h8" strokeLinecap="round"/></>
      }
    </svg>
  )
}

// ── Desktop sidebar tabs (all 5) ──────────────────────────
const desktopTabs = [
  {
    label: 'Home',
    Icon: HomeIcon,
    IconSolid: HomeIconSolid,
    active: (p) => p === '/',
    to: '/',
  },
  {
    label: 'Groups',
    Icon: UserGroupIcon,
    IconSolid: UserGroupIconSolid,
    active: (p) => p.startsWith('/groups') || p.startsWith('/group/'),
    to: '/groups',
  },
  {
    label: 'Faith',
    Icon: CrossIcon,
    IconSolid: (props) => <CrossIcon solid {...props} />,
    active: (p) => p.startsWith('/faith') || p.startsWith('/saints'),
    to: '/faith',
    isFaith: true,
  },
  {
    label: 'Directory',
    Icon: MapIcon,
    IconSolid: MapIconSolid,
    active: (p) => p.startsWith('/directory') || p.startsWith('/parish/'),
    to: '/directory',
  },
  {
    label: 'Profile',
    Icon: null,
    IconSolid: null,
    active: (p) => p.startsWith('/profile') || p.startsWith('/settings'),
    to: '/profile',
    isProfile: true,
  },
]

// ── Mobile bottom tabs (5: Home, Groups, Faith, Messages, Profile) ──
const mobileTabs = [
  {
    label: 'Home',
    Icon: HomeIcon,
    IconSolid: HomeIconSolid,
    active: (p) => p === '/',
    to: '/',
  },
  {
    label: 'Groups',
    Icon: UserGroupIcon,
    IconSolid: UserGroupIconSolid,
    active: (p) => p.startsWith('/groups') || p.startsWith('/group/'),
    to: '/groups',
  },
  {
    label: 'Faith',
    Icon: CrossIcon,
    IconSolid: (props) => <CrossIcon solid {...props} />,
    active: (p) => p.startsWith('/faith') || p.startsWith('/saints'),
    to: '/faith',
    isFaith: true,
  },
  {
    label: 'Messages',
    Icon: ChatBubbleLeftRightIcon,
    IconSolid: ChatBubbleLeftRightIconSolid,
    active: (p) => p === '/messages',
    to: '/messages',
    isDM: true,
  },
  {
    label: 'Profile',
    Icon: null,
    IconSolid: null,
    active: (p) => p.startsWith('/profile') || p.startsWith('/settings'),
    to: '/profile',
    isProfile: true,
  },
]

function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, profile, user, signOut } = useAuth()
  const { unreadCount } = useNotifications()
  const season = getLiturgicalSeason()
  const [adminParishId, setAdminParishId] = useState(null)
  const [adminOrgId, setAdminOrgId] = useState(null)
  const [unreadDMs, setUnreadDMs] = useState(0)

  useEffect(() => {
    if (!user) { setAdminParishId(null); setAdminOrgId(null); setUnreadDMs(0); return }

    supabase
      .from('parish_admins')
      .select('parish_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setAdminParishId(data?.parish_id ?? null))
      .catch(() => {})

    supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .limit(1)
      .then(({ data }) => setAdminOrgId(data?.[0]?.org_id ?? null))
      .catch(() => {})

    // Unread premium DMs
    supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)
      .eq('is_premium_dm', true)
      .then(({ count }) => setUnreadDMs(count ?? 0))
      .catch(() => {})
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const isPublic = PUBLIC_PATHS.some(p =>
    location.pathname === p || location.pathname.startsWith(p + '/')
  )
  if (!isAuthenticated || isPublic) return null

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-navy border-t border-white/10 safe-bottom">
        <div className="flex items-center justify-around h-16">
          {mobileTabs.map((tab) => {
            const active = tab.active(location.pathname)
            const { Icon, IconSolid, label, to, isFaith, isProfile, isDM } = tab

            return (
              <Link
                key={to}
                to={to}
                className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 group"
              >
                <div className="relative flex items-center justify-center">
                  {isProfile ? (
                    <div className={`rounded-full ring-2 transition-all ${active ? 'ring-gold' : 'ring-transparent'}`}>
                      <Avatar
                        src={profile?.avatar_url}
                        name={profile?.full_name || 'Me'}
                        size="xs"
                        isVerifiedClergy={profile?.is_verified_clergy}
                      />
                    </div>
                  ) : active ? (
                    <IconSolid className="w-6 h-6 text-gold" />
                  ) : (
                    <Icon className="w-6 h-6 text-gray-400 group-hover:text-gray-200 transition-colors" />
                  )}

                  {isFaith && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-navy"
                      style={{ backgroundColor: season.color }}
                    />
                  )}

                  {/* DM badge */}
                  {isDM && unreadDMs > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                      {unreadDMs > 9 ? '9+' : unreadDMs}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${active ? 'text-gold' : 'text-gray-400'}`}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Desktop left sidebar ── */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-60 bg-navy flex-col py-6 px-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 px-3 mb-8">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" className="w-5 h-5 fill-navy">
              <path d="M8.5 2h3v6h6v3h-6v7h-3V11h-6V8h6z"/>
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Communio</span>
        </Link>

        {/* Main navigation */}
        <div className="flex flex-col gap-1 flex-1">
          {desktopTabs.map((tab) => {
            const active = tab.active(location.pathname)
            const { Icon, IconSolid, label, to, isFaith, isProfile } = tab

            return (
              <Link key={to} to={to}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}>
                <div className="relative w-5 flex items-center justify-center">
                  {isProfile ? (
                    <Avatar src={profile?.avatar_url} name={profile?.full_name || 'Me'} size="xs"
                      isVerifiedClergy={profile?.is_verified_clergy} />
                  ) : active ? (
                    <IconSolid className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  {isFaith && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-navy"
                      style={{ backgroundColor: season.color }} />
                  )}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </Link>
            )
          })}

          {/* Notifications */}
          <Link to="/notifications"
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              location.pathname === '/notifications' ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}>
            <div className="relative w-5">
              {location.pathname === '/notifications'
                ? <BellIconSolid className="w-5 h-5" />
                : <BellIcon className="w-5 h-5" />}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-sm font-medium">Notifications</span>
          </Link>

          {/* Settings */}
          <Link to="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              location.pathname.startsWith('/settings') ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}>
            <Cog6ToothIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Settings</span>
          </Link>

          {/* Organizations */}
          <Link to="/organizations"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              location.pathname.startsWith('/organizations') || location.pathname.startsWith('/organization/') || location.pathname.startsWith('/org-admin/')
                ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}>
            <BuildingOffice2Icon className="w-5 h-5" />
            <span className="text-sm font-medium">Organizations</span>
          </Link>

          {/* Messages */}
          <Link to="/messages"
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              location.pathname === '/messages' ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}>
            <div className="relative w-5">
              {location.pathname === '/messages'
                ? <ChatBubbleLeftRightIconSolid className="w-5 h-5" />
                : <ChatBubbleLeftRightIcon className="w-5 h-5" />}
              {unreadDMs > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                  {unreadDMs > 9 ? '9+' : unreadDMs}
                </span>
              )}
            </div>
            <span className="text-sm font-medium">Messages</span>
          </Link>

          {/* Parish Admin link — only for parish admins */}
          {adminParishId && (
            <Link to={`/parish-admin/${adminParishId}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                location.pathname.startsWith('/parish-admin') ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}>
              <BuildingLibraryIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Parish Admin</span>
            </Link>
          )}

          {/* Org Admin link — only for org admins */}
          {adminOrgId && (
            <Link to={`/org-admin/${adminOrgId}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                location.pathname.startsWith('/org-admin') ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}>
              <BuildingOffice2Icon className="w-5 h-5" />
              <span className="text-sm font-medium">Org Admin</span>
            </Link>
          )}
        </div>

        {/* User info + sign out at bottom */}
        <div className="border-t border-white/10 pt-4 mt-2">
          <div className="flex items-center gap-3 px-3 mb-3">
            <Avatar src={profile?.avatar_url} name={profile?.full_name || 'Me'} size="sm"
              isVerifiedClergy={profile?.is_verified_clergy} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name || 'Parish Member'}</p>
              {profile?.parish_id && (
                <p className="text-gray-400 text-xs truncate">Parish member</p>
              )}
            </div>
          </div>
          <div className="px-1 py-1 mb-1">
            <LanguageSwitcher variant="compact" />
          </div>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Sign out
          </button>
        </div>
      </nav>
    </>
  )
}

export default memo(Navigation)
