import { useState } from 'react'
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
  const [initialized, setInitialized] = useState(false)

  // Initialize form once group loads
  if (group && !initialized) {
    setName(group.name)
    setDescription(group.description ?? '')
    setIsPrivate(group.is_private)
    setInitialized(true)
  }

  if (loading) return <GroupPageSkeleton />

  document.title = `${t('settings')} | Parish App`

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

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title={t('delete_group')} size="sm">
        <p className="text-sm text-gray-600 mb-5">{t('delete_confirm', { name: group?.name })}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteOpen(false)}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600"
          >
            {t('delete_group')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
