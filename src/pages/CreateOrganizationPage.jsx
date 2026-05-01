import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, XMarkIcon, MagnifyingGlassIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const CATEGORIES = [
  'Apostolate', 'Charity', 'Education', 'Media', 'Men\'s Ministry',
  'Women\'s Ministry', 'Youth', 'Family', 'Pro-Life', 'Prayer',
  'Missions', 'Religious Order', 'Other',
]

export default function CreateOrganizationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    city: '',
    state: '',
    website: '',
    email: '',
  })

  // Chapter request state
  const [isChapter, setIsChapter] = useState(false)
  const [parentSearch, setParentSearch] = useState('')
  const [parentResults, setParentResults] = useState([])
  const [parentSearching, setParentSearching] = useState(false)
  const [selectedParent, setSelectedParent] = useState(null)
  const [chapterMessage, setChapterMessage] = useState('')
  const searchTimeoutRef = useRef(null)

  useEffect(() => { document.title = 'New Organization | Communio' }, [])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Search national orgs
  useEffect(() => {
    if (!isChapter || parentSearch.trim().length < 2) {
      setParentResults([])
      return
    }
    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      setParentSearching(true)
      const { data } = await supabase
        .from('organizations')
        .select('id, name, city, state')
        .eq('org_type', 'national')
        .ilike('name', `%${parentSearch.trim()}%`)
        .limit(8)
      setParentResults(data || [])
      setParentSearching(false)
    }, 300)
    return () => clearTimeout(searchTimeoutRef.current)
  }, [parentSearch, isChapter])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.category) {
      toast.error('Name and category are required.')
      return
    }
    if (!user) return
    setSaving(true)

    // Generate a slug from the name with a cryptographically random suffix
    const suffix = Array.from(crypto.getRandomValues(new Uint8Array(3)))
      .map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 5)
    const slug = form.name.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') +
      '-' + suffix

    const orgPayload = {
      name: form.name.trim(),
      slug,
      category: form.category,
      description: form.description.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      website: form.website.trim() || null,
      email: form.email.trim() || null,
      created_by: user.id,
    }

    // If chapter with a selected parent, set org_type and parent_org_id
    if (isChapter && selectedParent) {
      orgPayload.org_type = 'chapter'
      orgPayload.parent_org_id = selectedParent.id
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert(orgPayload)
      .select('id')
      .single()

    if (orgError) {
      toast.error('Could not create organization.')
      setSaving(false)
      return
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({ org_id: org.id, user_id: user.id, role: 'admin' })

    if (memberError) {
      toast.error('Organization created but could not add you as admin.')
    }

    // If chapter request: check if parent has an active national subscription
    if (isChapter && selectedParent) {
      const { data: parentSub } = await supabase
        .from('org_subscriptions')
        .select('status, billing_track')
        .eq('org_id', selectedParent.id)
        .single()

      const parentIsNational = parentSub?.billing_track === 'national' &&
        ['active', 'trialing'].includes(parentSub?.status)

      if (parentIsNational) {
        // Submit a chapter request — national org admin must approve
        await supabase.from('chapter_requests').insert({
          requesting_org_id: org.id,
          target_national_org_id: selectedParent.id,
          requested_by: user.id,
          message: chapterMessage.trim() || null,
          status: 'pending',
        })

        // Notify national org admins
        const { data: nationalAdmins } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('org_id', selectedParent.id)
          .eq('role', 'admin')

        if (nationalAdmins?.length) {
          await supabase.from('notifications').insert(
            nationalAdmins.map(a => ({
              user_id: a.user_id,
              type: 'chapter_request',
              title: 'New chapter request',
              body: `${form.name.trim()} is requesting to become a chapter of ${selectedParent.name}.`,
              data: { org_id: selectedParent.id, requesting_org_id: org.id },
              is_read: false,
            }))
          ).catch(() => {})
        }

        toast.success('Organization created! Your chapter request has been sent.')
      } else {
        // Parent is not on national plan — just link directly (no approval needed)
        toast.success('Organization created and linked to parent org!')
      }
    } else {
      toast.success('Organization created!')
    }

    navigate(`/org-admin/${org.id}`, { replace: true })
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/organizations')}
            className="p-2 rounded-xl text-navy hover:bg-navy/5 transition-colors"
            aria-label="Back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-navy">New Organization</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                Organization Name <span className="text-red-400">*</span>
              </label>
              <input
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="e.g. Knights of Columbus Council 1234"
                maxLength={120}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={form.category}
                onChange={e => handleChange('category', e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy bg-white"
              >
                <option value="">Select a category…</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
              <textarea
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="What does your organization do?"
                rows={3}
                maxLength={500}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy"
              />
            </div>

            {/* City + State */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">City</label>
                <input
                  value={form.city}
                  onChange={e => handleChange('city', e.target.value)}
                  placeholder="Worcester"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">State</label>
                <input
                  value={form.state}
                  onChange={e => handleChange('state', e.target.value)}
                  placeholder="MA"
                  maxLength={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Website</label>
              <input
                value={form.website}
                onChange={e => handleChange('website', e.target.value)}
                placeholder="https://example.org"
                type="url"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Contact Email</label>
              <input
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="info@example.org"
                type="email"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
          </div>

          {/* Chapter section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <button
              type="button"
              onClick={() => { setIsChapter(v => !v); setSelectedParent(null); setParentSearch('') }}
              className="flex items-center gap-3 w-full text-left"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isChapter ? 'bg-navy border-navy' : 'border-gray-300'}`}>
                {isChapter && <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">This is a chapter of a national organization</p>
                <p className="text-xs text-gray-400">Link your local chapter to a national org presence</p>
              </div>
            </button>

            {isChapter && (
              <div className="mt-4 space-y-3">
                {selectedParent ? (
                  <div className="flex items-center gap-2 bg-navy/5 rounded-xl px-3 py-2">
                    <BuildingOffice2Icon className="w-4 h-4 text-navy flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">{selectedParent.name}</p>
                      {(selectedParent.city || selectedParent.state) && (
                        <p className="text-xs text-gray-400">{[selectedParent.city, selectedParent.state].filter(Boolean).join(', ')}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedParent(null); setParentSearch('') }}
                      className="p-1 rounded-lg hover:bg-navy/10 text-gray-400 hover:text-navy transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2 gap-2 focus-within:border-navy">
                      <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <input
                        value={parentSearch}
                        onChange={e => setParentSearch(e.target.value)}
                        placeholder="Search national organizations…"
                        className="flex-1 text-sm focus:outline-none bg-transparent"
                      />
                      {parentSearching && <LoadingSpinner size="sm" color="gray" />}
                    </div>
                    {parentResults.length > 0 && (
                      <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                        {parentResults.map(org => (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => { setSelectedParent(org); setParentSearch(''); setParentResults([]) }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-navy/5 text-left transition-colors"
                          >
                            <BuildingOffice2Icon className="w-4 h-4 text-navy flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-navy truncate">{org.name}</p>
                              {(org.city || org.state) && (
                                <p className="text-xs text-gray-400">{[org.city, org.state].filter(Boolean).join(', ')}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {parentSearch.length >= 2 && !parentSearching && parentResults.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1 px-1">No national organizations found.</p>
                    )}
                  </div>
                )}

                {selectedParent && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Message to national org (optional)</label>
                    <textarea
                      value={chapterMessage}
                      onChange={e => setChapterMessage(e.target.value)}
                      placeholder="Tell them about your chapter…"
                      rows={2}
                      maxLength={300}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy"
                    />
                    <p className="text-xs text-gray-400 mt-1">A request will be sent to the national org's admins for approval.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || !form.name.trim() || !form.category}
            className="w-full bg-gold text-navy font-bold py-3 rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving && <LoadingSpinner size="sm" color="navy" />}
            {saving ? 'Creating…' : 'Create Organization'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            Organization dashboards include a free 90-day trial. No credit card required to get started.
          </p>
        </form>
      </div>
    </div>
  )
}
