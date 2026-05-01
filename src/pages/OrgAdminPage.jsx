import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BuildingOffice2Icon,
  ArrowLeftIcon,
  UserGroupIcon,
  LinkIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { format, parseISO, addDays } from 'date-fns'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'

// ── Tier helpers ───────────────────────────────────────────
const STANDALONE_TIERS = [
  { key: 'starter',     label: 'Starter',     price: 50,  desc: 'Under 50 members' },
  { key: 'growth',      label: 'Growth',       price: 100, desc: '50–100 members' },
  { key: 'established', label: 'Established',  price: 300, desc: '100–300 members', suggested: false },
  { key: 'large',       label: 'Large',        price: 500, desc: '300+ members' },
]

const NATIONAL_TIERS = [
  { key: 'national_starter',     label: 'National Starter',      price: 299, desc: 'Up to 5 chapters' },
  { key: 'national_growth',      label: 'National Growth',        price: 599, desc: '6–20 chapters' },
  { key: 'national_established', label: 'National Established',   price: 999, desc: '21–50 chapters' },
  { key: 'national_network',     label: 'National Network',       price: null, desc: '51+ chapters — custom contract' },
]

function getSuggestedStandaloneTier(memberCount) {
  if (memberCount < 50)  return 'starter'
  if (memberCount < 100) return 'growth'
  if (memberCount < 300) return 'established'
  return 'large'
}

function getSuggestedNationalTier(chapterCount) {
  if (chapterCount <= 5)  return 'national_starter'
  if (chapterCount <= 20) return 'national_growth'
  if (chapterCount <= 50) return 'national_established'
  return 'national_network'
}

function isTierUpgradeNeeded(subscription, memberCount, chapterCount) {
  if (!subscription || !['trialing', 'active'].includes(subscription.status)) return false
  if (subscription.billing_track === 'national') {
    return getSuggestedNationalTier(chapterCount) !== subscription.tier
  }
  return getSuggestedStandaloneTier(memberCount) !== subscription.tier
}

function tierLabel(sub) {
  if (!sub?.tier) return 'Organization Plan'
  const all = [...STANDALONE_TIERS, ...NATIONAL_TIERS]
  const t = all.find(t => t.key === sub.tier)
  return t ? `${t.label} — $${t.price ?? 'Custom'}/mo` : sub.tier
}

// ── Access guard ───────────────────────────────────────────
async function checkOrgAccess(orgId, userId) {
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role === 'admin' ? data : null
}

// ── Subscription gate ──────────────────────────────────────
function SubscriptionPrompt({ onBilling }) {
  return (
    <div className="text-center py-16 px-6">
      <BuildingOffice2Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-navy mb-2">Activate your organization dashboard</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
        Start your free 90-day trial to access member management, invite links, and more.
      </p>
      <button onClick={onBilling}
        className="bg-navy text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-navy/90 transition-colors">
        Start Free Trial →
      </button>
    </div>
  )
}

