import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  BuildingOffice2Icon,
  ArrowLeftIcon,
  UserGroupIcon,
  LinkIcon,
  PencilSquareIcon,
  TrashIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'

// ── access guard ───────────────────────────────────────────
async function checkOrgAccess(orgId, userId) {
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role === 'admin' ? data : null
}

// ── Tabs ───────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'invites', label: 'Invites' },
  { id: 'settings', label: 'Settings' },
]

export default function OrgAdminPage() {
  const { orgId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    if (!user || !orgId) return
    Promise.all([
      checkOrgAccess(orgId, user.id),
      supabase.from('organizations').select('*').eq('id', orgId).single(),
    ]).then(([access, orgRes]) => {
      if (!access) { setAccessDenied(true); setLoading(false); return }
      if (orgRes.error) { setLoading(false); return }
      setOrg(orgRes.data)
      document.title = `${orgRes.data.name} Admin | Communio`
      setLoading(false)
    })
  }, [orgId, user?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream md:pl-60">
        <div className="bg-navy h-32 animate-pulse" />
      </div>
    )
  }

  if (accessDenied || !org) {
    return (
      <div className="min-h-screen bg-cream md:pl-60 flex items-center justify-center p-8">
        <div className="text-center">
          <BuildingOffice2Icon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-navy mb-1">Access denied</p>
          <p className="text-gray-400 text-sm mb-4">You are not an admin of this organization.</p>
          <Link to="/organizations" className="text-navy text-sm font-semibold hover:underline">
            ← Organizations
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">

      {/* Header */}
      <div className="bg-navy relative">
        <button
          onClick={() => navigate(`/organization/${orgId}`)}
          className="absolute top-4 left-4 text-white/70 hover:text-white p-1 flex items-center gap-1 text-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Back to org</span>
        </button>

        <div className="px-4 pt-14 pb-5 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <BuildingOffice2Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Admin</p>
              <h1 className="text-white font-bold text-lg leading-tight">{org.name}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-navy text-navy' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-24 md:pb-8">
        {activeTab === 'overview'  && <OverviewTab org={org} orgId={orgId} />}
        {activeTab === 'members'   && <MembersTab orgId={orgId} />}
        {activeTab === 'invites'   && <InvitesTab orgId={orgId} userId={user.id} />}
        {activeTab === 'settings'  && <SettingsTab org={org} setOrg={setOrg} orgId={orgId} />}
      </div>
    </div>
  )
}

