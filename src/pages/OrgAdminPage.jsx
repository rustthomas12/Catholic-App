import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChartBarIcon,
  MegaphoneIcon,
  CalendarDaysIcon,
  UsersIcon,
  LinkIcon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  CreditCardIcon,
  ArrowLeftIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ClockIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { format, parseISO, addDays } from 'date-fns'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import EventRsvpButtons from '../components/shared/EventRsvpButtons'

// ── Tier helpers ───────────────────────────────────────────
const STANDALONE_TIERS = [
  { key: 'starter',     label: 'Starter',     price: 50,  desc: 'Under 50 members' },
  { key: 'growth',      label: 'Growth',       price: 100, desc: '50–100 members' },
  { key: 'established', label: 'Established',  price: 300, desc: '100–300 members' },
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

// ── Tabs ───────────────────────────────────────────────────
const BASE_TABS = [
  { id: 'overview',      label: 'Overview',      Icon: ChartBarIcon },
  { id: 'events',        label: 'Events',         Icon: CalendarDaysIcon },
  { id: 'announcements', label: 'Announcements',  Icon: MegaphoneIcon },
  { id: 'members',       label: 'Members',        Icon: UsersIcon },
  { id: 'invites',       label: 'Invites',        Icon: LinkIcon },
  { id: 'chapters',      label: 'Chapters',       Icon: BuildingOffice2Icon, nationalOnly: true },
  { id: 'settings',      label: 'Settings',       Icon: Cog6ToothIcon },
  { id: 'billing',       label: 'Billing',        Icon: CreditCardIcon, hideForChapter: true },
]

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

// ── Subscription prompt ────────────────────────────────────
function SubscriptionPrompt({ onBilling }) {
  return (
    <div className="text-center py-16 px-6">
      <BuildingOffice2Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-navy mb-2">Activate your organization dashboard</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
        Start your free 90-day trial to access member management, events, announcements, and more.
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

  const TABS = BASE_TABS.filter(t =>
    (!t.nationalOnly || isNational) &&
    (!t.hideForChapter || !isChapter)
  )

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'overview')

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

  const panelProps = {
    orgId, org, setOrg, user, isNational, isChapter,
    subscription, setSubscription,
    memberCount, chapterCount,
    setChapterCount: setChapterCount,
    setActiveTab,
  }

  const ActivePanel = {
    overview:      OverviewTab,
    events:        OrgEventsTab,
    announcements: OrgAnnouncementsTab,
    members:       MembersTab,
    invites:       InvitesTab,
    chapters:      ChaptersTab,
    settings:      SettingsTab,
    billing:       BillingTab,
  }[activeTab] ?? OverviewTab

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      {/* Header */}
      <div className="bg-navy px-4 pt-5 pb-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate(`/organization/${orgId}`)}
              className="text-white/60 hover:text-white transition-colors p-0.5">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <p className="text-gold text-xs font-semibold uppercase tracking-widest">
                {isNational ? 'National Org Admin' : isChapter ? 'Chapter Admin' : 'Org Admin'}
              </p>
              <h1 className="text-white font-bold text-lg leading-tight">{org.name}</h1>
            </div>
            {hasActiveSub && !isChapter && (
              <span className="ml-auto text-[10px] font-bold bg-gold/20 text-gold px-2 py-1 rounded-full">
                {subscription?.status === 'trialing' ? 'Trial' : 'Active'}
              </span>
            )}
            {isChapter && (
              <span className="ml-auto text-[10px] font-bold bg-gold/20 text-gold px-2 py-1 rounded-full">
                Chapter
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 overflow-x-auto sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex min-w-max">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === id ? 'border-navy text-navy' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-24 md:pb-8">
        {activeTab !== 'billing' && !subLoading && !hasActiveSub
          ? <SubscriptionPrompt onBilling={goToBilling} />
          : (
            <>
              {activeTab !== 'billing' && !subLoading && (
                <TierUpgradeBanner orgId={orgId} subscription={subscription} memberCount={memberCount} chapterCount={chapterCount} />
              )}
              <ActivePanel {...panelProps} />
            </>
          )
        }
      </div>
    </div>
  )
}

// ── OverviewTab ────────────────────────────────────────────
function OverviewTab({ orgId, org, isNational, memberCount, chapterCount }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [eventRes, announcementRes] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('org_announcements').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('published', true),
      ])
      setStats({
        events: eventRes.count ?? 0,
        announcements: announcementRes.count ?? 0,
      })
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [orgId])

  const statCards = [
    { label: 'Members', value: memberCount, color: 'bg-navy' },
    ...(isNational ? [{ label: 'Chapters', value: chapterCount, color: 'bg-gold' }] : []),
    { label: 'Events', value: stats?.events ?? '—', color: 'bg-green-600' },
    { label: 'Announcements', value: stats?.announcements ?? '—', color: 'bg-blue-500' },
  ]

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-white h-24 rounded-2xl animate-pulse border border-gray-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-2xl font-bold text-navy">{typeof value === 'number' ? value.toLocaleString() : value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              <div className={`h-1 ${color} rounded-full mt-3 opacity-70`} style={{ width: '40%' }} />
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        <h2 className="font-bold text-navy text-sm">Quick actions</h2>
        <Link to={`/organization/${orgId}`}
          className="flex items-center gap-2 text-sm text-navy py-2 hover:opacity-70 transition-opacity">
          <BuildingOffice2Icon className="w-4 h-4" /> View public page
        </Link>
      </div>

      {org.description && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-bold text-navy text-sm mb-2">About</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{org.description}</p>
        </div>
      )}
    </div>
  )
}