// ── Tier upgrade banner ────────────────────────────────────
function TierUpgradeBanner({ orgId, subscription, memberCount, chapterCount }) {
  if (!isTierUpgradeNeeded(subscription, memberCount, chapterCount)) return null
  const isNational = subscription.billing_track === 'national'
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-4 flex items-start gap-3">
      <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">
          {isNational
            ? `You have ${chapterCount} chapters — time to upgrade your plan.`
            : `Your organization has grown to ${memberCount} members — time to upgrade.`}
        </p>
        <p className="text-xs text-amber-600 mt-0.5">14-day grace period. Upgrade to keep full access.</p>
      </div>
      <Link to={`/org-admin/${orgId}?tab=billing`}
        className="text-xs font-semibold text-amber-800 underline flex-shrink-0">
        Review plans →
      </Link>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────
export default function OrgAdminPage() {
  const { orgId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [subLoading, setSubLoading] = useState(true)
  const [memberCount, setMemberCount] = useState(0)
  const [chapterCount, setChapterCount] = useState(0)

  const isNational = org?.org_type === 'national'
  const isChapter = org?.org_type === 'chapter'

  const ALL_TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'members',   label: 'Members' },
    { id: 'invites',   label: 'Invites' },
    ...(isNational ? [{ id: 'chapters', label: 'Chapters' }] : []),
    { id: 'settings',  label: 'Settings' },
    ...(!isChapter ? [{ id: 'billing', label: 'Billing', icon: CreditCardIcon }] : []),
  ]

  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    return tab || 'overview'
  })

  useEffect(() => {
    if (!user || !orgId) return
    Promise.all([
      checkOrgAccess(orgId, user.id),
      supabase.from('organizations').select('*').eq('id', orgId).single(),
      supabase.from('organization_members').select('user_id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('parent_org_id', orgId),
    ]).then(([access, orgRes, memberRes, chapterRes]) => {
      if (!access) { setAccessDenied(true); setLoading(false); return }
      if (orgRes.error) { setLoading(false); return }
      setOrg(orgRes.data)
      setMemberCount(memberRes.count ?? 0)
      setChapterCount(chapterRes.count ?? 0)
      document.title = `${orgRes.data.name} Admin | Communio`
      setLoading(false)
    })
  }, [orgId, user?.id])

  useEffect(() => {
    if (!orgId) return
    supabase.from('org_subscriptions').select('*').eq('org_id', orgId).maybeSingle()
      .then(({ data }) => { setSubscription(data); setSubLoading(false) })
  }, [orgId])

  // Chapters of national orgs are always free — no subscription required
  const hasActiveSub = isChapter || ['trialing', 'active'].includes(subscription?.status)
  const goToBilling = () => setActiveTab('billing')

  if (loading) return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="bg-navy h-32 animate-pulse" />
    </div>
  )

  if (accessDenied || !org) return (
    <div className="min-h-screen bg-cream md:pl-60 flex items-center justify-center p-8">
      <div className="text-center">
        <BuildingOffice2Icon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="font-bold text-navy mb-1">Access denied</p>
        <p className="text-gray-400 text-sm mb-4">You are not an admin of this organization.</p>
        <Link to="/organizations" className="text-navy text-sm font-semibold hover:underline">← Organizations</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      {/* Header */}
      <div className="bg-navy relative">
        <button onClick={() => navigate(`/organization/${orgId}`)}
          className="absolute top-4 left-4 text-white/70 hover:text-white p-1 flex items-center gap-1 text-sm">
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Back to org</span>
        </button>
        <div className="px-4 pt-14 pb-5 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            {org.logo_url ? (
              <img src={org.logo_url} alt="" className="w-10 h-10 rounded-xl object-contain bg-white/10" />
            ) : (
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <BuildingOffice2Icon className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">
                {org.org_type === 'national' ? 'National Org Admin' : org.org_type === 'chapter' ? 'Chapter Admin' : 'Admin'}
              </p>
              <h1 className="text-white font-bold text-lg leading-tight">{org.name}</h1>
            </div>
            {hasActiveSub && (
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
          {ALL_TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-navy text-navy' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-24 md:pb-8">
        {/* Upgrade banner on all tabs except billing */}
        {activeTab !== 'billing' && !subLoading && (
          <TierUpgradeBanner orgId={orgId} subscription={subscription} memberCount={memberCount} chapterCount={chapterCount} />
        )}

        {activeTab === 'overview' && (
          !subLoading && !hasActiveSub
            ? <SubscriptionPrompt onBilling={goToBilling} />
            : <OverviewTab org={org} orgId={orgId} memberCount={memberCount} chapterCount={chapterCount} isNational={isNational} />
        )}
        {activeTab === 'members' && (
          !subLoading && !hasActiveSub
            ? <SubscriptionPrompt onBilling={goToBilling} />
            : <MembersTab orgId={orgId} />
        )}
        {activeTab === 'invites' && (
          !subLoading && !hasActiveSub
            ? <SubscriptionPrompt onBilling={goToBilling} />
            : <InvitesTab orgId={orgId} userId={user.id} hasActiveSub={hasActiveSub} />
        )}
        {activeTab === 'chapters' && isNational && (
          !subLoading && !hasActiveSub
            ? <SubscriptionPrompt onBilling={goToBilling} />
            : <ChaptersTab orgId={orgId} orgName={org.name} user={user} onChapterCountChange={setChapterCount} />
        )}
        {activeTab === 'settings' && (
          !subLoading && !hasActiveSub
            ? <SubscriptionPrompt onBilling={goToBilling} />
            : <SettingsTab org={org} setOrg={setOrg} orgId={orgId} />
        )}
        {activeTab === 'billing' && (
          <BillingTab
            org={org} orgId={orgId} user={user}
            subscription={subscription} setSubscription={setSubscription}
            memberCount={memberCount} chapterCount={chapterCount}
          />
        )}
      </div>
    </div>
  )
}

// ── OverviewTab ────────────────────────────────────────────
function OverviewTab({ org, orgId, memberCount, chapterCount, isNational }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Members" value={memberCount} />
        {isNational
          ? <StatCard label="Chapters" value={chapterCount} />
          : <StatCard label="Status" value={org.is_official ? 'Official' : 'Community'} />}
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
      <p className="text-2xl font-bold text-navy">{value ?? '—'}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

// ── MembersTab ─────────────────────────────────────────────
function MembersTab({ orgId }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: memberRows } = await supabase
        .from('organization_members')
        .select('user_id, role, joined_at')
        .eq('org_id', orgId)
        .order('joined_at', { ascending: false })
      if (!memberRows?.length) { setLoading(false); return }
      const userIds = memberRows.map(m => m.user_id)
      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name, avatar_url').in('id', userIds)
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
      setMembers(memberRows.map(m => ({ ...profileMap[m.user_id], role: m.role, joined_at: m.joined_at })).filter(m => m.id))
      setLoading(false)
    }
    load()
  }, [orgId])

  const updateRole = async (userId, role) => {
    const { error } = await supabase.from('organization_members').update({ role }).eq('org_id', orgId).eq('user_id', userId)
    if (error) toast.error('Failed to update role.')
    else { setMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m)); toast.success('Role updated.') }
  }

  const removeMember = async (userId) => {
    const { error } = await supabase.from('organization_members').delete().eq('org_id', orgId).eq('user_id', userId)
    if (error) toast.error('Failed to remove member.')
    else { setMembers(prev => prev.filter(m => m.id !== userId)); toast.success('Member removed.') }
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
            <select value={m.role} onChange={e => updateRole(m.id, e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-navy">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={() => removeMember(m.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── InvitesTab ─────────────────────────────────────────────
function InvitesTab({ orgId, userId, hasActiveSub }) {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    supabase.from('organization_invites').select('*').eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setInvites(data ?? []); setLoading(false) })
  }, [orgId])

  useEffect(load, [load])

  const createInvite = async () => {
    if (!hasActiveSub) return
    setCreating(true)
    const bytes = crypto.getRandomValues(new Uint8Array(4))
    const code = Array.from(bytes).map(b => b.toString(36).padStart(2,'0')).join('').slice(0,8).toUpperCase()
    const { error } = await supabase.from('organization_invites').insert({ org_id: orgId, invite_code: code, created_by: userId })
    if (error) toast.error('Failed to create invite.')
    else { toast.success('Invite created.'); load() }
    setCreating(false)
  }

  const deleteInvite = async (id) => {
    await supabase.from('organization_invites').delete().eq('id', id)
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  const copyLink = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`)
    toast.success('Link copied!')
  }

  return (
    <div className="space-y-4">
      {hasActiveSub ? (
        <button onClick={createInvite} disabled={creating}
          className="w-full flex items-center justify-center gap-2 bg-navy text-white text-sm font-semibold py-3 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-60">
          <LinkIcon className="w-4 h-4" />
          {creating ? 'Creating…' : 'Create invite link'}
        </button>
      ) : (
        <div className="bg-navy/5 rounded-2xl p-4 text-center">
          <p className="text-gray-500 text-sm">Invite link generation requires an active subscription.</p>
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
                <p className="text-xs text-gray-400">{inv.use_count} use{inv.use_count !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => copyLink(inv.invite_code)} className="p-1.5 text-gray-400 hover:text-navy transition-colors">
                <ClipboardDocumentIcon className="w-4 h-4" />
              </button>
              <button onClick={() => deleteInvite(inv.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ChaptersTab ────────────────────────────────────────────
function ChaptersTab({ orgId, orgName, user, onChapterCountChange }) {
  const [chapters, setChapters] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showProvisionModal, setShowProvisionModal] = useState(false)

  const load = useCallback(async () => {
    const [chaptersRes, requestsRes] = await Promise.all([
      supabase.from('organizations').select('id, name, city, state, slug')
        .eq('parent_org_id', orgId).eq('org_type', 'chapter'),
      supabase.from('chapter_requests').select('id, requesting_org_id, message, created_at, status, organizations!requesting_org_id(id, name, city, state)')
        .eq('target_national_org_id', orgId).eq('status', 'pending'),
    ])

    const chapterIds = (chaptersRes.data ?? []).map(c => c.id)
    let memberCounts = {}
    if (chapterIds.length > 0) {
      const { data: counts } = await supabase.from('organization_members')
        .select('org_id').in('org_id', chapterIds)
      if (counts) {
        counts.forEach(r => { memberCounts[r.org_id] = (memberCounts[r.org_id] || 0) + 1 })
      }
    }

    setChapters((chaptersRes.data ?? []).map(c => ({ ...c, memberCount: memberCounts[c.id] ?? 0 })))
    setRequests(requestsRes.data ?? [])
    onChapterCountChange?.((chaptersRes.data ?? []).length)
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  async function approveRequest(req) {
    await supabase.from('chapter_requests').update({
      status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', req.id)
    await supabase.from('organizations').update({ parent_org_id: orgId, org_type: 'chapter' })
      .eq('id', req.requesting_org_id)
    // Notify requester
    await supabase.from('notifications').insert({
      user_id: req.organizations?.created_by || req.requested_by,
      type: 'chapter_request_resolved',
      reference_id: req.requesting_org_id,
      message: `Your chapter request to join ${orgName} has been approved!`,
      is_read: false,
    }).catch(() => {})
    toast.success(`${req.organizations?.name} approved as a chapter.`)
    load()
  }

  async function denyRequest(req) {
    await supabase.from('chapter_requests').update({
      status: 'denied', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', req.id)
    toast.success('Request denied.')
    load()
  }

  if (loading) return <div className="space-y-2">{[1,2].map(i => <div key={i} className="bg-white h-16 rounded-2xl animate-pulse border border-gray-100" />)}</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">
          Chapters ({chapters.length})
          {requests.length > 0 && <span className="ml-2 text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">{requests.length} pending</span>}
        </h2>
        <button onClick={() => setShowProvisionModal(true)}
          className="flex items-center gap-1.5 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-navy/90 transition-colors">
          <PlusIcon className="w-4 h-4" /> New Chapter
        </button>
      </div>

      {/* Pending requests */}
      {requests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Pending Requests</p>
          {requests.map(req => {
            const org = req.organizations
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <BuildingOffice2Icon className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy text-sm">{org?.name || 'Unknown org'}</p>
                    {(org?.city || org?.state) && (
                      <p className="text-xs text-gray-400">{[org.city, org.state].filter(Boolean).join(', ')}</p>
                    )}
                    {req.message && <p className="text-xs text-gray-500 mt-1 italic">"{req.message}"</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => approveRequest(req)}
                    className="flex-1 bg-navy text-white text-xs font-bold py-2 rounded-xl hover:bg-navy/90 transition-colors">
                    Approve
                  </button>
                  <button onClick={() => denyRequest(req)}
                    className="flex-1 border border-gray-200 text-gray-500 text-xs font-semibold py-2 rounded-xl hover:border-red-300 hover:text-red-500 transition-colors">
                    Deny
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Approved chapters */}
      {chapters.length === 0 && requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <BuildingOffice2Icon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-navy font-semibold text-sm">No chapters yet</p>
          <p className="text-gray-400 text-xs mt-1">Create a chapter or approve a chapter request above.</p>
        </div>
      ) : chapters.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Approved Chapters</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {chapters.map(ch => (
              <Link key={ch.id} to={`/organization/${ch.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-lightbg transition-colors">
                <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                  <BuildingOffice2Icon className="w-4 h-4 text-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{ch.name}</p>
                  <p className="text-xs text-gray-400">
                    {[ch.city, ch.state].filter(Boolean).join(', ')}
                    {ch.memberCount > 0 && ` · ${ch.memberCount} members`}
                  </p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {showProvisionModal && (
        <ProvisionChapterModal
          parentOrgId={orgId}
          parentOrgName={orgName}
          user={user}
          onClose={() => setShowProvisionModal(false)}
          onCreated={() => { setShowProvisionModal(false); load() }}
        />
      )}
    </div>
  )
}

