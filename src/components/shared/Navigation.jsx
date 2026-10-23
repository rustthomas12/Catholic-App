import { memo, useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  HomeIcon, UserGroupIcon, MapIcon,
  BellIcon, Cog6ToothIcon, BuildingLibraryIcon,
  BuildingOffice2Icon, ChatBubbleLeftRightIcon,
  ShieldExclamationIcon, Bars3Icon, XMarkIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  BellIcon as BellIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  MapIcon as MapIconSolid,
} from '@heroicons/react/24/solid'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useNotifications } from '../../hooks/useNotifications'
import { useAdminAccess } from '../../hooks/useAdminAccess'
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

// ── Desktop sidebar tabs ───────────────────────────────────
const desktopTabs = [
  {
    label: 'nav.home',
    Icon: HomeIcon,
    IconSolid: HomeIconSolid,
    active: (p) => p === '/',
    to: '/',
  },
  {
    label: 'nav.groups',
    Icon: UserGroupIcon,
    IconSolid: UserGroupIconSolid,
    active: (p) => p.startsWith('/groups') || p.startsWith('/group/'),
    to: '/groups',
  },
  {
    label: 'nav.faith',
    Icon: CrossIcon,
    IconSolid: (props) => <CrossIcon solid {...props} />,
    active: (p) => p.startsWith('/faith') || p.startsWith('/saints'),
    to: '/faith',
    isFaith: true,
  },
  {
    label: 'nav.directory',
    Icon: MapIcon,
    IconSolid: MapIconSolid,
    active: (p) => p.startsWith('/directory') || p.startsWith('/parish/'),
    to: '/directory',
  },
  {
    label: 'nav.profile',
    Icon: null,
    IconSolid: null,
    active: (p) => p.startsWith('/profile') || p === '/settings/profile',
    to: '/profile',
    isProfile: true,
  },
]

// ── Mobile bottom tabs ─────────────────────────────────────
// Home · Groups · Faith · Notifications · More
const mobileTabs = [
  {
    label: 'nav.home',
    Icon: HomeIcon,
    IconSolid: HomeIconSolid,
    active: (p) => p === '/',
    to: '/',
  },
  {
    label: 'nav.groups',
    Icon: UserGroupIcon,
    IconSolid: UserGroupIconSolid,
    active: (p) => p.startsWith('/groups') || p.startsWith('/group/'),
    to: '/groups',
  },
  {
    label: 'nav.faith',
    Icon: CrossIcon,
    IconSolid: (props) => <CrossIcon solid {...props} />,
    active: (p) => p.startsWith('/faith') || p.startsWith('/saints'),
    to: '/faith',
    isFaith: true,
  },
  {
    label: 'nav.alerts',
    Icon: BellIcon,
    IconSolid: BellIconSolid,
    active: (p) => p === '/notifications',
    to: '/notifications',
    isBell: true,
  },
]