// ── OrgEventsTab ──────────────────────────────────────────
function AttendeeList({ eventId }) {
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('event_rsvps')
      .select('response, profiles(id, full_name)')
      .eq('event_id', eventId)
      .then(({ data }) => { setAttendees(data || []); setLoading(false) })
  }, [eventId])

  const going    = attendees.filter(a => a.response === 'yes')
  const maybe    = attendees.filter(a => a.response === 'maybe')
  const notGoing = attendees.filter(a => a.response === 'no')

  if (loading) return <p className="text-xs text-gray-400 mt-2">Loading RSVPs…</p>
  if (attendees.length === 0) return <p className="text-xs text-gray-400 mt-2">No RSVPs yet.</p>

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
      {going.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-600 mb-1">Going ({going.length})</p>
          {going.map(a => <p key={a.profiles.id} className="text-xs text-gray-700 pl-2">{a.profiles.full_name}</p>)}
        </div>
      )}
      {maybe.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-yellow-600 mb-1">Maybe ({maybe.length})</p>
          {maybe.map(a => <p key={a.profiles.id} className="text-xs text-gray-700 pl-2">{a.profiles.full_name}</p>)}
        </div>
      )}
      {notGoing.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-1">Can't go ({notGoing.length})</p>
          {notGoing.map(a => <p key={a.profiles.id} className="text-xs text-gray-400 pl-2">{a.profiles.full_name}</p>)}
        </div>
      )}
    </div>
  )
}

