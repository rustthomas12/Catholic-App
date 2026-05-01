import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeftIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  HandRaisedIcon,
  CalendarIcon,
  EnvelopeIcon,
  ClipboardDocumentCheckIcon,
  LockClosedIcon,
  BellIcon,
  BellSlashIcon,
  ShieldExclamationIcon,
  UserPlusIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth.jsx'
import { useNotificationPreferences } from '../hooks/useNotificationPreferences'
import { usePushNotifications } from '../hooks/usePushNotifications'
import Modal from '../components/shared/Modal'
import LoadingSpinner from '../components/shared/LoadingSpinner'

// ── Toggle switch ─────────────────────────────────────────
function Toggle({ value, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={[
        'relative inline-flex flex-shrink-0 h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        value ? 'bg-gold' : 'bg-gray-200',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5',
          value ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
}

// ── Saved checkmark ───────────────────────────────────────
function SavedIndicator({ visible }) {
  return (
    <span
      className={`text-xs text-gold font-semibold transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      ✓
    </span>
  )
}

// ── Preference row ────────────────────────────────────────
function PrefRow({ icon: Icon, label, description, value, onChange, disabled, premiumNote }) {
  const [saved, setSaved] = useState(false)

  function handleChange(v) {
    onChange(v)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 min-h-[60px] ${disabled ? 'opacity-60' : ''}`}>
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-navy">{label}</span>
          {premiumNote && (
            <a href="/premium" className="flex items-center gap-0.5 text-xs text-gold hover:underline">
              <LockClosedIcon className="w-3 h-3" />
              {premiumNote}
            </a>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <SavedIndicator visible={saved} />
        <Toggle value={!!value} onChange={handleChange} disabled={disabled} />
      </div>
    </div>
  )
}

// ── Push notifications section ────────────────────────────
function PushSection({ userId }) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications(userId)

  return (
    <div className="bg-white mx-4 rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
      <div className="bg-navy px-4 py-3">
        <h2 className="text-white font-bold text-sm">Push Notifications</h2>
      </div>
      <div className="px-4 py-4">
        <p className="text-xs text-gray-500 mb-4">
          Get notified even when the app isn't open.
        </p>

        {!isSupported && (
          <p className="text-sm text-gray-500">
            Push notifications aren't supported in this browser.
          </p>
        )}

        {isSupported && permission === 'denied' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-800 font-medium mb-0.5">Notifications blocked</p>
            <p className="text-xs text-amber-700">
              Enable notifications in your browser or device settings, then return here.
            </p>
          </div>
        )}

        {isSupported && permission !== 'denied' && !isSubscribed && (
          <button
            onClick={subscribe}
            disabled={isLoading}
            className="flex items-center gap-2 bg-navy text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-navy/90 disabled:opacity-60 transition-colors"
          >
            {isLoading
              ? <LoadingSpinner size="sm" color="white" />
              : <BellIcon className="w-4 h-4" />}
            {isLoading ? 'Enabling…' : 'Enable push notifications'}
          </button>
        )}

        {isSupported && isSubscribed && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-navy">
              <BellIcon className="w-4 h-4 text-gold" />
              Push notifications enabled
            </div>
            <button
              onClick={unsubscribe}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors disabled:opacity-60"
            >
              {isLoading
                ? <LoadingSpinner size="sm" color="navy" />
                : <BellSlashIcon className="w-3.5 h-3.5" />}
              Turn off
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 mt-2">{error}</p>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────
export default function NotificationSettingsPage() {
  useEffect(() => { document.title = 'Notification Settings | Communio' }, [])

  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const { preferences, loading, updatePreference, turnOffAll } = useNotificationPreferences()

  const [showTurnOffModal, setShowTurnOffModal] = useState(false)
  const [isParishAdmin, setIsParishAdmin] = useState(false)
  const [isGroupAdmin, setIsGroupAdmin] = useState(false)
  const [isOrgAdmin, setIsOrgAdmin] = useState(false)
  const [isNationalOrgAdmin, setIsNationalOrgAdmin] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('parish_admins').select('parish_id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => setIsParishAdmin((count ?? 0) > 0))
    supabase.from('group_members').select('group_id', { count: 'exact', head: true }).eq('user_id', user.id).eq('role', 'admin')
      .then(({ count }) => setIsGroupAdmin((count ?? 0) > 0))
    supabase.from('organization_members').select('org_id', { count: 'exact', head: true }).eq('user_id', user.id).eq('role', 'admin')
      .then(({ count }) => {
        if ((count ?? 0) > 0) {
          setIsOrgAdmin(true)
          // Check if admin of any national org (for chapter_requests toggle)
          supabase
            .from('organization_members')
            .select('organizations!inner(org_type)')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .eq('organizations.org_type', 'national')
            .limit(1)
            .then(({ data }) => setIsNationalOrgAdmin((data ?? []).length > 0))
        }
      })
  }, [user])

  async function handleTurnOffAll() {
    await turnOffAll()
    setShowTurnOffModal(false)
  }

  const rows = [
    {
      icon: HeartIcon,
      label: t('notifications.type_likes'),
      description: t('notifications.type_likes_desc'),
      column: 'likes',
    },
    {
      icon: ChatBubbleLeftIcon,
      label: t('notifications.type_comments'),
      description: t('notifications.type_comments_desc'),
      column: 'comments',
    },
    {
      icon: UserGroupIcon,
      label: t('notifications.type_groups'),
      description: t('notifications.type_groups_desc'),
      column: 'group_invites',
    },
    {
      icon: BuildingLibraryIcon,
      label: t('notifications.type_parish'),
      description: t('notifications.type_parish_desc'),
      column: 'parish_posts',
    },
    {
      icon: HandRaisedIcon,
      label: t('notifications.type_prayer'),
      description: t('notifications.type_prayer_desc'),
      column: 'prayer_responses',
    },
    {
      icon: CalendarIcon,
      label: t('notifications.type_events'),
      description: t('notifications.type_events_desc'),
      column: 'event_reminders',
    },
    {
      icon: EnvelopeIcon,
      label: t('notifications.type_messages'),
      description: t('notifications.type_messages_desc'),
      column: 'direct_messages',
    },
    {
      icon: ClipboardDocumentCheckIcon,
      label: t('notifications.type_confession'),
      description: t('notifications.type_confession_desc'),
      column: 'confession_reminder',
    },
    {
      icon: BookOpenIcon,
      label: 'Daily Readings reminder',
      description: 'Notified at 7 AM every day to read the daily Mass readings',
      column: 'daily_readings_reminder',
    },
  ]

  return (
    <div className="min-h-screen bg-cream md:pl-60 pb-20">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="p-1 -ml-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-navy hover:bg-lightbg rounded-lg transition-colors"
          aria-label="Back"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-navy">
          {t('notifications.settings_title')}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          {t('notifications.settings_description')}
        </p>
      </div>

      {/* ── Push notifications ── */}
      <div className="max-w-2xl mx-auto">
        <PushSection userId={user?.id} />
      </div>

      {/* ── Toggle list ── */}
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="bg-white mx-4 rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-b-0">
                <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                  <div className="h-2 w-48 bg-gray-100 rounded" />
                </div>
                <div className="w-11 h-6 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white mx-4 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {rows.map((row, idx) => (
              <div key={row.column}>
                {idx > 0 && <div className="h-px bg-gray-50 mx-4" />}
                <PrefRow
                  icon={row.icon}
                  label={row.label}
                  description={row.description}
                  value={preferences[row.column]}
                  onChange={(v) => updatePreference(row.column, v)}
                  disabled={row.disabled}
                  premiumNote={row.premiumNote}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Parish admin notifications ── */}
        {!loading && isParishAdmin && (
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 mb-2">Parish Admin</p>
            <div className="bg-white mx-4 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <PrefRow
                icon={UserPlusIcon}
                label="New parish followers"
                description="When someone starts following your parish"
                value={preferences.new_parish_member}
                onChange={(v) => updatePreference('new_parish_member', v)}
              />
            </div>
          </div>
        )}

        {/* ── Group admin notifications ── */}
        {!loading && isGroupAdmin && (
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 mb-2">Group Admin</p>
            <div className="bg-white mx-4 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <PrefRow
                icon={UserGroupIcon}
                label="New posts in my groups"
                description="When a member posts in a group you admin"
                value={preferences.group_posts}
                onChange={(v) => updatePreference('group_posts', v)}
              />
              <div className="h-px bg-gray-50 mx-4" />
              <PrefRow
                icon={UserPlusIcon}
                label="New group members"
                description="When someone joins a group you admin"
                value={preferences.new_group_member}
                onChange={(v) => updatePreference('new_group_member', v)}
              />
            </div>
          </div>
        )}

        {/* ── Org admin notifications ── */}
        {!loading && isOrgAdmin && (
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 mb-2">Organization Admin</p>
            <div className="bg-white mx-4 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <PrefRow
                icon={UserPlusIcon}
                label="New org members"
                description="When someone joins an organization you admin"
                value={preferences.new_org_member}
                onChange={(v) => updatePreference('new_org_member', v)}
              />
              {isNationalOrgAdmin && (
                <>
                  <div className="h-px bg-gray-50 mx-4" />
                  <PrefRow
                    icon={UserGroupIcon}
                    label="Chapter requests"
                    description="When a group requests to become a chapter of your national org"
                    value={preferences.chapter_requests}
                    onChange={(v) => updatePreference('chapter_requests', v)}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Platform admin notifications ── */}
        {!loading && isAdmin && (
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 mb-2">Platform Admin</p>
            <div className="bg-white mx-4 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <PrefRow
                icon={ShieldExclamationIcon}
                label="Post reports"
                description="When a member reports a post for review"
                value={preferences.post_flagged}
                onChange={(v) => updatePreference('post_flagged', v)}
              />
            </div>
          </div>
        )}

        {/* ── Turn off all ── */}
        {!loading && (
          <div className="px-4 mt-6">
            <button
              onClick={() => setShowTurnOffModal(true)}
              className="text-sm text-red-500 font-medium hover:underline min-h-[44px]"
            >
              {t('notifications.turn_off_all')}
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm modal ── */}
      <Modal
        isOpen={showTurnOffModal}
        onClose={() => setShowTurnOffModal(false)}
        title={t('notifications.turn_off_all_confirm')}
        size="sm"
      >
        <p className="text-sm text-gray-500 mb-5">
          You can turn individual notifications back on at any time.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTurnOffModal(false)}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleTurnOffAll}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 min-h-[44px]"
          >
            Turn off all
          </button>
        </div>
      </Modal>
    </div>
  )
}
