import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, CameraIcon, BuildingLibraryIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import { toast } from '../components/shared/Toast'

const CATEGORIES = [
  { value: 'parish',       label: 'category_parish' },
  { value: 'young_adults', label: 'category_young_adults' },
  { value: 'mens',         label: 'category_mens' },
  { value: 'womens',       label: 'category_womens' },
  { value: 'families',     label: 'category_families' },
  { value: 'rcia',         label: 'category_rcia' },
  { value: 'diocese',      label: 'category_diocese' },
  { value: 'interest',     label: 'category_interest' },
  { value: 'vocation',     label: 'category_vocation' },
  { value: 'other',        label: 'category_other' },
]

const STEPS = [
  { id: 1, label: 'create_step1' },
  { id: 2, label: 'create_step2' },
  { id: 3, label: 'create_step3' },
]

export default function CreateGroupPage() {
  const { t } = useTranslation('groups')
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  // Entity association (required)
  const [entities, setEntities] = useState([])       // { type, id, name, subtitle }
  const [selectedEntity, setSelectedEntity] = useState(null) // { type, id }
  const [entitiesLoading, setEntitiesLoading] = useState(true)

  // Avatar
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  useEffect(() => { document.title = `${t('create')} | Communio` }, [t])

  // Revoke preview object URL on unmount
  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }
  }, [avatarPreview])

  // Load parishes + orgs the user is connected to
  useEffect(() => {
    if (!user) return

    async function loadEntities() {
      const [parishRes, orgRes] = await Promise.all([
        supabase.from('parish_follows')
          .select('parish_id, parishes(id, name, city, state)')
          .eq('user_id', user.id),
        supabase.from('organization_members')
          .select('org_id, organizations(id, name, org_type)')
          .eq('user_id', user.id),
      ])

      const seen = new Set()
      const list = []

      // Home parish first (from profile)
      if (profile?.parish_id) {
        const { data: homePar } = await supabase
          .from('parishes')
          .select('id, name, city, state')
          .eq('id', profile.parish_id)
          .single()
        if (homePar && !seen.has(homePar.id)) {
          seen.add(homePar.id)
          list.push({
            type: 'parish', id: homePar.id, name: homePar.name,
            subtitle: [homePar.city, homePar.state].filter(Boolean).join(', '),
          })
        }
      }

      // Followed parishes
      for (const r of parishRes.data ?? []) {
        const p = r.parishes
        if (p && !seen.has(p.id)) {
          seen.add(p.id)
          list.push({
            type: 'parish', id: p.id, name: p.name,
            subtitle: [p.city, p.state].filter(Boolean).join(', '),
          })
        }
      }

      // Member orgs
      for (const r of orgRes.data ?? []) {
        const o = r.organizations
        if (o && !seen.has(o.id)) {
          seen.add(o.id)
          list.push({
            type: 'org', id: o.id, name: o.name,
            subtitle: o.org_type ?? 'Organization',
          })
        }
      }

      setEntities(list)
      // Auto-select if only one option
      if (list.length === 1) setSelectedEntity({ type: list[0].type, id: list[0].id })
      setEntitiesLoading(false)
    }

    loadEntities().catch(() => setEntitiesLoading(false))
  }, [user?.id, profile?.parish_id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, WebP, or GIF image')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function canAdvance() {
    if (step === 1) return name.trim().length >= 3 && category !== '' && selectedEntity !== null
    return true
  }

  async function handleSubmit() {
    if (!user || !selectedEntity) return
    setSubmitting(true)

    try {
      let avatarUrl = null

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `group-avatars/${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('groups')
          .upload(path, avatarFile, { upsert: true })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('groups').getPublicUrl(path)
          avatarUrl = publicUrl
        }
      }

      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          category,
          is_private: isPrivate,
          avatar_url: avatarUrl,
          creator_id: user.id,
          parish_id: selectedEntity.type === 'parish' ? selectedEntity.id : null,
          org_id:    selectedEntity.type === 'org'    ? selectedEntity.id : null,
        })
        .select('id')
        .single()

      if (error) {
        toast.error('Could not create group. Please try again.')
        setSubmitting(false)
        return
      }

      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
      })

      toast.success(t('created'))
      setAvatarPreview(null)
      navigate(`/group/${group.id}`)
    } catch {
      toast.error('Something went wrong.')
      setSubmitting(false)
    }
  }

  const selectedEntityInfo = selectedEntity
    ? entities.find(e => e.id === selectedEntity.id)
    : null

  return (
    <div className="min-h-screen bg-cream md:pl-60 pb-24">

      {/* Header */}
      <div className="bg-navy px-4 pt-5 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => (step > 1 ? setStep(s => s - 1) : navigate(-1))} className="text-white/70 hover:text-white">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-white font-bold text-lg">{t('create')}</h1>
        </div>

        <div className="flex gap-2">
          {STEPS.map(s => (
            <div
              key={s.id}
              className={`flex-1 h-1.5 rounded-full transition-colors ${s.id <= step ? 'bg-gold' : 'bg-white/20'}`}
            />
          ))}
        </div>
        <p className="text-gray-300 text-xs mt-2">
          {t(STEPS[step - 1].label)} · Step {step} of {STEPS.length}
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* ── Step 1: Basics ── */}
        {step === 1 && (
          <>
            {/* Association — required */}
            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-widest mb-1.5">
                Linked to *
              </label>
              {entitiesLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-14 bg-white rounded-xl border border-gray-200 animate-pulse" />)}
                </div>
              ) : entities.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  You need to follow a parish or join an organization before creating a group.
                </div>
              ) : (
                <div className="space-y-2">
                  {entities.map(entity => {
                    const isSelected = selectedEntity?.id === entity.id
                    const Icon = entity.type === 'parish' ? BuildingLibraryIcon : BuildingOffice2Icon
                    return (
                      <button
                        key={entity.id}
                        onClick={() => setSelectedEntity({ type: entity.type, id: entity.id })}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${
                          isSelected ? 'border-gold bg-gold/5' : 'border-gray-200 bg-white hover:border-navy'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-gold/20' : 'bg-gray-100'}`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-navy' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-navy' : 'text-gray-700'}`}>{entity.name}</p>
                          {entity.subtitle && <p className="text-xs text-gray-400 capitalize">{entity.subtitle}</p>}
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-gold' : 'border-gray-300'}`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-gold" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-widest mb-1.5">
                {t('create_name')} *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. St. Michael's Men's Rosary"
                maxLength={80}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{name.length}/80</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-widest mb-1.5">
                {t('create_description')}
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this group about?"
                maxLength={500}
                rows={4}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/500</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-widest mb-1.5">
                {t('create_category')} *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition-colors ${
                      category === cat.value
                        ? 'bg-gold border-gold text-navy'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-navy'
                    }`}
                  >
                    {t(cat.label)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-widest mb-1.5">
                {t('create_privacy')}
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setIsPrivate(false)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    !isPrivate ? 'border-gold bg-gold/5' : 'border-gray-200 bg-white hover:border-navy'
                  }`}
                >
                  <p className={`text-sm font-semibold ${!isPrivate ? 'text-navy' : 'text-gray-700'}`}>Public</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('create_public')}</p>
                </button>
                <button
                  onClick={() => setIsPrivate(true)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    isPrivate ? 'border-gold bg-gold/5' : 'border-gray-200 bg-white hover:border-navy'
                  }`}
                >
                  <p className={`text-sm font-semibold ${isPrivate ? 'text-navy' : 'text-gray-700'}`}>Private</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('create_private')}</p>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Appearance ── */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-6 py-4">
            <p className="text-gray-500 text-sm text-center">
              Add a photo for your group (optional). If you skip this, a default icon will be used.
            </p>

            <label className="cursor-pointer group">
              <div className="w-32 h-32 rounded-2xl bg-white border-2 border-dashed border-gray-300 group-hover:border-navy flex flex-col items-center justify-center overflow-hidden transition-colors">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <CameraIcon className="w-10 h-10 text-gray-300 mb-1" />
                    <span className="text-xs text-gray-400">Upload photo</span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>

            {avatarPreview && (
              <button
                onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                className="text-sm text-red-500 font-semibold hover:underline"
              >
                Remove photo
              </button>
            )}
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-navy flex items-center justify-center flex-shrink-0">
                    <span className="text-gold font-bold text-2xl">{name[0]?.toUpperCase() ?? 'G'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-navy text-base">{name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t(`category_${category}`)} · {isPrivate ? t('private') : t('public')}
                  </p>
                  {selectedEntityInfo && (
                    <p className="text-xs text-gold font-semibold mt-1">
                      {selectedEntityInfo.type === 'parish' ? '⛪' : '🏛'} {selectedEntityInfo.name}
                    </p>
                  )}
                  {description && (
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">{description}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <button onClick={() => setStep(1)} className="text-xs text-navy font-semibold hover:underline">
                Edit details
              </button>
              <button onClick={() => setStep(2)} className="text-xs text-navy font-semibold hover:underline">
                Edit photo
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center px-4">
              Only followers of {selectedEntityInfo?.name ?? 'the linked parish or organization'} will be able to see and join this group.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step < STEPS.length ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="flex-1 py-3.5 bg-gold text-navy font-bold rounded-xl text-sm disabled:opacity-40 hover:bg-gold/90 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3.5 bg-gold text-navy font-bold rounded-xl text-sm disabled:opacity-60 hover:bg-gold/90 transition-colors"
            >
              {submitting ? 'Creating…' : t('create_submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
