import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronRightIcon, UserIcon, BellIcon, CreditCardIcon,
  ShieldCheckIcon, InformationCircleIcon, ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { useNotifications } from '../hooks/useNotifications'
import { supabase } from '../lib/supabase'
import Modal from '../components/shared/Modal'
import Button from '../components/shared/Button'
import { toast } from '../components/shared/Toast'
import LanguageSwitcher from '../components/shared/LanguageSwitcher'
import pkgJson from '../../package.json'

function SettingsRow({ icon: Icon, label, value, to, onClick, danger = false }) {
  const cls = `flex items-center gap-3 w-full px-4 py-3.5 min-h-[52px] ${danger ? 'text-red-600' : 'text-navy'} hover:bg-lightbg transition-colors`
  const content = (
    <>
      {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${danger ? 'text-red-500' : 'text-gray-400'}`} />}
      <span className="flex-1 text-sm font-medium text-left">{label}</span>
      {value && <span className="text-sm text-gray-400">{value}</span>}
      {(to || onClick) && !danger && <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />}
    </>
  )
  if (to) return <Link to={to} className={cls}>{content}</Link>
  return <button type="button" onClick={onClick} className={cls}>{content}</button>
}

function SectionHeader({ title }) {
  return <p className="px-4 pt-5 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
}

export default function SettingsPage() {
  useEffect(() => { document.title = 'Settings | Communio' }, [])
  const { user, profile, signOut, updateProfile, donationTier, isSupportedByParish } = useAuth()
  const { unreadCount } = useNotifications()
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
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', profile.id)
    if (error) {
      toast.error('Something went wrong. Please try again.')
      setDeleting(false)
      return
    }
    await signOut()
    toast.info('Your account has been deleted.')
    navigate('/login', { replace: true })
  }

  const tierLabels = { supporter: 'Supporter', member: 'Member', patron: 'Patron', benefactor: 'Benefactor' }
  const planLabel = donationTier
    ? tierLabels[donationTier] ?? 'Donor'
    : isSupportedByParish
      ? 'Parish-sponsored'
      : 'Free'

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto pb-24">

        {/* Header */}
        <div className="px-4 py-5 border-b border-gray-100 bg-white">
          <h1 className="text-xl font-bold text-navy">Settings</h1>
        </div>

        {/* Language / Idioma — always bilingual label so Spanish speakers can find it */}
        <div className="bg-white mt-2 rounded-xl mx-3 overflow-hidden border border-gray-100 shadow-sm px-4 py-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Language / Idioma
          </p>
          <LanguageSwitcher variant="full" />
        </div>

        <div className="bg-white mt-2 rounded-xl mx-3 overflow-hidden border border-gray-100 shadow-sm">
          {/* Account */}
          <SectionHeader title="Account" />
          <SettingsRow icon={null} label="Email" value={user?.email} />
          <div className="border-t border-gray-50" />
          <SettingsRow icon={null} label="Change password" to="/forgot-password" />

          {/* Profile */}
          <div className="border-t border-gray-100" />
          <SectionHeader title="Profile" />
          <SettingsRow icon={UserIcon} label="Edit profile" to="/settings/profile" />

          {/* Notifications */}
          <div className="border-t border-gray-100" />
          <SectionHeader title="Notifications" />
          <SettingsRow
            icon={BellIcon}
            label="Notification preferences"
            to="/settings/notifications"
            value={unreadCount > 0 ? `${unreadCount} unread` : undefined}
          />

          {/* Support */}
          <div className="border-t border-gray-100" />
          <SectionHeader title="Support" />
          <SettingsRow icon={CreditCardIcon} label="Current status" value={planLabel} />
          <div className="border-t border-gray-50" />
          {donationTier ? (
            <SettingsRow icon={null} label="Manage giving →" to="/premium" />
          ) : (
            <SettingsRow icon={null} label="Support the Mission →" to="/premium" />
          )}

          {/* Privacy */}
          <div className="border-t border-gray-100" />
          <SectionHeader title="Privacy" />
          <div className="flex items-center justify-between px-4 py-3.5 min-h-[52px]">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-navy">Profile visibility</span>
            </div>
            <select
              value={profile?.profile_visibility || 'public'}
              onChange={async e => {
                const { error } = await updateProfile({ profile_visibility: e.target.value })
                if (error) toast.error(error)
                else toast.success('Visibility updated')
              }}
              className="text-sm text-gray-500 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gold">
              <option value="public">Public</option>
              <option value="members_only">Members only</option>
            </select>
          </div>

          {/* About */}
          <div className="border-t border-gray-100" />
          <SectionHeader title="About" />
          <SettingsRow icon={InformationCircleIcon} label="Version" value={`v${pkgJson.version}`} />
          <div className="border-t border-gray-50" />
          <SettingsRow icon={null} label="Terms of Service" to="/terms" />
          <div className="border-t border-gray-50" />
          <SettingsRow icon={null} label="Privacy Policy" to="/privacy" />
          <div className="border-t border-gray-50" />
          <SettingsRow icon={null} label="Content Policy" to="/policy" />

          {/* Danger zone */}
          <div className="border-t border-gray-100" />
          <SectionHeader title="Danger Zone" />
          <SettingsRow
            icon={ExclamationTriangleIcon}
            label="Delete my account"
            onClick={() => setShowDeleteModal(true)}
            danger
          />
        </div>

        {/* Sign out button */}
        <div className="mx-3 mt-4">
          <button
            onClick={() => setShowSignOutModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl py-3.5 text-navy text-sm font-medium hover:bg-lightbg transition-colors min-h-[52px] shadow-sm">
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-gray-400" />
            Sign out
          </button>
        </div>
      </div>

      {/* Sign out modal */}
      <Modal isOpen={showSignOutModal} onClose={() => setShowSignOutModal(false)} title="Sign out?">
        <p className="text-gray-500 text-sm mb-5">You will need to sign in again to access your account.</p>
        <div className="flex flex-col gap-2">
          <Button variant="primary" fullWidth onClick={handleSignOut}>Sign out</Button>
          <Button variant="secondary" fullWidth onClick={() => setShowSignOutModal(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Delete account modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete your account?">
        <div className="flex flex-col gap-4">
          <p className="text-gray-500 text-sm">
            This will permanently delete your profile and all your posts. <strong>This action cannot be undone.</strong>
          </p>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">
              Type <span className="font-mono bg-red-50 text-red-600 px-1 rounded">DELETE</span> to confirm
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
              Delete my account
            </Button>
            <Button variant="secondary" fullWidth onClick={() => { setShowDeleteModal(false); setDeleteInput('') }}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
