import { Link, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  UserGroupIcon,
  MapIcon,
  UserCircleIcon,
  BellIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  MapIcon as MapIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  BellIcon as BellIconSolid,
} from '@heroicons/react/24/solid'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useNotifications } from '../../hooks/useNotifications'
import { getLiturgicalSeason } from '../../utils/liturgical'

const PUBLIC_PATHS = [
  '/login', '/signup', '/onboarding',
  '/forgot-password', '/reset-password',
  '/terms', '/privacy', '/policy',
]

// Custom cross SVG for Faith tab
function CrossIcon({ solid = false, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-6 h-6 ${className}`} fill={solid ? 'currentColor' : 'none'} stroke={solid ? 'none' : 'currentColor'} strokeWidth="1.5">
      <path d="M12 3v7M8 7h8M12 10v11" strokeLinecap="round" />
      {solid && <path d="M10.5 3h3v6h4.5v3H13.5v11h-3V12H6V9h4.5z" />}
    </svg>
  )
}

const tabs = [
  { to: '/', label: 'Home', Icon: HomeIcon, IconSolid: HomeIconSolid },
  { to: '/groups', label: 'Groups', Icon: UserGroupIcon, IconSolid: UserGroupIconSolid },
  { to: '/faith', label: 'Faith', Icon: CrossIcon, IconSolid: (p) => <CrossIcon solid {...p} /> },
  { to: '/directory', label: 'Directory', Icon: MapIcon, IconSolid: MapIconSolid },
  { to: '/profile', label: 'Profile', Icon: UserCircleIcon, IconSolid: UserCircleIconSolid },
]

export default function Navigation() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { unreadCount } = useNotifications()
  const season = getLiturgicalSeason()

  const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p))
  if (!isAuthenticated || isPublic) return null

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <>
      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-navy safe-bottom">
        <div className="flex items-center justify-around h-16">
          {tabs.map(({ to, label, Icon, IconSolid }) => {
            const active = isActive(to)
            const isFaith = to === '/faith'
            const isProfile = to === '/profile'

            return (
              <Link
                key={to}
                to={to}
                className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 group"
              >
                <div className="relative">
                  {active
                    ? <IconSolid className="w-6 h-6 text-gold" />
                    : <Icon className="w-6 h-6 text-gray-400 group-hover:text-gray-200 transition-colors" />
                  }
                  {/* Season dot on Faith tab */}
                  {isFaith && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-navy"
                      style={{ backgroundColor: season.color }}
                    />
                  )}
                  {/* Notification badge on Profile tab */}
                  {isProfile && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
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
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-60 lg:w-60 bg-navy flex-col py-6 px-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 px-3 mb-8">
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-gold flex-shrink-0">
            <path d="M10.5 3h3v6h4.5v3H13.5v11h-3V12H6V9h4.5z" />
          </svg>
          <span className="text-white font-bold text-lg tracking-tight">Parish</span>
        </Link>

        {/* Main tabs */}
        <div className="flex flex-col gap-1 flex-1">
          {tabs.map(({ to, label, Icon, IconSolid }) => {
            const active = isActive(to)
            const isFaith = to === '/faith'

            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="relative">
                  {active
                    ? <IconSolid className="w-5 h-5" />
                    : <Icon className="w-5 h-5" />
                  }
                  {isFaith && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-navy"
                      style={{ backgroundColor: season.color }}
                    />
                  )}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </Link>
            )
          })}

          {/* Notifications */}
          <Link
            to="/notifications"
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive('/notifications') ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="relative">
              {isActive('/notifications') ? <BellIconSolid className="w-5 h-5" /> : <BellIcon className="w-5 h-5" />}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-sm font-medium">Notifications</span>
          </Link>
        </div>

        {/* Settings at bottom */}
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive('/settings') ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Cog6ToothIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
      </nav>
    </>
  )
}
