import { useState, useRef, useEffect } from 'react'
import { PhotoIcon, XMarkIcon, BuildingLibraryIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabase } from '../../lib/supabase'
import { uploadPostImage } from '../../utils/storage'
import Avatar from '../shared/Avatar'
import LoadingSpinner from '../shared/LoadingSpinner'
import { toast } from '../shared/Toast'

const MAX_CHARS = 500
const WARN_CHARS = 450

// ── Destination selector sheet ─────────────────────────────
function DestinationSheet({ isOpen, onClose, options, selected, onSelect }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-xl w-full md:max-w-sm shadow-xl">
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="p-4">
          <p className="text-sm font-semibold text-navy mb-3">Post to</p>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onSelect(opt); onClose() }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-lightbg min-h-[52px] transition-colors"
            >
              <div className="w-9 h-9 bg-navy rounded-lg flex items-center justify-center flex-shrink-0">
                {opt.type === 'parish'
                  ? <BuildingLibraryIcon className="w-5 h-5 text-white" />
                  : <UserGroupIcon className="w-5 h-5 text-white" />}
              </div>
              <span className="text-sm font-medium text-navy text-left flex-1">{opt.label}</span>
              {selected?.value === opt.value && (
                <span className="text-gold font-bold text-lg">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Compose modal ──────────────────────────────────────────
function ComposeModal({ isOpen, onClose, onPost, destinations, defaultDestination }) {
  const { t } = useTranslation('feed')
  const { user, profile } = useAuth()

  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)        // File
  const [imagePreview, setImagePreview] = useState(null) // Object URL
  const [isPrayerRequest, setIsPrayerRequest] = useState(false)
  const [destination, setDestination] = useState(defaultDestination ?? null)
  const [destSheetOpen, setDestSheetOpen] = useState(false)
  const [posting, setPosting] = useState(false)

  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent('')
      setImage(null)
      setImagePreview(null)
      setIsPrayerRequest(false)
      setDestination(defaultDestination ?? null)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen, defaultDestination])

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [content])

  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB.')
      return
    }
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function removeImage() {
    setImage(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handlePost() {
    const trimmed = content.trim()
    if (!trimmed) return
    setPosting(true)

    let imageUrl = null
    if (image) {
      toast.info(t('post.uploading'))
      const { url, error: uploadError } = await uploadPostImage(user.id, image)
      if (uploadError) {
        toast.error(uploadError)
        setPosting(false)
        return
      }
      imageUrl = url
    }

    const parishId = destination?.type === 'parish' ? destination.parishId : null
    const groupId = destination?.type === 'group' ? destination.groupId : null

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        parish_id: parishId,
        group_id: groupId,
        content: trimmed,
        image_url: imageUrl,
        is_prayer_request: isPrayerRequest,
      })
      .select(`
        *,
        author:profiles!author_id(
          id, full_name, avatar_url,
          is_verified_clergy, is_premium, is_patron
        ),
        parish:parishes!parish_id(id, name, city, state),
        group:groups!group_id(id, name),
        likes(user_id),
        comments(id)
      `)
      .single()

    setPosting(false)

    if (error) {
      toast.error(t('common:status.error', { ns: 'common' }))
      return
    }

    // Update last_active_at
    supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', user.id).then(() => {})

    toast.success(t('post.success'))
    onPost?.(data)
    onClose()
  }

  if (!isOpen) return null

  const charCount = content.length
  const overLimit = charCount > MAX_CHARS

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]">
          {/* Drag handle (mobile) */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              onClick={onClose}
              className="text-navy text-sm font-medium min-h-[44px] min-w-[44px] flex items-center"
            >
              Cancel
            </button>
            <span className="text-base font-semibold text-navy">New Post</span>
            <button
              onClick={handlePost}
              disabled={!content.trim() || posting || overLimit}
              className="bg-gold text-navy text-sm font-bold px-4 py-1.5 rounded-full min-h-[36px] disabled:opacity-40 flex items-center gap-1.5"
            >
              {posting && <LoadingSpinner size="sm" color="navy" />}
              {t('post.submit')}
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2">
            {/* Destination selector */}
            <div className="mb-3">
              <span className="text-xs text-gray-400 mr-2">{t('post.destination_label')}:</span>
              <button
                onClick={() => setDestSheetOpen(true)}
                className="text-xs font-semibold text-navy bg-lightbg px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
              >
                {destination?.label ?? t('post.destination_public')}
              </button>
            </div>

            {/* Author row */}
            <div className="flex items-center gap-2 mb-3">
              <Avatar
                src={profile?.avatar_url}
                name={profile?.full_name || 'Me'}
                size="md"
                isVerifiedClergy={profile?.is_verified_clergy}
              />
              <span className="text-sm font-semibold text-navy">{profile?.full_name || 'Parish Member'}</span>
            </div>

            {/* Text area */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('post.placeholder')}
              className="w-full resize-none text-base text-navy placeholder-gray-400 outline-none min-h-[120px] leading-relaxed"
              style={{ height: 'auto' }}
            />

            {/* Image preview */}
            {imagePreview && (
              <div className="relative mt-2">
                <img src={imagePreview} alt="" className="w-full rounded-lg object-cover max-h-64" />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                  aria-label={t('post.image_remove')}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
                <p className="text-xs text-gray-400 mt-1 truncate">{image?.name}</p>
              </div>
            )}

            {/* Prayer request toggle */}
            <div className={`flex items-center justify-between mt-3 pt-3 border-t ${isPrayerRequest ? 'border-gold' : 'border-gray-100'}`}>
              <span className="text-sm text-gray-600">🙏 {t('post.prayer_toggle')}</span>
              <button
                onClick={() => setIsPrayerRequest((p) => !p)}
                className={`relative w-11 h-6 rounded-full transition-colors ${isPrayerRequest ? 'bg-navy' : 'bg-gray-300'}`}
                role="switch"
                aria-checked={isPrayerRequest}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPrayerRequest ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Bottom toolbar */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-navy transition-colors"
              aria-label={t('post.image_add')}
            >
              <PhotoIcon className="w-6 h-6" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageSelect}
              className="hidden"
            />
            <span className={`text-xs font-medium ${overLimit ? 'text-red-500' : charCount >= WARN_CHARS ? 'text-amber-500' : 'text-gray-400'}`}>
              {charCount}/{MAX_CHARS}
            </span>
          </div>
        </div>
      </div>

      <DestinationSheet
        isOpen={destSheetOpen}
        onClose={() => setDestSheetOpen(false)}
        options={destinations}
        selected={destination}
        onSelect={setDestination}
      />
    </>
  )
}

