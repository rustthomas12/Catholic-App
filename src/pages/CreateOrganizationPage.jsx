import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
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

  document.title = 'New Organization | Communio'

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.category) {
      toast.error('Name and category are required.')
      return
    }
    if (!user) return
    setSaving(true)

    // Generate a slug from the name
    const slug = form.name.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') +
      '-' + Math.random().toString(36).slice(2, 7)

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: form.name.trim(),
        slug,
        category: form.category,
        description: form.description.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        website: form.website.trim() || null,
        email: form.email.trim() || null,
        created_by: user.id,
      })
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

          <button
            type="submit"
            disabled={saving || !form.name.trim() || !form.category}
            className="w-full bg-gold text-navy font-bold py-3 rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving && <LoadingSpinner size="sm" color="navy" />}
            {saving ? 'Creating…' : 'Create Organization'}
          </button>
        </form>
      </div>
    </div>
  )
}