// ── ProvisionChapterModal ──────────────────────────────────
function ProvisionChapterModal({ parentOrgId, parentOrgName, user, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    const suffix = Array.from(crypto.getRandomValues(new Uint8Array(3))).map(b => b.toString(36)).join('').slice(0,5)
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + suffix

    const { data: org, error } = await supabase.from('organizations').insert({
      name: name.trim(), slug, category: 'other',
      city: city.trim() || null, state: state.trim() || null,
      parent_org_id: parentOrgId, org_type: 'chapter', created_by: user.id,
    }).select('id').single()

    if (error) { toast.error('Could not create chapter.'); setSaving(false); return }

    await supabase.from('organization_members').insert({ org_id: org.id, user_id: user.id, role: 'admin' })
    toast.success(`${name.trim()} created as a chapter.`)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy">New Chapter</h2>
          <button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Will be created as a chapter of {parentOrgName}.</p>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Chapter name *"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
          <div className="grid grid-cols-2 gap-3">
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
            <input value={state} onChange={e => setState(e.target.value)} placeholder="State" maxLength={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-500 text-sm font-semibold py-2.5 rounded-xl">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !name.trim()}
            className="flex-1 bg-navy text-white text-sm font-bold py-2.5 rounded-xl hover:bg-navy/90 disabled:opacity-60 transition-colors">
            {saving ? 'Creating…' : 'Create Chapter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SettingsTab ────────────────────────────────────────────
function SettingsTab({ org, setOrg, orgId }) {
  const [form, setForm] = useState({
    name: org.name, description: org.description || '', category: org.category || '',
    website: org.website || '', email: org.email || '', city: org.city || '',
    state: org.state || '', logo_url: org.logo_url || '',
    org_type: org.org_type || 'standalone',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const updates = {
      name: form.name.trim(), description: form.description.trim() || null,
      category: form.category.trim() || null, website: form.website.trim() || null,
      email: form.email.trim() || null, city: form.city.trim() || null,
      state: form.state.trim() || null, logo_url: form.logo_url.trim() || null,
      org_type: form.org_type,
    }
    const { error } = await supabase.from('organizations').update(updates).eq('id', orgId)
    if (error) toast.error('Failed to save changes.')
    else { setOrg(prev => ({ ...prev, ...updates })); toast.success('Changes saved.') }
    setSaving(false)
  }

  const CATEGORIES = ['Ministry', 'Apostolate', 'Charity', 'Education', 'Media', "Men's Ministry", "Women's Ministry", 'Youth', 'Family', 'Pro-Life', 'Prayer', 'Missions', 'Religious Order', 'Other']

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-navy text-sm">Organization details</h2>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Name *</label>
          <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
          <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy bg-white">
            <option value="">Select category…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Organization type</label>
          <select value={form.org_type} onChange={e => setForm(p => ({...p, org_type: e.target.value}))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy bg-white">
            <option value="standalone">Standalone</option>
            <option value="national">National (manages chapters)</option>
            <option value="chapter">Chapter (under a national org)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
          <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
            rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">City</label>
            <input value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">State</label>
            <input value={form.state} onChange={e => setForm(p => ({...p, state: e.target.value}))} maxLength={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Website</label>
          <input value={form.website} onChange={e => setForm(p => ({...p, website: e.target.value}))} type="url"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
          <input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} type="email"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Logo URL</label>
          <input value={form.logo_url} onChange={e => setForm(p => ({...p, logo_url: e.target.value}))} type="url"
            placeholder="https://example.org/logo.png"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
          {form.logo_url.trim() && (
            <img src={form.logo_url.trim()} alt="Logo preview"
              className="mt-2 w-16 h-16 rounded-xl object-contain border border-gray-200 bg-gray-50"
              onError={e => { e.currentTarget.style.display = 'none' }} />
          )}
        </div>
        <button onClick={handleSave} disabled={saving || !form.name.trim()}
          className="w-full bg-navy text-white text-sm font-bold py-2.5 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

// ── BillingTab ─────────────────────────────────────────────
const STATUS_BADGE = {
  trialing: 'bg-blue-100 text-blue-700',
  active:   'bg-green-100 text-green-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-red-100 text-red-700',
}

function BillingTab({ org, orgId, user, subscription, setSubscription, memberCount, chapterCount }) {
  const [billingTrack, setBillingTrack] = useState(() => subscription?.billing_track || 'standalone')
  const [selectedTier, setSelectedTier] = useState(() => {
    if (subscription?.tier) return subscription.tier
    return getSuggestedStandaloneTier(memberCount)
  })
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [billingEvents, setBillingEvents] = useState([])

  const hasSubscription = !!subscription
  const isActive = ['trialing', 'active'].includes(subscription?.status)
  const isLegacy = hasSubscription && ['small', 'mid', 'large'].includes(subscription?.tier)

  useEffect(() => {
    if (!subscription?.stripe_customer_id) return
    supabase.from('billing_events').select('id, event_type, status, created_at')
      .eq('stripe_customer_id', subscription.stripe_customer_id)
      .order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setBillingEvents(data ?? []))
  }, [subscription?.stripe_customer_id])

  // Auto-select suggested tier when track or counts change
  useEffect(() => {
    if (!hasSubscription) {
      setSelectedTier(billingTrack === 'national'
        ? getSuggestedNationalTier(chapterCount)
        : getSuggestedStandaloneTier(memberCount))
    }
  }, [billingTrack, memberCount, chapterCount, hasSubscription])

  async function handleStartTrial() {
    if (selectedTier === 'national_network') {
      toast.info('National Network (51+ chapters) requires a custom contract. Contact hello@getcommunio.app.')
      return
    }
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/create-org-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, orgName: org.name, adminUserId: user.id, adminEmail: user.email, billingTrack, tier: selectedTier }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error(data.error || 'Something went wrong.')
    } catch { toast.error('Something went wrong.') }
    setCheckoutLoading(false)
  }

  async function handleManage() {
    if (!subscription?.stripe_customer_id) return
    setPortalLoading(true)
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeCustomerId: subscription.stripe_customer_id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error('Something went wrong.')
    } catch { toast.error('Something went wrong.') }
    setPortalLoading(false)
  }

  const tiers = billingTrack === 'national' ? NATIONAL_TIERS : STANDALONE_TIERS
  const suggestedKey = billingTrack === 'national'
    ? getSuggestedNationalTier(chapterCount)
    : getSuggestedStandaloneTier(memberCount)

  return (
    <div className="space-y-5">

      {/* Legacy pricing notice */}
      {isLegacy && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-sm text-blue-800">You're on our legacy pricing. Switch to the new member-count based pricing when you're ready.</p>
        </div>
      )}

      {/* No subscription: tier selector */}
      {!hasSubscription && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-center mb-5">
            <p className="font-bold text-navy text-base mb-1">Start your free 90-day trial</p>
            <p className="text-gray-500 text-sm">No credit card required until day 90.</p>
          </div>

          {/* Track toggle */}
          <div className="flex gap-2 mb-5">
            {['standalone', 'national'].map(track => (
              <button key={track} onClick={() => setBillingTrack(track)}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl border-2 transition-colors ${
                  billingTrack === track ? 'border-navy bg-navy/5 text-navy' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}>
                {track === 'national' ? 'National Org' : 'Standalone'}
              </button>
            ))}
          </div>

          {billingTrack === 'national' && (
            <p className="text-xs text-center text-gray-400 mb-4">One subscription covers all your chapters.</p>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            {tiers.map((tier) => (
              <button key={tier.key} onClick={() => tier.key !== 'national_network' && setSelectedTier(tier.key)}
                className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                  tier.key === 'national_network' ? 'border-gray-100 bg-gray-50 cursor-default' :
                  selectedTier === tier.key ? 'border-gold bg-gold/5' : 'border-gray-200 hover:border-gray-300'
                }`}>
                {tier.key === suggestedKey && tier.key !== 'national_network' && (
                  <span className="absolute -top-2.5 left-3 bg-gold text-navy text-[10px] font-bold px-2 py-0.5 rounded-full">Suggested</span>
                )}
                <p className="font-bold text-navy text-sm">{tier.label}</p>
                {tier.price
                  ? <p className="text-xl font-black text-navy leading-tight">${tier.price}<span className="text-xs font-normal text-gray-400">/mo</span></p>
                  : <p className="text-sm font-bold text-purple-600">Custom</p>}
                <p className="text-xs text-gray-500 mt-1">{tier.desc}</p>
                {selectedTier === tier.key && tier.key !== 'national_network' && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-gold rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-navy"><path d="M1 4l3 3 5-5-1-1-4 4-2-2z"/></svg>
                  </span>
                )}
                {tier.key === 'national_network' && (
                  <p className="text-xs text-purple-600 mt-1 font-medium">Contact us →</p>
                )}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center mb-4">
            {billingTrack === 'national'
              ? `You currently have ${chapterCount} chapter${chapterCount !== 1 ? 's' : ''} provisioned.`
              : `You currently have ${memberCount} member${memberCount !== 1 ? 's' : ''}.`}
          </p>

          {selectedTier === 'national_network' ? (
            <a href="mailto:hello@getcommunio.app?subject=National Network inquiry"
              className="block w-full text-center bg-purple-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-purple-700 transition-colors">
              Contact us for National Network pricing →
            </a>
          ) : (
            <button onClick={handleStartTrial} disabled={checkoutLoading}
              className="w-full bg-gold text-navy font-bold py-3 rounded-xl text-sm hover:bg-gold/90 disabled:opacity-60 transition-colors">
              {checkoutLoading ? 'Redirecting…' : `Start Free Trial — $${tiers.find(t => t.key === selectedTier)?.price}/mo after →`}
            </button>
          )}
        </div>
      )}

      {/* Active subscription */}
      {hasSubscription && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-bold text-navy text-sm mb-0.5">Subscription</p>
              <p className="text-xs text-gray-500">{tierLabel(subscription)}</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[subscription.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {subscription.status === 'trialing' ? 'Trial' : subscription.status}
            </span>
          </div>
          {subscription.status === 'trialing' && subscription.trial_ends_at && (
            <p className="text-xs text-gray-500 mb-3">Trial ends {format(parseISO(subscription.trial_ends_at), 'MMMM d, yyyy')}</p>
          )}
          {subscription.status === 'active' && subscription.current_period_end && (
            <p className="text-xs text-gray-500 mb-3">Next billing: {format(parseISO(subscription.current_period_end), 'MMMM d, yyyy')}</p>
          )}
          {isTierUpgradeNeeded(subscription, memberCount, chapterCount) && (
            <p className="text-xs text-amber-600 font-medium mb-3">
              Your usage has grown past this tier. Upgrade in the portal to stay covered.
            </p>
          )}
          <button onClick={handleManage} disabled={portalLoading}
            className="w-full border border-gray-200 text-navy text-sm font-semibold py-2.5 rounded-xl hover:border-navy transition-colors disabled:opacity-60">
            {portalLoading ? 'Opening…' : 'Manage subscription →'}
          </button>
        </div>
      )}

      {/* Billing history */}
      {billingEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="font-semibold text-navy text-sm mb-3">Billing History</p>
          <div className="space-y-2">
            {billingEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-navy">{ev.event_type.replace('checkout.session.completed', 'Subscription started').replace('customer.subscription.', 'Subscription ').replace('invoice.payment_failed', 'Payment failed')}</p>
                  <p className="text-xs text-gray-400">{format(parseISO(ev.created_at), 'MMM d, yyyy')}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[ev.status] ?? 'bg-gray-100 text-gray-500'}`}>{ev.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