// ── More sheet ─────────────────────────────────────────────
function MoreSheet({ open, onClose, profile, unreadDMs, isPlatformAdmin, parishAdminRecords, orgAdminRecords, onSignOut }) {
  const location = useLocation()
  const sheetRef = useRef(null)
  const [adminExpanded, setAdminExpanded] = useState(false)
  const { t } = useTranslation('common')

  const hasAdmin = isPlatformAdmin || parishAdminRecords.length > 0 || orgAdminRecords.length > 0

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => { onClose() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const isActive = (path) => location.pathname.startsWith(path)

  // Chevron icon
  function Chevron({ flipped }) {
    return (
      <svg className={`w-4 h-4 text-white/70 transition-transform duration-200 ${flipped ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 md:hidden ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={handleBackdrop}
        aria-hidden="true"
      />

      {/* Sheet — navy to match sidebar */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-navy rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.more_options')}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Profile card */}
        <Link to="/profile" className="flex items-center gap-3 px-5 py-4 border-b border-white/10 active:bg-white/5 transition-colors">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || 'Me'}
            size="md"
            isVerifiedClergy={profile?.is_verified_clergy}
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">{profile?.full_name || 'My Profile'}</p>
            {profile?.username
              ? <p className="text-xs text-white/50">@{profile.username}</p>
              : <p className="text-xs text-white/70">View profile</p>
            }
          </div>
          <Chevron />
        </Link>

        {/* Nav links */}
        <div className="py-2">
          <SheetRow to="/messages"      Icon={ChatBubbleLeftRightIcon} label={t('nav.messages')}      badge={unreadDMs} active={isActive('/messages')} />
          <SheetRow to="/directory"     Icon={MapIcon}                 label={t('nav.directory')}     active={isActive('/directory') || isActive('/parish/')} />
          <SheetRow to="/organizations" Icon={BuildingOffice2Icon}     label={t('nav.organizations')} active={isActive('/organizations') || isActive('/organization/') || isActive('/org-admin/')} />
          <SheetRow to="/settings"      Icon={Cog6ToothIcon}           label={t('nav.settings')}      active={isActive('/settings')} />

          {/* Admin — collapsible */}
          {hasAdmin && (
            <>
              <div className="mx-5 border-t border-white/10 my-2" />
              <button
                onClick={() => setAdminExpanded(p => !p)}
                className="w-full flex items-center gap-4 px-5 py-3 active:bg-white/5 transition-colors"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${adminExpanded ? 'bg-red-500/20' : 'bg-white/10'}`}>
                  <ShieldExclamationIcon className={`w-5 h-5 ${adminExpanded ? 'text-red-400' : 'text-white/70'}`} />
                </div>
                <span className="flex-1 text-left text-sm font-medium text-white/80">{t('nav.admin')}</span>
                <Chevron flipped={adminExpanded} />
              </button>

              {adminExpanded && (
                <div className="mx-4 mb-1 rounded-xl bg-white/5 overflow-hidden">
                  {isPlatformAdmin && (
                    <SheetSubRow to="/admin" Icon={ShieldExclamationIcon} label={t('nav.platform_admin')} danger active={isActive('/admin')} />
                  )}
                  {parishAdminRecords.map(record => (
                    <SheetSubRow
                      key={record.parish_id}
                      to={`/parish-admin/${record.parish_id}`}
                      Icon={BuildingLibraryIcon}
                      label={record.parishes?.name || t('nav.my_parish')}
                      active={location.pathname === `/parish-admin/${record.parish_id}`}
                    />
                  ))}
                  {orgAdminRecords.map(record => (
                    <SheetSubRow
                      key={record.org_id}
                      to={`/org-admin/${record.org_id}`}
                      Icon={BuildingOffice2Icon}
                      label={record.organizations?.name || t('nav.my_organization')}
                      active={location.pathname === `/org-admin/${record.org_id}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mx-5 border-t border-white/10 my-2" />

          {/* Sign out */}
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-4 px-5 py-3 active:bg-white/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <ArrowRightOnRectangleIcon className="w-5 h-5 text-white/60" />
            </div>
            <span className="text-sm font-medium text-white/60">{t('nav.sign_out')}</span>
          </button>
        </div>

        <div className="px-5 pb-4">
          <LanguageSwitcher variant="compact" />
        </div>
      </div>
    </>
  )
}

function SheetRow({ to, Icon, label, badge, active }) {
  return (
    <Link to={to} className="flex items-center gap-4 px-5 py-3 active:bg-white/5 transition-colors">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-gold/20' : 'bg-white/10'}`}>
        <Icon className={`w-5 h-5 ${active ? 'text-gold' : 'text-white/70'}`} />
      </div>
      <span className={`flex-1 text-sm font-medium ${active ? 'text-gold' : 'text-white/80'}`}>{label}</span>
      {badge > 0
        ? <span className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{badge > 9 ? '9+' : badge}</span>
        : <svg className="w-4 h-4 text-white/20 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      }
    </Link>
  )
}

function SheetSubRow({ to, Icon, label, active, danger }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-2.5 active:bg-white/5 transition-colors">
      <Icon className={`w-4 h-4 flex-shrink-0 ${danger ? 'text-red-400' : active ? 'text-gold' : 'text-white/50'}`} />
      <span className={`flex-1 text-sm truncate ${danger ? 'text-red-400' : active ? 'text-gold font-medium' : 'text-white/60'}`}>{label}</span>
    </Link>
  )
}

// ── Main Navigation ────────────────────────────────────────
function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, profile, user, signOut } = useAuth()
  const { unreadCount } = useNotifications()
  const { isPlatformAdmin, parishAdminRecords, orgAdminRecords } = useAdminAccess()
  const season = getLiturgicalSeason()
  const { t } = useTranslation('common')
  const [unreadDMs, setUnreadDMs] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)

  // Unread DM badge: recount on navigation, when a thread is read,
  // and when a new message arrives.
  const recountDMs = useCallback(() => {
    if (!user) { setUnreadDMs(0); return }
    supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadDMs(count ?? 0))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { recountDMs() }, [recountDMs, location.pathname])

  // One realtime channel per mount (unique name — re-using a name returns the
  // already-subscribed channel and .on() then throws).
  useEffect(() => {
    if (!user) return
    const suffix = Math.random().toString(36).slice(2)
    window.addEventListener('infold:dms-read', recountDMs)
    const channel = supabase
      .channel(`dm_badge_${user.id}_${suffix}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `recipient_id=eq.${user.id}`,
      }, recountDMs)
      .subscribe()
    return () => {
      window.removeEventListener('infold:dms-read', recountDMs)
      supabase.removeChannel(channel)
    }
  }, [user?.id, recountDMs]) // eslint-disable-line react-hooks/exhaustive-deps

  const isPublic = PUBLIC_PATHS.some(p =>
    location.pathname === p || location.pathname.startsWith(p + '/')
  )
  if (!isAuthenticated || isPublic) return null

  // "More" is visually active when on a page only reachable from the sheet
  const moreActive = (
    location.pathname.startsWith('/profile') ||
    location.pathname.startsWith('/settings') ||
    location.pathname === '/messages' ||
    location.pathname.startsWith('/directory') ||
    location.pathname.startsWith('/parish/') ||
    location.pathname.startsWith('/organizations') ||
    location.pathname.startsWith('/organization/') ||
    location.pathname.startsWith('/org-admin/') ||
    location.pathname.startsWith('/parish-admin/') ||
    location.pathname.startsWith('/admin')
  )

  async function handleSignOut() {
    setMoreOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-navy border-t border-white/10 safe-bottom" aria-label="Main">
        <div className="flex items-center justify-around h-16">
          {mobileTabs.map((tab) => {
            const active = tab.active(location.pathname)
            const { Icon, IconSolid, label, to, isFaith, isBell } = tab

            return (
              <Link
                key={to}
                to={to}
                className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 group"
              >
                <div className="relative flex items-center justify-center">
                  {active ? (
                    <IconSolid className="w-6 h-6 text-gold" />
                  ) : (
                    <Icon className="w-6 h-6 text-gray-300 group-hover:text-gray-200 transition-colors" />
                  )}

                  {isFaith && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-navy"
                      style={{ backgroundColor: season.color }}
                    />
                  )}

                  {isBell && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-medium ${active ? 'text-gold' : 'text-gray-300'}`}>
                  {t(label)}
                </span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 group"
            aria-label={t('nav.more_options')}
          >
            <div className="relative flex items-center justify-center">
              {/* Avatar when "more" pages are active, hamburger otherwise */}
              {moreActive ? (
                <div className="rounded-full ring-2 ring-gold">
                  <Avatar
                    src={profile?.avatar_url}
                    name={profile?.full_name || 'Me'}
                    size="xs"
                    isVerifiedClergy={profile?.is_verified_clergy}
                  />
                </div>
              ) : (
                <div className="relative">
                  <Avatar
                    src={profile?.avatar_url}
                    name={profile?.full_name || 'Me'}
                    size="xs"
                    isVerifiedClergy={profile?.is_verified_clergy}
                  />
                  {/* Dot badge if DMs unread — visible even when not active */}
                  {unreadDMs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border border-navy" />
                  )}
                </div>
              )}
            </div>
            <span className={`text-[11px] font-medium ${moreActive ? 'text-gold' : 'text-gray-300'}`}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* ── More slide-up sheet ── */}
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        profile={profile}
        unreadDMs={unreadDMs}
        isPlatformAdmin={isPlatformAdmin}
        parishAdminRecords={parishAdminRecords}
        orgAdminRecords={orgAdminRecords}
        onSignOut={handleSignOut}
      />

      {/* ── Desktop left sidebar ── */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-60 bg-navy flex-col py-6 px-3 overflow-y-auto overscroll-contain" aria-label="Main">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 px-3 mb-8">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" className="w-5 h-5 fill-navy">
              <path d="M8.5 2h3v6h6v3h-6v7h-3V11h-6V8h6z"/>
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">inFold</span>
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
                <span className="text-sm font-medium">{t(label)}</span>
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
                <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-sm font-medium">{t('nav.notifications')}</span>
          </Link>

          {/* Settings */}
          <Link to="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              location.pathname.startsWith('/settings') && location.pathname !== '/settings/profile' ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}>
            <Cog6ToothIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{t('nav.settings')}</span>
          </Link>

          {/* Organizations */}
          <Link to="/organizations"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              location.pathname.startsWith('/organizations') || location.pathname.startsWith('/organization/') || location.pathname.startsWith('/org-admin/')
                ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}>
            <BuildingOffice2Icon className="w-5 h-5" />
            <span className="text-sm font-medium">{t('nav.organizations')}</span>
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
                <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold leading-none">
                  {unreadDMs > 9 ? '9+' : unreadDMs}
                </span>
              )}
            </div>
            <span className="text-sm font-medium">{t('nav.messages')}</span>
          </Link>

          {/* Admin section */}
          {(isPlatformAdmin || parishAdminRecords.length > 0 || orgAdminRecords.length > 0) && (
            <>
              <div className="mx-3 border-t border-white/10 my-1" />
              <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-white/70 uppercase tracking-widest">
                {t('nav.admin')}
              </p>

              {isPlatformAdmin && (
                <Link to="/admin"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    location.pathname.startsWith('/admin') ? 'bg-red-900/40 text-red-300' : 'text-red-400 hover:bg-red-900/20 hover:text-red-300'
                  }`}>
                  <ShieldExclamationIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">{t('nav.platform_admin')}</span>
                </Link>
              )}

              {parishAdminRecords.map(record => (
                <Link key={record.parish_id} to={`/parish-admin/${record.parish_id}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    location.pathname === `/parish-admin/${record.parish_id}` ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}>
                  <BuildingLibraryIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {record.parishes?.name || t('nav.my_parish')}
                  </span>
                </Link>
              ))}

              {orgAdminRecords.map(record => (
                <Link key={record.org_id} to={`/org-admin/${record.org_id}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    location.pathname === `/org-admin/${record.org_id}` ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}>
                  <BuildingOffice2Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {record.organizations?.name || t('nav.my_organization')}
                  </span>
                </Link>
              ))}
            </>
          )}
        </div>

        {/* User info + sign out */}
        <div className="border-t border-white/10 pt-4 mt-2">
          <div className="flex items-center gap-3 px-3 mb-3">
            <Avatar src={profile?.avatar_url} name={profile?.full_name || 'Me'} size="sm"
              isVerifiedClergy={profile?.is_verified_clergy} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name || 'Parish Member'}</p>
              <p className="text-gray-300 text-xs truncate">
                {t(isPlatformAdmin ? 'nav.role_platform_admin'
                  : profile?.is_verified_clergy ? 'nav.role_clergy'
                  : parishAdminRecords.length > 0 ? 'nav.role_parish_admin'
                  : orgAdminRecords.length > 0 ? 'nav.role_org_admin'
                  : profile?.parish_id ? 'nav.role_parish_member'
                  : 'nav.role_member')}
              </p>
            </div>
          </div>
          <div className="px-1 py-1 mb-1">
            <LanguageSwitcher variant="compact" />
          </div>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            {t('nav.sign_out')}
          </button>
        </div>
      </nav>
    </>
  )
}

export default memo(Navigation)
