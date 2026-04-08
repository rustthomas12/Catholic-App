import { useState } from 'react'
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
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth.jsx'
import { useNotificationPreferences } from '../hooks/useNotificationPreferences'
import Modal from '../components/shared/Modal'

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
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <LockClosedIcon className="w-3 h-3" />
              {premiumNote}
            </span>
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

// ── Page ─────────────────────────────────────────────────
export default function NotificationSettingsPage() {
  document.title = 'Notification Settings | Parish App'

  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { isPremium } = useAuth()
  const { preferences, loading, updatePreference, turnOffAll } = useNotificationPreferences()

  const [showTurnOffModal, setShowTurnOffModal] = useState(false)

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
      premiumNote: !isPremium ? t('notifications.type_confession_premium') : null,
      disabled: !isPremium,
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