function OrgEventsTab({ orgId, user }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '', location: '' })
  const [saving, setSaving] = useState(false)
  const [openRsvpId, setOpenRsvpId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('id, title, description, start_time, end_time, location, rsvp_count')
      .eq('org_id', orgId)
      .order('start_time', { ascending: false })
      .limit(30)
    setEvents(data ?? [])
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!form.title.trim() || !form.start_time || !user) return
    setSaving(true)
    const { error } = await supabase.from('events').insert({
      org_id: orgId,
      creator_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_time: form.start_time,
      end_time: form.end_time || null,
      location: form.location.trim() || null,
    })
    if (error) {
      toast.error('Could not create event.')
    } else {
      toast.success('Event created.')
      setForm({ title: '', description: '', start_time: '', end_time: '', location: '' })
      setShowForm(false)
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) { toast.error('Could not delete event.'); return }
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">Events</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-navy/90 transition-colors">
          <PlusIcon className="w-4 h-4" />
          New Event
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-navy text-sm">Create Event</h3>
          <input
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Event title *"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Start *</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">End</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
          </div>
          <input
            value={form.location}
            onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            placeholder="Location (optional)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.title.trim() || !form.start_time}
              className="px-4 py-1.5 bg-gold text-navy text-sm font-bold rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <CalendarDaysIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No events yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-navy text-sm">{ev.title}</p>
                  {ev.start_time && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(parseISO(ev.start_time), 'EEE, MMM d · h:mm a')}
                      {ev.end_time ? ` – ${format(parseISO(ev.end_time), 'h:mm a')}` : ''}
                    </p>
                  )}
                  {ev.location && <p className="text-xs text-gray-400 mt-0.5">📍 {ev.location}</p>}
                  {ev.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ev.description}</p>}
                </div>
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="text-red-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <EventRsvpButtons eventId={ev.id} showCount={true} />
              <button
                onClick={() => setOpenRsvpId(openRsvpId === ev.id ? null : ev.id)}
                className="mt-2 text-xs text-gray-400 hover:text-navy transition-colors">
                {openRsvpId === ev.id ? 'Hide RSVPs' : `See RSVPs${ev.rsvp_count > 0 ? ` (${ev.rsvp_count})` : ''}`}
              </button>
              {openRsvpId === ev.id && <AttendeeList eventId={ev.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── OrgAnnouncementsTab ────────────────────────────────────
function OrgAnnouncementsTab({ orgId, user }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [title, setTitle] = useState('')
  const [draft, setDraft] = useState('')
  const [scheduleFor, setScheduleFor] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('org_announcements')
      .select('id, title, content, published, scheduled_for, published_at, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(30)
    setPosts(data ?? [])
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  async function handlePublish() {
    if (!draft.trim() || !user) return
    setSaving(true)

    const { error } = await supabase.from('org_announcements').insert({
      org_id: orgId,
      author_id: user.id,
      title: title.trim() || null,
      content: draft.trim(),
      published: !scheduleFor,
      scheduled_for: scheduleFor || null,
      published_at: scheduleFor ? null : new Date().toISOString(),
    })

    if (error) {
      toast.error('Could not save announcement.')
    } else {
      toast.success(scheduleFor ? 'Announcement scheduled.' : 'Announcement published.')
      setTitle('')
      setDraft('')
      setScheduleFor('')
      setComposing(false)
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('org_announcements').delete().eq('id', id)
    if (error) { toast.error('Could not delete.'); return }
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  async function handleSendNow(post) {
    const { error } = await supabase
      .from('org_announcements')
      .update({ published: true, published_at: new Date().toISOString() })
      .eq('id', post.id)
    if (error) { toast.error('Could not publish.'); return }
    toast.success('Announcement published.')
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">Announcements</h2>
        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-1.5 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-navy/90 transition-colors">
          <PlusIcon className="w-4 h-4" />
          New
        </button>
      </div>

      {composing && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            maxLength={120}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-navy focus:outline-none focus:border-navy"
          />
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Write your announcement…"
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-navy resize-none focus:outline-none focus:border-navy"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Schedule for:</label>
              <input
                type="datetime-local"
                value={scheduleFor}
                onChange={e => setScheduleFor(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-navy focus:outline-none focus:border-navy"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setComposing(false); setTitle(''); setDraft(''); setScheduleFor('') }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={saving || !draft.trim()}
                className="px-4 py-1.5 bg-gold text-navy text-sm font-bold rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : scheduleFor ? 'Schedule' : 'Publish Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <MegaphoneIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {post.title && <p className="font-semibold text-navy text-sm mb-1">{post.title}</p>}
                  <p className="text-sm text-navy leading-relaxed">{post.content}</p>
                </div>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="text-red-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {post.published ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Published {post.published_at ? format(parseISO(post.published_at), 'MMM d, yyyy') : ''}
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-xs text-orange-500 font-semibold">
                      <ClockIcon className="w-3.5 h-3.5" />
                      Scheduled {post.scheduled_for ? format(parseISO(post.scheduled_for), 'MMM d, h:mm a') : ''}
                    </span>
                    <button
                      onClick={() => handleSendNow(post)}
                      className="text-xs font-semibold text-navy border border-navy rounded-lg px-2.5 py-1 hover:bg-navy hover:text-white transition-colors">
                      Send now
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MembersTab ─────────────────────────────────────────────
function MembersTab({ orgId }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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
        .from('profiles')
        .select('id, full_name, avatar_url, vocation_state')
        .in('id', userIds)
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
      setMembers(
        memberRows
          .map(m => ({ ...profileMap[m.user_id], role: m.role, joined_at: m.joined_at }))
          .filter(m => m.id)
      )
      setLoading(false)
    }
    load()
  }, [orgId])

  const filtered = members.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase())
  )

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-navy">Members ({members.length})</h2>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-navy w-40"
        />
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <UsersIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-navy font-semibold text-sm">{search ? 'No results.' : 'No members yet.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {filtered.map((m) => (
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
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-navy bg-white">
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
      )}
    </div>
  )
}

// ── InvitesTab ─────────────────────────────────────────────
function InvitesTab({ orgId, user, hasActiveSub }) {
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
    const code = Array.from(bytes).map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 8).toUpperCase()
    const { error } = await supabase.from('organization_invites').insert({ org_id: orgId, invite_code: code, created_by: user.id })
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
      <button onClick={createInvite} disabled={creating || !hasActiveSub}
        className="w-full flex items-center justify-center gap-2 bg-navy text-white text-sm font-semibold py-3 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-60">
        <LinkIcon className="w-4 h-4" />
        {creating ? 'Creating…' : 'Create invite link'}
      </button>

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="bg-white h-16 rounded-2xl animate-pulse border border-gray-100" />)}</div>
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
                <p className="text-xs text-gray-400">{inv.use_count ?? 0} use{inv.use_count !== 1 ? 's' : ''}</p>
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
function ChaptersTab({ orgId, org, user, chapterCount, setChapterCount }) {
  const orgName = org?.name
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
    setChapterCount?.((chaptersRes.data ?? []).length)
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  async function approveRequest(req) {
    await supabase.from('chapter_requests').update({
      status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', req.id)
    await supabase.from('organizations').update({ parent_org_id: orgId, org_type: 'chapter' })
      .eq('id', req.requesting_org_id)
    await supabase.from('notifications').insert({
      user_id: req.requested_by,
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

  if (loading) return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="bg-white h-16 rounded-2xl animate-pulse border border-gray-100" />)}</div>

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

      {requests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Pending Requests</p>
          {requests.map(req => {
            const reqOrg = req.organizations
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <BuildingOffice2Icon className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy text-sm">{reqOrg?.name || 'Unknown org'}</p>
                    {(reqOrg?.city || reqOrg?.state) && (
                      <p className="text-xs text-gray-400">{[reqOrg.city, reqOrg.state].filter(Boolean).join(', ')}</p>
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
    const suffix = Array.from(crypto.getRandomValues(new Uint8Array(3))).map(b => b.toString(36)).join('').slice(0, 5)
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

// ── HoursEditor ────────────────────────────────────────────
function HoursEditor({ value, onChange }) {
  const defaultRows = [
    { day: 'Monday–Friday', time: '' },
    { day: 'Saturday', time: '' },
    { day: 'Sunday', time: '' },
  ]

  function parseValue() {
    if (!value) return defaultRows
    if (typeof value === 'object' && !Array.isArray(value)) {
      return Object.entries(value).map(([day, time]) => ({ day, time: String(time) }))
    }
    return defaultRows
  }

  const [rows, setRows] = useState(parseValue)

  function updateRow(i, field, val) {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r)
    setRows(next)
    const obj = Object.fromEntries(next.filter(r => r.day.trim() && r.time.trim()).map(r => [r.day.trim(), r.time.trim()]))
    onChange(Object.keys(obj).length > 0 ? obj : null)
  }

  function addRow() {
    setRows(prev => [...prev, { day: '', time: '' }])
  }

  function removeRow(i) {
    const next = rows.filter((_, idx) => idx !== i)
    setRows(next)
    const obj = Object.fromEntries(next.filter(r => r.day.trim() && r.time.trim()).map(r => [r.day.trim(), r.time.trim()]))
    onChange(Object.keys(obj).length > 0 ? obj : null)
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={row.day}
            onChange={e => updateRow(i, 'day', e.target.value)}
            placeholder="Day / Period"
            className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-navy"
          />
          <input
            value={row.time}
            onChange={e => updateRow(i, 'time', e.target.value)}
            placeholder="e.g. 9:00 AM – 5:00 PM"
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-navy"
          />
          <button onClick={() => removeRow(i)} className="text-red-300 hover:text-red-500 transition-colors">
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>
      ))}
      <button onClick={addRow} className="text-sm text-navy font-semibold hover:underline flex items-center gap-1">
        <PlusIcon className="w-4 h-4" /> Add row
      </button>
    </div>
  )
}

// ── SettingsTab ────────────────────────────────────────────
function SettingsTab({ org, setOrg, orgId }) {
  const [form, setForm] = useState({
    name:        org.name || '',
    description: org.description || '',
    category:    org.category || '',
    website:     org.website || '',
    email:       org.email || '',
    phone:       org.phone || '',
    address:     org.address || '',
    city:        org.city || '',
    state:       org.state || '',
    zip:         org.zip || '',
    logo_url:    org.logo_url || '',
    org_type:    org.org_type || 'standalone',
    hours:       org.hours || null,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const updates = {
      name:        form.name.trim(),
      description: form.description.trim() || null,
      category:    form.category.trim() || null,
      website:     form.website.trim() || null,
      email:       form.email.trim() || null,
      phone:       form.phone.trim() || null,
      address:     form.address.trim() || null,
      city:        form.city.trim() || null,
      state:       form.state.trim() || null,
      zip:         form.zip.trim() || null,
      logo_url:    form.logo_url.trim() || null,
      org_type:    form.org_type,
      hours:       form.hours || null,
    }
    const { error } = await supabase.from('organizations').update(updates).eq('id', orgId)
    if (error) toast.error('Failed to save changes.')
    else { setOrg(prev => ({ ...prev, ...updates })); toast.success('Changes saved.') }
    setSaving(false)
  }

  const CATEGORIES = ['Ministry', 'Apostolate', 'Charity', 'Education', 'Media', "Men's Ministry", "Women's Ministry", 'Youth', 'Family', 'Pro-Life', 'Prayer', 'Missions', 'Religious Order', 'Other']

  function field(label, key, type = 'text', extra = {}) {
    return (
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
          {...extra}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-navy text-sm">Basic Information</h2>
        {field('Name *', 'name')}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy bg-white">
            <option value="">Select category…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Organization type</label>
          <select value={form.org_type} onChange={e => setForm(p => ({ ...p, org_type: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy bg-white">
            <option value="standalone">Standalone</option>
            <option value="national">National (manages chapters)</option>
            <option value="chapter">Chapter (under a national org)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Logo URL</label>
          <input value={form.logo_url} onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))} type="url"
            placeholder="https://example.org/logo.png"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy" />
          {form.logo_url.trim() && (
            <img src={form.logo_url.trim()} alt="Logo preview"
              className="mt-2 w-16 h-16 rounded-xl object-contain border border-gray-200 bg-gray-50"
              onError={e => { e.currentTarget.style.display = 'none' }} />
          )}
        </div>
      </div>

      {/* Contact & location */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-navy text-sm">Contact & Location</h2>
        {field('Street Address', 'address')}
        <div className="grid grid-cols-2 gap-3">
          {field('City', 'city')}
          {field('State', 'state', 'text', { maxLength: 2 })}
        </div>
        {field('ZIP / Postal Code', 'zip')}
        {field('Phone', 'phone', 'tel')}
        {field('Email', 'email', 'email')}
        {field('Website', 'website', 'url')}
      </div>

      {/* Hours */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-navy text-sm">Hours <span className="text-gray-400 font-normal">(optional)</span></h2>
        <p className="text-xs text-gray-400">Leave blank if your organization doesn't have set office/meeting hours.</p>
        <HoursEditor
          value={form.hours}
          onChange={hours => setForm(p => ({ ...p, hours }))}
        />
      </div>

      <button onClick={handleSave} disabled={saving || !form.name.trim()}
        className="w-full bg-navy text-white text-sm font-bold py-3 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-60">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
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
      {isLegacy && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-sm text-blue-800">You're on our legacy pricing. Switch to the new member-count based pricing when you're ready.</p>
        </div>
      )}

      {!hasSubscription && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-center mb-5">
            <p className="font-bold text-navy text-base mb-1">Start your free 90-day trial</p>
            <p className="text-gray-500 text-sm">No credit card required until day 90.</p>
          </div>

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

      {billingEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="font-semibold text-navy text-sm mb-3">Billing History</p>
          <div className="space-y-2">
            {billingEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-navy">
                    {ev.event_type
                      .replace('checkout.session.completed', 'Subscription started')
                      .replace('customer.subscription.', 'Subscription ')
                      .replace('invoice.payment_failed', 'Payment failed')}
                  </p>
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
