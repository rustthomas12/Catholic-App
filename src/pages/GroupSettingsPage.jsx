import { friendlyError } from '../utils/errors'
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/shared/TopBar'
import { TrashIcon, CameraIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup, invalidateGroupMemberships } from '../hooks/useGroups'
import { GroupPageSkeleton } from '../components/shared/skeletons'
import { toast } from '../components/shared/Toast'
import Modal from '../components/shared/Modal'
import { shrinkImage, PICK_MAX_BYTES } from '../utils/imageResize'

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
  // Group photo: undefined = unchanged, null = remove, File = replace
  const [photoFile, setPhotoFile] = useState(undefined)
  const [photoPreview, setPhotoPreview] = useState(null)

  useEffect(() => {
    if (group && !initialized) {
      setPhotoPreview(group.avatar_url ?? null)
      setName(group.name)
      setDescription(group.description ?? '')
      setIsPrivate(group.is_private)
      setInitialized(true)
    }
  }, [group, initialized])

  useEffect(() => { document.title = `${t('settings')} | inFold` }, [t])

  if (loading) return <GroupPageSkeleton />

  function handlePhotoPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error(t('photo_type', 'Please choose a JPEG, PNG, WebP, or GIF image'))
      return
    }
    if (file.size > (file.type === 'image/gif' ? 5 * 1024 * 1024 : PICK_MAX_BYTES)) {
      toast.error(t('photo_size', 'Image must be smaller than 5 MB'))
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  async function handleSave() {
    setSaving(true)
    const updates = {
      name: name.trim(),
      description: description.trim() || null,
      is_private: isPrivate,
    }

    if (photoFile === null) updates.avatar_url = null
    if (photoFile) {
      // Same place the create-group wizard uploads to (your own folder)
      const file = await shrinkImage(photoFile, { maxDim: 512 })
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.name.split('.').pop()
      const path = `group-avatars/${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('groups')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) {
        toast.error(t('photo_failed', 'Could not upload the photo. Please try again.'))
        setSaving(false)
        return
      }
      updates.avatar_url = supabase.storage.from('groups').getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase.from('groups').update(updates).eq('id', id)

    if (error) {
      toast.error(friendlyError(error, 'Could not save changes.'))
    } else {
      setPhotoFile(undefined)
      invalidateGroupMemberships() // home "My Groups" shows the new name/photo
      toast.success('Settings saved.')
    }
    setSaving(false)
  }

  async function handleDelete() {
    // RLS-blocked deletes return no error, just no rows — check what was deleted
    const { data, error } = await supabase.from('groups').delete().eq('id', id).select('id')
    if (error || !data?.length) {
      toast.error('Could not delete this group.')
      return
    }
    toast.success('Group deleted')
    navigate('/groups')
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60 pb-24">
      <TopBar variant="navy" title={t('settings')} back={true} />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* Group photo */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-lightbg border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
            {photoPreview
              ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              : <CameraIcon className="w-7 h-7 text-gray-400" />}
          </div>
          <div className="flex flex-col items-start gap-1">
            <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy bg-white border border-gray-200 rounded-xl px-3 min-h-[44px] cursor-pointer hover:border-navy focus-within:ring-2 focus-within:ring-gold">
              <CameraIcon className="w-4 h-4" />
              {photoPreview ? t('photo_change', 'Change photo') : t('photo_add', 'Add a photo')}
              <input type="file" accept="image/*" onChange={handlePhotoPick} className="sr-only" />
            </label>
            {photoPreview && (
              <button type="button" onClick={removePhoto} className="text-xs text-gray-500 hover:text-red-600 px-1 min-h-[32px]">
                {t('photo_remove', 'Remove photo')}
              </button>
            )}
            {photoFile !== undefined && (
              <p className="text-xs text-gray-500 px-1">{t('photo_unsaved', 'Tap Save to keep this change')}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-navy uppercase tracking-widest mb-1.5">
            {t('create_name')}
          </label>
          <input aria-label={t('create_name')}
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
          <textarea aria-label={t('create_description')}
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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Linked to</p>
            <p className="text-sm font-semibold text-navy">
              {group.parish?.name ?? 'Parish / Organization'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
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
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-40"
          >
            {t('delete_group')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
