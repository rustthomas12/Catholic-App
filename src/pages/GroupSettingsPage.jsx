import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroups'
import { GroupPageSkeleton } from '../components/shared/skeletons'
import { toast } from '../components/shared/Toast'
import Modal from '../components/shared/Modal'

export default function GroupSettingsPage() {
  const { t } = useTranslation('groups')
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { group, loading } = useGroup(id)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (group && !initialized) {
      setName(group.name)
      setDescription(group.description ?? '')
      setIsPrivate(group.is_private)
      setInitialized(true)
    }
  }, [group, initialized])

  useEffect(() => { document.title = `${t('settings')} | Communio` }, [t])

  if (loading) return <GroupPageSkeleton />

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('groups')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        is_private: isPrivate,
      })
      .eq('id', id)

    if (error) {
      toast.error('Could not save changes.')
    } else {
      toast.success('Settings saved.')
    }
    setSaving(false)
  }

  async function handleDelete() {
    await supabase.from('groups').delete().eq('id', id)
    navigate('/groups')
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60 pb-24">
      <div className="bg-navy px-4 pt-5 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-white font-bold text-lg">{t('settings')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-navy uppercase tracking-widest mb-1.5">
            {t('create_name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={80}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-navy uppercase tracking-widest mb-1.5">
            {t('create_description')}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-navy uppercase tracking-widest mb-1.5">
            {t('create_privacy')}
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setIsPrivate(false)}
              className={`w-full text-left p-4 rounded-xl border transition-colors ${!isPrivate ? 'border-gold bg-gold/5' : 'border-gray-200 bg-white'}`}
            >
              <p className="text-sm font-semibold text-navy">Public</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('create_public')}</p>
            </button>
            <button
              onClick={() => setIsPrivate(true)}
              className={`w-full text-left p-4 rounded-xl border transition-colors ${isPrivate ? 'border-gold bg-gold/5' : 'border-gray-200 bg-white'}`}
            >
              <p className="text-sm font-semibold text-navy">Private</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('create_private')}</p>
            </button>
          </div>
        </div>

        {(group?.parish || group?.parish_id || group?.org_id) && (
          <div className="bg-lightbg rounded-xl px-4 py-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Linked to</p>
            <p className="text-sm font-semibold text-navy">
              {group.parish?.name ?? 'Parish / Organization'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Only followers of this {group.org_id ? 'organization' : 'parish'} can see and join this group.
            </p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full py-3.5 bg-gold text-navy font-bold rounded-xl text-sm disabled:opacity-50 hover:bg-gold/90 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            {t('delete_group')}
          </button>
        </div>
      </div>

      <Modal isOpen={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteConfirmText('') }} title={t('delete_group')} size="sm">
        <p className="text-sm text-gray-600 mb-3">{t('delete_confirm', { name: group?.name })}</p>
        <p className="text-xs text-gray-500 mb-2">Type <strong>{group?.name}</strong> to confirm:</p>
        <input
          type="text"
          value={deleteConfirmText}
          onChange={e => setDeleteConfirmText(e.target.value)}
          placeholder={group?.name}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <div className="flex gap-3">
          <button
            onClick={() => { setDeleteOpen(false); setDeleteConfirmText('') }}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteConfirmText !== group?.name}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-40"
          >
            {t('delete_group')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