// ── OverviewTab ────────────────────────────────────────────
function OverviewTab({ org, orgId }) {
  const [memberCount, setMemberCount] = useState(null)

  useEffect(() => {
    supabase.from('organization_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .then(({ count }) => setMemberCount(count ?? 0))
  }, [orgId])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Members" value={memberCount ?? '—'} />
        <StatCard label="Status" value={org.is_official ? 'Official' : 'Community'} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        <h2 className="font-bold text-navy text-sm">Quick actions</h2>
        <Link to={`/organization/${orgId}`}
          className="flex items-center gap-2 text-sm text-navy py-2 hover:opacity-70">
          <BuildingOffice2Icon className="w-4 h-4" /> View public page
        </Link>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

// ── MembersTab ─────────────────────────────────────────────
function MembersTab({ orgId }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('organization_members')
      .select('user_id, role, joined_at, profiles(id, full_name, avatar_url)')
      .eq('org_id', orgId)
      .order('joined_at', { ascending: false })
      .then(({ data }) => {
        setMembers((data ?? []).map(m => ({ ...m.profiles, role: m.role, joined_at: m.joined_at })).filter(Boolean))
        setLoading(false)
      })
  }, [orgId])

  const updateRole = async (userId, role) => {
    const { error } = await supabase.from('organization_members')
      .update({ role }).eq('org_id', orgId).eq('user_id', userId)
    if (error) toast.error('Failed to update role.')
    else {
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m))
      toast.success('Role updated.')
    }
  }

  const removeMember = async (userId) => {
    const { error } = await supabase.from('organization_members')
      .delete().eq('org_id', orgId).eq('user_id', userId)
    if (error) toast.error('Failed to remove member.')
    else {
      setMembers(prev => prev.filter(m => m.id !== userId))
      toast.success('Member removed.')
    }
  }

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="bg-white h-16 rounded-2xl animate-pulse border border-gray-100" />)}</div>

  if (!members.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
      <UserGroupIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
      <p className="text-navy font-semibold text-sm">No members yet</p>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-xs font-bold text-navy flex-shrink-0">
            {(m.full_name || 'M').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-navy truncate">{m.full_name || 'Member'}</p>
            <p className="text-xs text-gray-400 capitalize">{m.role}</p>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={m.role}
              onChange={e => updateRole(m.id, e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-navy"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={() => removeMember(m.id)}
              className="p-1 text-gray-300 hover:text-red-400 transition-colors">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── InvitesTab ─────────────────────────────────────────────
function InvitesTab({ orgId, userId }) {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = () => {
    supabase.from('organization_invites')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setInvites(data ?? []); setLoading(false) })
  }

  useEffect(load, [orgId])

  const createInvite = async () => {
    setCreating(true)
    const code = Math.random().toString(36).slice(2, 10).toUpperCase()
    const { error } = await supabase.from('organization_invites')
      .insert({ org_id: orgId, invite_code: code, created_by: userId })
    if (error) toast.error('Failed to create invite.')
    else { toast.success('Invite created.'); load() }
    setCreating(false)
  }

  const deleteInvite = async (id) => {
    const { error } = await supabase.from('organization_invites').delete().eq('id', id)
    if (error) toast.error('Failed to delete invite.')
    else { setInvites(prev => prev.filter(i => i.id !== id)); toast.success('Invite deleted.') }
  }

  const copyLink = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`)
    toast.success('Link copied!')
  }

  return (
    <div className="space-y-4">
      <button
        onClick={createInvite}
        disabled={creating}
        className="w-full flex items-center justify-center gap-2 bg-navy text-white text-sm font-semibold py-3 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-60"
      >
        <LinkIcon className="w-4 h-4" />
        {creating ? 'Creating…' : 'Create invite link'}
      </button>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="bg-white h-16 rounded-2xl animate-pulse border border-gray-100" />)}</div>
      ) : invites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-gray-400 text-sm">No invite links yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-bold text-navy">{inv.invite_code}</p>
                <p className="text-xs text-gray-400">
                  {inv.use_count} use{inv.use_count !== 1 ? 's' : ''}
                  {inv.max_uses ? ` / ${inv.max_uses} max` : ''}
                </p>
              </div>
              <button onClick={() => copyLink(inv.invite_code)}
                className="p-1.5 text-gray-400 hover:text-navy transition-colors">
                <ClipboardDocumentIcon className="w-4 h-4" />
              </button>
              <button onClick={() => deleteInvite(inv.id)}
                className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SettingsTab ────────────────────────────────────────────
function SettingsTab({ org, setOrg, orgId }) {
  const navigate = useNavigate()
  const [name, setName] = useState(org.name)
  const [description, setDescription] = useState(org.description || '')
  const [category, setCategory] = useState(org.category || '')
  const [website, setWebsite] = useState(org.website || '')
  const [email, setEmail] = useState(org.email || '')
  const [city, setCity] = useState(org.city || '')
  const [state, setState] = useState(org.state || '')
  const [logoUrl, setLogoUrl] = useState(org.logo_url || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const updates = { name: name.trim(), description: description.trim() || null, category: category.trim() || null,
      website: website.trim() || null, email: email.trim() || null, city: city.trim() || null, state: state.trim() || null,
      logo_url: logoUrl.trim() || null }
    const { error } = await supabase.from('organizations').update(updates).eq('id', orgId)
    if (error) toast.error('Failed to save changes.')
    else { setOrg(prev => ({ ...prev, ...updates })); toast.success('Changes saved.') }
    setSaving(false)
  }

  const CATEGORIES = ['ministry', 'apostolate', 'charity', 'school', 'media', 'prayer group', 'other']

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-navy text-sm">Organization details</h2>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy">
            <option value="">Select category…</option>
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">City</label>
            <input value={city} onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">State</label>
            <input value={state} onChange={e => setState(e.target.value)} maxLength={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Website</label>
          <input value={website} onChange={e => setWebsite(e.target.value)} type="url"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Logo URL</label>
          <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} type="url"
            placeholder="https://example.org/logo.png"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
          {logoUrl.trim() && (
            <img
              src={logoUrl.trim()}
              alt="Logo preview"
              className="mt-2 w-16 h-16 rounded-xl object-contain border border-gray-200 bg-gray-50"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          )}
        </div>

        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="w-full bg-navy text-white text-sm font-bold py-2.5 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
