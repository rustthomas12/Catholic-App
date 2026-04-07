import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, CameraIcon } from '@heroicons/react/24/outline'
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
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  document.title = `${t('create')} | Parish App`

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function canAdvance() {
    if (step === 1) return name.trim().length >= 3 && category !== ''
    return true
  }

  async function handleSubmit() {
    if (!user) return
    setSubmitting(true)

    try {
      let avatarUrl = null

      // Upload avatar if provided
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

      // Create the group — member_count starts at 0 and is incremented
      // by the trg_group_members_count trigger when the admin row is inserted below.
      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          category,
          is_private: isPrivate,
          avatar_url: avatarUrl,
          creator_id: user.id,
          parish_id: profile?.parish_id ?? null,
        })
        .select('id')
        .single()

      if (error) {
        toast.error('Could not create group. Please try again.')
        setSubmitting(false)
        return
      }

      // Add creator as admin
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
      })

      toast.success(t('created'))
      navigate(`/group/${group.id}`)
    } catch {
      toast.error('Something went wrong.')
      setSubmitting(false)
    }
  }

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

        {/* Step indicator */}
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
              You will be set as the admin of this group. You can invite members after creating it.
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
