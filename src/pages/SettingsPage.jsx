import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TopBar from '../components/shared/TopBar'
import {
  ChevronRightIcon, UserIcon, BellIcon,
  ShieldCheckIcon, InformationCircleIcon, ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon, EnvelopeIcon, NoSymbolIcon, KeyIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase, supabaseAuth } from '../lib/supabase'
import { apiUrl } from '../lib/platform'
import Modal from '../components/shared/Modal'
import Button from '../components/shared/Button'
import { toast } from '../components/shared/Toast'
import LanguageSwitcher from '../components/shared/LanguageSwitcher'
import ChurchSelect from '../components/shared/ChurchSelect'
import pkgJson from '../../package.json'
import { useTranslation } from 'react-i18next'

function SettingsRow({ icon: Icon, label, value, to, onClick, danger = false }) {
  const cls = `flex items-center gap-3 w-full px-4 py-3.5 min-h-[52px] ${danger ? 'text-red-600' : 'text-navy'} hover:bg-lightbg transition-colors`
  const content = (
    <>
      {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${danger ? 'text-red-500' : 'text-gray-500'}`} />}
      <span className="flex-1 text-sm font-medium text-left">{label}</span>
      {value && <span className="text-sm text-gray-500">{value}</span>}
      {(to || onClick) && !danger && <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />}
    </>
  )
  if (to) return <Link to={to} className={cls}>{content}</Link>
  return <button type="button" onClick={onClick} className={cls}>{content}</button>
}

function SectionHeader({ title }) {
  return <h2 className="px-7 pt-6 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h2>
}

// One rounded card of rows, iOS Settings style
function Group({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl mx-3 overflow-hidden border border-gray-100 shadow-sm divide-y divide-gray-50 ${className}`}>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  useEffect(() => { document.title = `${t('settings.title', 'Settings')} | inFold` }, [t])
  const { user, profile, signOut, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  async function handleDeleteAccount() {
    if (deleteInput !== 'DELETE') return
    setDeleting(true)
    try {
      // Get the current session token to authenticate the server request
      const { data: { session } } = await supabaseAuth.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch(apiUrl('/api/delete-account'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('settings.delete_failed', 'Could not delete account'))

      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.message || t('status.error'))
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto pb-24">

        <TopBar title={t('settings.title', 'Settings')} back="/profile" />

        {/* Account */}
        <SectionHeader title={t('settings.account', 'Account')} />
        <Group>
          <SettingsRow icon={EnvelopeIcon} label={t('settings.email', 'Email')} value={user?.email} />
          <SettingsRow icon={KeyIcon} label={t('settings.change_password', 'Change password')} to="/forgot-password" />
          <SettingsRow icon={UserIcon} label={t('settings.edit_profile', 'Edit profile')} to="/settings/profile" />
        </Group>

        {/* Notifications */}
        <SectionHeader title={t('nav.notifications')} />
        <Group>
          <SettingsRow
            icon={BellIcon}
            label={t('settings.notification_prefs', 'Notification preferences')}
            to="/settings/notifications"
          />
        </Group>

        {/* Privacy & safety */}
        <SectionHeader title={t('settings.privacy', 'Privacy & safety')} />
        <Group>
          <div className="flex items-center justify-between px-4 py-3.5 min-h-[52px]">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium text-navy">{t('settings.who_can_see', 'Who can see my profile')}</span>
            </div>
            <select
              aria-label={t('settings.who_can_see', 'Who can see my profile')}
              value={profile?.profile_visibility || 'public'}
              onChange={async e => {
                const { error } = await updateProfile({ profile_visibility: e.target.value })
                if (error) toast.error(error)
                else toast.success(t('settings.visibility_updated', 'Visibility updated'))
              }}
              className="text-sm text-gray-500 border border-gray-200 rounded-lg px-2 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-gold">
              <option value="public">{t('settings.everyone', 'Everyone')}</option>
              <option value="members_only">{t('settings.my_communities', 'My communities')}</option>
            </select>
          </div>
          <SettingsRow icon={NoSymbolIcon} label={t('settings.blocked', 'Blocked users')} to="/settings/blocked" />
        </Group>

        {/* Language / Idioma — always bilingual so Spanish speakers can find it */}
        <SectionHeader title="Language / Idioma" />
        <Group>
          <div className="px-4 py-4">
            <LanguageSwitcher variant="full" />
          </div>
        </Group>

        {/* Church — Latin or one of the 23 Eastern Catholic Churches */}
        <SectionHeader title={t('settings.church', 'My Church')} />
        <Group>
          <div className="px-4 py-4">
            <ChurchSelect
              ariaLabel={t('settings.church', 'My Church')}
              value={profile?.church}
              onChange={async (church) => {
                const { error } = await updateProfile({ church })
                if (error) toast.error(error)
                else toast.success(t('settings.church_updated', 'Church updated'))
              }}
              className="w-full text-sm text-navy border border-gray-200 rounded-lg px-3 min-h-[44px] bg-white focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <p className="text-xs text-gray-500 mt-2">
              {t('settings.church_hint', 'The Catholic Church is 24 Churches in full communion: the Latin Church and 23 Eastern Catholic Churches.')}
            </p>
          </div>
        </Group>

        {/* About */}
        <SectionHeader title={t('settings.about', 'About')} />
        <Group>
          <SettingsRow icon={EnvelopeIcon} label={t('settings.contact', 'Contact us')} to="/contact" />
          <SettingsRow icon={null} label={t('settings.terms', 'Terms of Service')} to="/terms" />
          <SettingsRow icon={null} label={t('settings.privacy_policy', 'Privacy Policy')} to="/privacy" />
          <SettingsRow icon={null} label={t('settings.content_policy', 'Content Policy')} to="/policy" />
          <SettingsRow icon={InformationCircleIcon} label={t('settings.version', 'Version')} value={`v${pkgJson.version}`} />
        </Group>

        {/* Sign out */}
        <Group className="mt-6">
          <button
            onClick={() => setShowSignOutModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-navy text-sm font-semibold hover:bg-lightbg transition-colors min-h-[52px]">
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-gray-500" />
            {t('settings.sign_out', 'Sign out')}
          </button>
        </Group>

        {/* Delete account — on its own, at the very bottom */}
        <Group className="mt-3">
          <SettingsRow
            icon={ExclamationTriangleIcon}
            label={t('settings.delete_account', 'Delete my account')}
            onClick={() => setShowDeleteModal(true)}
            danger
          />
        </Group>
      </div>

      {/* Sign out modal */}
      <Modal isOpen={showSignOutModal} onClose={() => setShowSignOutModal(false)} title={t('settings.sign_out_q', 'Sign out?')}>
        <p className="text-gray-500 text-sm mb-5">{t('settings.sign_out_body', 'You will need to sign in again to access your account.')}</p>
        <div className="flex flex-col gap-2">
          <Button variant="primary" fullWidth onClick={handleSignOut}>{t('settings.sign_out', 'Sign out')}</Button>
          <Button variant="secondary" fullWidth onClick={() => setShowSignOutModal(false)}>{t('actions.cancel')}</Button>
        </div>
      </Modal>

      {/* Delete account modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={t('settings.delete_q', 'Delete your account?')}>
        <div className="flex flex-col gap-4">
          <p className="text-gray-500 text-sm">
            {t('settings.delete_body', 'This will permanently delete your profile and all your posts.')} <strong>{t('settings.cannot_undo', 'This action cannot be undone.')}</strong>
          </p>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">
              {t('settings.type', 'Type')} <span className="font-mono bg-red-50 text-red-600 px-1 rounded">DELETE</span> {t('settings.to_confirm', 'to confirm')}
            </label>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-lg border border-red-200 bg-white px-3 py-2.5 text-navy focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="danger" fullWidth
              loading={deleting}
              disabled={deleteInput !== 'DELETE'}
              onClick={handleDeleteAccount}>
              {t('settings.delete_account', 'Delete my account')}
            </Button>
            <Button variant="secondary" fullWidth onClick={() => { setShowDeleteModal(false); setDeleteInput('') }}>
              {t('actions.cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