// ── Compose trigger bar (shown at top of feed) ─────────────
export default function CreatePost({ onPost, groupId: contextGroupId = null, parishId: contextParishId = null }) {
  const { t } = useTranslation('feed')
  const { user, profile } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [destinations, setDestinations] = useState([])
  const [defaultDestination, setDefaultDestination] = useState(null)

  // Build destination options from user's parish + groups.
  // If a contextGroupId or contextParishId is provided (e.g. posting from a
  // group page or parish page), that context is pre-selected and pinned as default.
  useEffect(() => {
    if (!user) return
    async function loadDestinations() {
      const opts = []

      // Parish
      if (profile?.parish_id) {
        const { data: parish } = await supabase
          .from('parishes')
          .select('id, name')
          .eq('id', profile.parish_id)
          .single()
        if (parish) {
          opts.push({
            value: `parish-${parish.id}`,
            type: 'parish',
            label: `My Parish: ${parish.name}`,
            parishId: parish.id,
          })
        }
      }

      // Groups
      const { data: memberships } = await supabase
        .from('group_members')
        .select('groups(id, name)')
        .eq('user_id', user.id)
        .limit(10)

      if (memberships) {
        memberships.forEach(({ groups: g }) => {
          if (g) {
            opts.push({
              value: `group-${g.id}`,
              type: 'group',
              label: `${g.name} group`,
              groupId: g.id,
            })
          }
        })
      }

      if (opts.length === 0) {
        opts.push({ value: 'public', type: 'public', label: t('post.destination_public') })
      }

      setDestinations(opts)

      // Pin to context if provided, otherwise fall back to first option
      if (contextGroupId) {
        const match = opts.find(o => o.groupId === contextGroupId)
        setDefaultDestination(match ?? opts[0] ?? null)
      } else if (contextParishId) {
        const match = opts.find(o => o.parishId === contextParishId)
        setDefaultDestination(match ?? opts[0] ?? null)
      } else {
        setDefaultDestination(opts[0] ?? null)
      }
    }
    loadDestinations()
  }, [user, profile?.parish_id, contextGroupId, contextParishId, t])

  function handlePost(rawPost) {
    if (!rawPost) return

    // Normalise the new post for the feed
    const likes = rawPost.likes ?? []
    const comments = rawPost.comments ?? []
    const normalised = {
      id: rawPost.id,
      content: rawPost.content,
      image_url: rawPost.image_url ?? null,
      is_prayer_request: rawPost.is_prayer_request ?? false,
      is_anonymous: rawPost.is_anonymous ?? false,
      is_removed: rawPost.is_removed ?? false,
      created_at: rawPost.created_at,
      author: rawPost.author ?? null,
      parish: rawPost.parish ?? null,
      group: rawPost.group ?? null,
      like_count: likes.length,
      comment_count: comments.length,
      is_liked_by_me: false,
    }
    onPost?.(normalised)
  }

  return (
    <>
      {/* Trigger bar */}
      <div className="bg-white border-b border-gray-100 md:rounded-xl md:border md:shadow-sm md:mb-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || 'Me'}
            size="sm"
          />
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-400 text-left min-h-[40px] hover:bg-gray-200 transition-colors"
          >
            {t('post.placeholder')}
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gold hover:text-gold/80 transition-colors"
            aria-label={t('post.image_add')}
          >
            <PhotoIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      <ComposeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onPost={handlePost}
        destinations={destinations}
        defaultDestination={defaultDestination}
      />
    </>
  )
}
