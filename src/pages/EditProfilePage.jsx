import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, BuildingLibraryIcon, XMarkIcon, CameraIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { uploadAvatar } from '../utils/storage'
import Avatar from '../components/shared/Avatar'
import Button from '../components/shared/Button'
import Modal from '../components/shared/Modal'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { toast } from '../components/shared/Toast'

const VOCATIONS = [
  { value: 'single', emoji: '🙏', label: 'Single' },
  { value: 'married', emoji: '💒', label: 'Married' },
  { value: 'religious', emoji: '✝️', label: 'Religious' },
  { value: 'ordained', emoji: '🕊️', label: 'Ordained' },
]

export default function EditProfilePage() {
  useEffect(() => { document.title = 'Edit Profile | Communio' }, [])
  const { profile, updateProfile, user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [vocation, setVocation] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [parish, setParish] = useState(null)
  const [parishQuery, setParishQuery] = useState('')
  const [parishResults, setParishResults] = useState([])
  const [parishSearching, setParishSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const parishDebounceRef = useRef(null)
  const dropdownRef = useRef(null)

  const [saving, setSaving] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Revoke preview object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  // Init from profile
  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name || '')
    setBio(profile.bio || '')
    setVocation(profile.vocation_state || '')
    setAvatarUrl(profile.avatar_url || null)

    if (profile.parish_id) {
      supabase.from('parishes').select('id, name, city, state, diocese')
        .eq('id', profile.parish_id).single()
        .then(({ data }) => { if (data) setParish(data) })
    }
  }, [profile])

  // Track changes
  useEffect(() => {
    if (!profile) return
    const changed =
      fullName !== (profile.full_name || '') ||
      bio !== (profile.bio || '') ||
      vocation !== (profile.vocation_state || '') ||
      avatarFile !== null ||
      (parish?.id || null) !== (profile.parish_id || null)
    setHasChanges(changed)
  }, [fullName, bio, vocation, avatarFile, parish, profile])

  // Parish search debounce
  useEffect(() => {
    if (!parishQuery || parishQuery.length < 2) {
      setParishResults([])
      setShowDropdown(false)
      return
    }
    clearTimeout(parishDebounceRef.current)
    parishDebounceRef.current = setTimeout(async () => {
      setParishSearching(true)
      const { data } = await supabase
        .from('parishes')
        .select('id, name, city, state, diocese')
        .or(`name.ilike.%${parishQuery}%,zip.eq.${parishQuery}`)
        .limit(8)
      setParishResults(data || [])
      setShowDropdown(true)
      setParishSearching(false)
    }, 400)
    return () => clearTimeout(parishDebounceRef.current)
  }, [parishQuery])

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, or WebP image')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2 MB')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!hasChanges) return
    if (!fullName.trim()) {
      toast.error('Name is required.')
      return
    }
    setSaving(true)
    try {
      let finalAvatarUrl = avatarUrl

      if (avatarFile) {
        const { url, error } = await uploadAvatar(user.id, avatarFile)
        if (error) { toast.error(error); setSaving(false); return }
        finalAvatarUrl = url
      }

      const { error } = await updateProfile({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        vocation_state: vocation || null,
        avatar_url: finalAvatarUrl,
        parish_id: parish?.id || null,
      })

      if (error) {
        toast.error(error)
      } else {
        toast.success('Profile saved')
        setAvatarPreview(null)
        navigate(`/profile/${user.id}`, { replace: true })
      }
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (hasChanges) {
      setShowDiscardModal(true)
    } else {
      navigate(-1)
    }
  }

  if (!profile) return <LoadingSpinner fullPage />

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto pb-24">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-20">
          <button onClick={handleBack} className="flex items-center gap-1 text-navy min-h-[44px] px-1">
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-base font-bold text-navy">Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`text-sm font-semibold min-h-[44px] px-2 transition-colors ${hasChanges ? 'text-navy' : 'text-gray-300'}`}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="px-4 py-6 flex flex-col gap-6">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar
                src={avatarPreview || avatarUrl}
                name={fullName}
                size="lg"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-navy rounded-full flex items-center justify-center border-2 border-white">
                <CameraIcon className="w-4 h-4 text-white" />
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              className="hidden" onChange={handleAvatarChange} />
            <button onClick={() => fileRef.current?.click()}
              className="text-sm text-navy font-medium hover:underline min-h-[44px]">
              Change photo
            </button>
            {(avatarUrl || avatarPreview) && (
              <button onClick={() => { setAvatarUrl(null); setAvatarPreview(null); setAvatarFile(null) }}
                className="text-sm text-red-500 hover:underline">
                Remove photo
              </button>
            )}
          </div>

          {/* Full name */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value.slice(0, 50))}
              maxLength={50}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-navy focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{fullName.length}/50</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 160))}
              rows={3}
              maxLength={160}
              placeholder="Tell your parish community about yourself..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-navy placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{bio.length}/160</p>
          </div>

          {/* Parish */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-semibold text-navy mb-1">Parish</label>
            {parish ? (
              <div className="flex items-center gap-3 bg-lightbg border border-gray-200 rounded-lg px-3 py-2.5">
                <BuildingLibraryIcon className="w-5 h-5 text-navy flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{parish.name}</p>
                  <p className="text-xs text-gray-500">{parish.city}, {parish.state}</p>
                </div>
                <button type="button" onClick={() => { setParish(null); setParishQuery('') }}
                  className="text-gray-400 hover:text-navy p-1">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <BuildingLibraryIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={parishQuery}
                    onChange={e => setParishQuery(e.target.value)}
                    onFocus={() => parishResults.length > 0 && setShowDropdown(true)}
                    placeholder="Search by name or zip code..."
                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2.5 text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold text-sm"
                  />
                  {parishSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>
                {showDropdown && parishResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    {parishResults.map(p => (
                      <button key={p.id} type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-lightbg border-b border-gray-50 last:border-0 text-sm"
                        onClick={() => { setParish(p); setParishQuery(''); setShowDropdown(false) }}>
                        <p className="font-semibold text-navy">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.city}, {p.state}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Vocation */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-2">Vocation</label>
            <div className="grid grid-cols-2 gap-2">
              {VOCATIONS.map(v => (
                <button key={v.value} type="button"
                  onClick={() => setVocation(vocation === v.value ? '' : v.value)}
                  className={`flex items-center gap-2 py-3 px-3 rounded-xl border-2 text-sm font-medium transition-all min-h-[52px] ${
                    vocation === v.value ? 'border-navy bg-navy text-white' : 'border-gray-200 bg-white text-navy hover:border-navy'
                  }`}>
                  <span className="text-lg leading-none">{v.emoji}</span>
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Save button (bottom) */}
          <Button onClick={handleSave} loading={saving} disabled={!hasChanges} fullWidth className="min-h-[52px] mt-2">
            Save changes
          </Button>
        </div>
      </div>

      {/* Discard changes modal */}
      <Modal isOpen={showDiscardModal} onClose={() => setShowDiscardModal(false)} title="Discard changes?">
        <p className="text-gray-500 text-sm mb-5">Your changes have not been saved.</p>
        <div className="flex flex-col gap-2">
          <Button variant="danger" fullWidth onClick={() => navigate(-1)}>Discard</Button>
          <Button variant="secondary" fullWidth onClick={() => setShowDiscardModal(false)}>Keep editing</Button>
        </div>
      </Modal>
    </div>
  )
}
