import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BuildingOffice2Icon,
  ArrowLeftIcon,
  UserGroupIcon,
  LinkIcon,
  PencilSquareIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { format, parseISO } from 'date-fns'
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
  { id: 'members',  label: 'Members' },
  { id: 'invites',  label: 'Invites' },
  { id: 'settings', label: 'Settings' },
  { id: 'billing',  label: 'Billing', icon: CreditCardIcon },
]

// ── Subscription gate prompt ───────────────────────────────
function SubscriptionPrompt({ onBilling }) {
  return (
    <div className="text-center py-16 px-6">
      <BuildingOffice2Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-navy mb-2">
        Activate your organization dashboard
      </h3>
      <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
        Start your free 90-day trial to access member management,
        invite links, and more.
      </p>
      <button
        onClick={onBilling}
        className="bg-navy text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-navy/90 transition-colors"
      >
        Start Free Trial →
      </button>
    </div>
  )
}

export default function OrgAdminPage() {
  const { orgId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    return TABS.find(t => t.id === tab) ? tab : 'overview'
  })
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [subLoading, setSubLoading] = useState(true)

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

  useEffect(() => {
    if (!orgId) return
    supabase
      .from('org_subscriptions')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle()
      .then(({ data }) => {
        setSubscription(data)
        setSubLoading(false)
      })
  }, [orgId])

  const hasActiveSubscription = ['trialing', 'active'].includes(subscription?.status)

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

  const goToBilling = () => setActiveTab('billing')

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
            {hasActiveSubscription && (
              <span className="ml-auto text-[10px] font-bold bg-gold/20 text-gold px-2 py-1 rounded-full">
                {subscription.status === 'trialing' ? 'Trial' : 'Active'}
              </span>
            )}
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
              className={`flex-shrink-0 px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
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
        {activeTab === 'overview' && (
          !subLoading && !hasActiveSubscription
            ? <SubscriptionPrompt onBilling={goToBilling} />
            : <OverviewTab org={org} orgId={orgId} />
        )}
        {activeTab === 'members' && (
          !subLoading && !hasActiveSubscription
            ? <SubscriptionPrompt onBilling={goToBilling} />
            : <MembersTab orgId={orgId} />
        )}
        {activeTab === 'invites' && (
          !subLoading && !hasActiveSubscription
            ? <SubscriptionPrompt onBilling={goToBilling} />
            : <InvitesTab orgId={orgId} userId={user.id} hasActiveSubscription={hasActiveSubscription} />
        )}
        {activeTab === 'settings' && (
          !subLoading && !hasActiveSubscription
            ? <SubscriptionPrompt onBilling={goToBilling} />
            : <SettingsTab org={org} setOrg={setOrg} orgId={orgId} />
        )}
        {activeTab === 'billing' && (
          <BillingTab
            org={org}
            orgId={orgId}
            user={user}
            subscription={subscription}
            setSubscription={setSubscription}
          />
        )}
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
function InvitesTab({ orgId, userId, hasActiveSubscription }) {
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
    if (!hasActiveSubscription) return
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
      {/* Gate new invite creation — existing invites still visible */}
      {hasActiveSubscription ? (
        <button
          onClick={createInvite}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 bg-navy text-white text-sm font-semibold py-3 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-60"
        >
          <LinkIcon className="w-4 h-4" />
          {creating ? 'Creating…' : 'Create invite link'}
        </button>
      ) : (
        <div className="bg-navy/5 rounded-2xl p-4 text-center">
          <p className="text-gray-500 text-sm">
            Invite link generation requires an active subscription.
          </p>
        </div>
      )}

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

// ── BillingTab ─────────────────────────────────────────────
const TIERS = [
  { key: 'small', label: 'Small',  price: '$99',  period: '/mo', desc: 'Under 100 members' },
  { key: 'mid',   label: 'Mid',    price: '$149', period: '/mo', desc: '100–500 members' },
  { key: 'large', label: 'Large',  price: '$249', period: '/mo', desc: '500+ members' },
]

const TIER_LABELS = { small: 'Small — $99/month', mid: 'Mid — $149/month', large: 'Large — $249/month' }

const STATUS_BADGE = {
  trialing: 'bg-blue-100 text-blue-700',
  active:   'bg-green-100 text-green-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-red-100 text-red-700',
  unpaid:   'bg-red-100 text-red-700',
}

function humanizeEvent(eventType) {
  const map = {
    'checkout.session.completed:org_base':       'Subscription started',
    'customer.subscription.updated:org_base':    'Subscription updated',
    'customer.subscription.deleted:org_base':    'Subscription canceled',
    'invoice.payment_failed:org_base':           'Payment failed',
  }
  return map[eventType] ?? eventType
}

function BillingTab({ org, orgId, user, subscription, setSubscription }) {
  const [selectedTier, setSelectedTier] = useState('small')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [billingEvents, setBillingEvents] = useState([])
  const [inviteSummary, setInviteSummary] = useState(null)

  const hasSubscription = !!subscription
  const isActive = ['trialing', 'active'].includes(subscription?.status)

  useEffect(() => {
    if (!subscription?.stripe_customer_id) return

    // Load billing history
    supabase
      .from('billing_events')
      .select('id, event_type, status, created_at')
      .eq('stripe_customer_id', subscription.stripe_customer_id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setBillingEvents(data ?? []))

    // Load invite summary
    supabase
      .from('organization_invites')
      .select('id, use_count')
      .eq('org_id', orgId)
      .then(({ data }) => {
        const rows = data ?? []
        setInviteSummary({
          count: rows.length,
          totalUses: rows.reduce((sum, r) => sum + (r.use_count || 0), 0),
        })
      })
  }, [subscription?.stripe_customer_id, orgId])

  async function handleStartTrial() {
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/create-org-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          orgName: org.name,
          tier: selectedTier,
          adminUserId: user.id,
          adminEmail: user.email,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error('Something went wrong. Please try again.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  async function handleManage() {
    if (!subscription?.stripe_customer_id) return
    setPortalLoading(true)
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeCustomerId: subscription.stripe_customer_id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error('Something went wrong. Please try again.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* ── No subscription: tier selection ── */}
      {!hasSubscription && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-center mb-5">
            <p className="font-bold text-navy text-base mb-1">Start your free 90-day trial</p>
            <p className="text-gray-500 text-sm">No credit card required until day 90.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {TIERS.map((tier) => (
              <button
                key={tier.key}
                onClick={() => setSelectedTier(tier.key)}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  selectedTier === tier.key
                    ? 'border-navy bg-navy/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-bold text-navy text-sm">{tier.label}</p>
                <p className="text-lg font-bold text-navy">{tier.price}<span className="text-xs text-gray-400 font-normal">{tier.period}</span></p>
                <p className="text-xs text-gray-500 mt-0.5">{tier.desc}</p>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center mb-4">
            All plans include: member management, invite links, org feed, events, and admin dashboard.
          </p>

          <button
            onClick={handleStartTrial}
            disabled={checkoutLoading}
            className="w-full bg-gold text-navy font-bold py-3 rounded-xl text-sm hover:bg-gold/90 disabled:opacity-60 transition-colors"
          >
            {checkoutLoading ? 'Redirecting…' : 'Start Free Trial →'}
          </button>
        </div>
      )}

      {/* ── Active subscription: status card ── */}
      {hasSubscription && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-bold text-navy text-sm mb-0.5">Subscription</p>
              <p className="text-xs text-gray-500">{TIER_LABELS[subscription.tier] ?? subscription.tier}</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[subscription.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {subscription.status === 'trialing' ? 'Trial' : subscription.status}
            </span>
          </div>

          {subscription.status === 'trialing' && subscription.trial_ends_at && (
            <p className="text-xs text-gray-500 mb-3">
              Trial ends {format(parseISO(subscription.trial_ends_at), 'MMMM d, yyyy')}
            </p>
          )}
          {subscription.status === 'active' && subscription.current_period_end && (
            <p className="text-xs text-gray-500 mb-3">
              Next billing date: {format(parseISO(subscription.current_period_end), 'MMMM d, yyyy')}
            </p>
          )}
          {subscription.status === 'past_due' && (
            <p className="text-xs text-amber-600 font-medium mb-3">
              Payment failed — please update your payment method below.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={handleManage}
              disabled={portalLoading}
              className="w-full border border-gray-200 text-navy text-sm font-semibold py-2.5 rounded-xl hover:border-navy transition-colors disabled:opacity-60"
            >
              {portalLoading ? 'Opening…' : 'Manage subscription →'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              To change your plan, click "Manage subscription" and select a different plan in the Stripe portal.
            </p>
          </div>
        </div>
      )}

      {/* ── Invite summary (active only) ── */}
      {isActive && inviteSummary !== null && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="font-semibold text-navy text-sm mb-3">Invite Links</p>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-bold text-navy">{inviteSummary.count}</p>
              <p className="text-xs text-gray-400">Active codes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-navy">{inviteSummary.totalUses}</p>
              <p className="text-xs text-gray-400">Total joins</p>
            </div>
          </div>
          <button
            onClick={() => {/* parent will need to navigate to invites tab */}}
            className="mt-3 text-xs font-bold text-navy hover:underline"
          >
            Go to Invites tab →
          </button>
        </div>
      )}

      {/* ── Billing history ── */}
      {billingEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="font-semibold text-navy text-sm mb-3">Billing History</p>
          <div className="space-y-2">
            {billingEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-navy">{humanizeEvent(ev.event_type)}</p>
                  <p className="text-xs text-gray-400">{format(parseISO(ev.created_at), 'MMM d, yyyy')}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[ev.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
