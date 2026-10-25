import Modal from '../components/shared/Modal'
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  XMarkIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../hooks/useAuth.jsx'
import { formatRelativeTime } from '../utils/dates'
import ParishEvents from '../components/parish/ParishEvents'
import { createNotification } from '../lib/notifications'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'
import Feed from '../components/feed/Feed'
import { safeImageUrl } from '../utils/validate'

// ── useOrganization ────────────────────────────────────────
function useOrganization(orgId) {
  const { user, profile } = useAuth()
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [memberCount, setMemberCount] = useState(0)
  const [isMember, setIsMember] = useState(false)
  const [myRole, setMyRole] = useState(null)
  const [joinLoading, setJoinLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [parentOrg, setParentOrg] = useState(null)
  const [chapters, setChapters] = useState([])

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const memberCheck = user?.id
      ? supabase.from('organization_members').select('role').eq('org_id', orgId).eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null })

    Promise.all([
      supabase.from('organizations').select('*').eq('id', orgId).single(),
      // Only members can list members, so the count comes from an RPC
      supabase.rpc('org_member_counts', { p_org_ids: [orgId] }),
      memberCheck,
      supabase.from('org_subscriptions').select('status').eq('org_id', orgId).maybeSingle(),
    ]).then(async ([orgRes, countRes, memberRes, subRes]) => {
      if (cancelled) return
      if (orgRes.error) { setError(orgRes.error.message); setLoading(false); return }

      const orgData = orgRes.data
      setOrg(orgData)
      setMemberCount(Number(countRes.data?.[0]?.members ?? 0))
      setIsMember(!!memberRes.data)
      setMyRole(memberRes.data?.role ?? null)
      setIsSubscribed(['trialing', 'active'].includes(subRes.data?.status))

      // Load parent org if chapter
      if (orgData.org_type === 'chapter' && orgData.parent_org_id) {
        const { data: parent } = await supabase
          .from('organizations')
          .select('id, name, city, state')
          .eq('id', orgData.parent_org_id)
          .single()
        if (!cancelled) setParentOrg(parent)
      }

      // Load chapters if national
      if (orgData.org_type === 'national') {
        const { data: chaps } = await supabase
          .from('organizations')
          .select('id, name, city, state')
          .eq('parent_org_id', orgId)
          .eq('org_type', 'chapter')
          .order('name')
        if (!cancelled) setChapters(chaps || [])
      }

      setLoading(false)
    })

    return () => { cancelled = true }
  }, [orgId, user?.id])

  const join = useCallback(async () => {
    if (!user?.id || joinLoading) return
    setJoinLoading(true)
    if (isMember) {
      const { error: err } = await supabase.from('organization_members')
        .delete().eq('org_id', orgId).eq('user_id', user.id)
      if (err) toast.error(err.code === 'P0001' ? err.message : 'Could not leave organization.')
      else { setIsMember(false); setMyRole(null); setMemberCount(c => Math.max(0, c - 1)) }
    } else {
      const { error: err } = await supabase.from('organization_members')
        .insert({ org_id: orgId, user_id: user.id })
      if (err) toast.error('Could not join organization.')
      else {
        setIsMember(true); setMyRole('member'); setMemberCount(c => c + 1)
        // Fire-and-forget: notify org admins of new member
        ;(async () => {
          const { data: admins } = await supabase
            .from('organization_members')
            .select('user_id')
            .eq('org_id', orgId)
            .eq('role', 'admin')
            .neq('user_id', user.id)
          if (admins?.length) {
            await supabase.from('notifications').insert(
              admins.map(a => ({
                user_id: a.user_id,
                type: 'new_org_member',
                reference_id: orgId,
                message: org?.name
                  ? `${profile?.full_name || 'Someone'} joined ${org.name}`
                  : `${profile?.full_name || 'Someone'} joined your organization`,
                actor_id: user.id,
                is_read: false,
              }))
            )
          }
        })()
      }
    }
    setJoinLoading(false)
  }, [user?.id, profile?.full_name, orgId, isMember, joinLoading, org?.name])

  return { org, loading, error, memberCount, isMember, myRole, joinLoading, join, isSubscribed, parentOrg, chapters }
}

export default function OrganizationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  // ?tab=events etc. opens a tab directly (e.g. from an event reminder)
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'feed')
  const [showContact, setShowContact] = useState(false)
  const { org, loading, error, memberCount, isMember, myRole, joinLoading, join, isSubscribed, parentOrg, chapters } = useOrganization(id)

  useEffect(() => {
    if (org) document.title = `${org.name} | inFold`
    else document.title = 'Organization | inFold'
  }, [org?.name])

  const tabs = org ? [
    { id: 'feed', label: 'Feed' },
    { id: 'events', label: 'Events' },
    { id: 'about', label: 'About' },
    ...(org.org_type === 'national' ? [{ id: 'chapters', label: 'Chapters' }] : []),
  ] : [{ id: 'feed', label: 'Feed' }, { id: 'about', label: 'About' }]

  if (loading) {
    return (
      <div className="min-h-screen bg-cream md:pl-60">
        <div className="bg-navy h-40 animate-pulse" />
      </div>
    )
  }

  if (error || !org) {
    return (
      <div className="min-h-screen bg-cream md:pl-60 flex items-center justify-center p-8">
        <div className="text-center">
          <BuildingOffice2Icon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-navy mb-1">Organization not found</p>
          <Link to="/organizations" className="text-navy text-sm font-semibold hover:underline">
            ← Back to organizations
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
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 text-white/70 hover:text-white p-1 flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Organizations</span>
        </button>

        <div className="px-4 pt-14 pb-5 max-w-3xl mx-auto">
          {/* Chapter breadcrumb */}
          {org.org_type === 'chapter' && parentOrg && (
            <Link
              to={`/organizations/${parentOrg.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 mb-3 transition-colors"
            >
              <BuildingOffice2Icon className="w-3.5 h-3.5" />
              <span>{parentOrg.name}</span>
              <ChevronRightIcon className="w-3 h-3" />
              <span className="text-white/70">Chapter</span>
            </Link>
          )}

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              {safeImageUrl(org.logo_url)
                ? <img src={safeImageUrl(org.logo_url)} alt="" className="w-full h-full object-cover" />
                : <BuildingOffice2Icon className="w-7 h-7 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <h1 className="text-white font-bold text-lg leading-snug">{org.name}</h1>
                {org.is_official && (
                  <CheckBadgeIcon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" title="Official Page" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {isSubscribed && (
                  <span className="inline-flex items-center gap-1 text-xs bg-gold/20 text-gold border border-gold/30 rounded-full px-2 py-0.5 font-semibold">
                    ✓ inFold Member
                  </span>
                )}
                {org.org_type === 'national' && (
                  <span className="inline-flex items-center gap-1 text-xs bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-full px-2 py-0.5 font-semibold">
                    National Org
                  </span>
                )}
                {org.org_type === 'chapter' && (
                  <span className="inline-flex items-center gap-1 text-xs bg-white/10 text-white/70 border border-white/20 rounded-full px-2 py-0.5 font-semibold">
                    Chapter
                  </span>
                )}
                {org.category && (
                  <span className="inline-block text-[10px] font-semibold text-white/60 bg-white/10 px-2 py-0.5 rounded-full capitalize">
                    {org.category}
                  </span>
                )}
              </div>
              {(org.city || org.state) && (
                <p className="text-gray-500 text-sm mt-0.5">
                  {[org.city, org.state].filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                {memberCount.toLocaleString()} member{memberCount !== 1 ? 's' : ''}
                {org.org_type === 'national' && chapters.length > 0 && ` · ${chapters.length} chapter${chapters.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={join}
              disabled={joinLoading}
              className={`flex-1 sm:flex-none text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 ${
                isMember
                  ? 'bg-white/20 text-white hover:bg-red-600/80'
                  : 'bg-gold text-navy hover:bg-gold/90'
              }`}
            >
              {joinLoading ? '…' : isMember ? 'Leave' : 'Join'}
            </button>

            {/* The form messages the org's admins in-app, so it doesn't need an email on file */}
            {(org.email || org.phone || org.created_by) && (
              <button
                onClick={() => setShowContact(true)}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <EnvelopeIcon className="w-4 h-4" />
                Contact
              </button>
            )}

            {myRole === 'admin' && (
              <Link
                to={`/org-admin/${org.id}`}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-gold text-navy hover:bg-gold/90 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                Manage Organization
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky sticky-top z-10">
        <div className="max-w-3xl mx-auto flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex-shrink-0 whitespace-nowrap px-3 min-h-[48px] py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-navy text-navy' : 'border-transparent text-gray-500 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact modal */}
      {showContact && (
        <OrgContactModal org={org} onClose={() => setShowContact(false)} />
      )}

      {/* Tab content */}
      <div className="max-w-3xl mx-auto pb-24 md:pb-8">
        {activeTab === 'feed' && <OrgAnnouncements orgId={id} />}
        {activeTab === 'feed' && (
          <Feed
            orgId={id}
            showCreatePost={isMember}
            emptyMessage="No posts yet"
            emptySubtext="This organization hasn't posted anything yet."
          />
        )}
        {activeTab === 'events' && <ParishEvents orgId={id} />}
        {activeTab === 'about' && <OrgAbout org={org} parentOrg={parentOrg} />}
        {activeTab === 'chapters' && <ChaptersTab chapters={chapters} />}
      </div>
    </div>
  )
}

// ── ChaptersTab ────────────────────────────────────────────
function ChaptersTab({ chapters }) {
  if (chapters.length === 0) {
    return (
      <div className="px-4 pt-8 text-center">
        <BuildingOffice2Icon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-navy font-semibold">No chapters yet</p>
        <p className="text-gray-500 text-sm mt-1">Local chapters will appear here once approved.</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{chapters.length} Chapter{chapters.length !== 1 ? 's' : ''}</p>
      {chapters.map(chapter => (
        <Link
          key={chapter.id}
          to={`/organizations/${chapter.id}`}
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 hover:shadow-md transition-shadow group"
        >
          <div className="w-9 h-9 bg-navy/5 rounded-xl flex items-center justify-center flex-shrink-0">
            <BuildingOffice2Icon className="w-5 h-5 text-navy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy group-hover:underline truncate">{chapter.name}</p>
            {(chapter.city || chapter.state) && (
              <p className="text-xs text-gray-500">{[chapter.city, chapter.state].filter(Boolean).join(', ')}</p>
            )}
          </div>
          <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
        </Link>
      ))}
    </div>
  )
}

// ── OrgAbout ───────────────────────────────────────────────
// Published announcements from the org's admins (newest first)
function OrgAnnouncements({ orgId }) {
  const [items, setItems] = useState([])
  useEffect(() => {
    let cancelled = false
    supabase.from('org_announcements')
      .select('id, title, content, published_at, created_at')
      .eq('org_id', orgId).eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(5)
      .then(({ data }) => { if (!cancelled) setItems(data ?? []) })
    return () => { cancelled = true }
  }, [orgId])
  if (!items.length) return null
  return (
    <div className="px-4 pt-4 space-y-3">
      {items.map(a => (
        <div key={a.id} className="bg-gold/10 border border-gold/30 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gold mb-1">📢 Announcement · {formatRelativeTime(a.published_at || a.created_at)}</p>
          {a.title && <p className="font-semibold text-navy text-sm mb-1">{a.title}</p>}
          <p className="text-sm text-gray-700 whitespace-pre-line">{a.content}</p>
        </div>
      ))}
    </div>
  )
}

function OrgAbout({ org, parentOrg }) {
  return (
    <div className="px-4 pt-4 space-y-4 pb-8">
      {/* Parent org card for chapters */}
      {org.org_type === 'chapter' && parentOrg && (
        <Link
          to={`/organizations/${parentOrg.id}`}
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 hover:shadow-md transition-shadow group"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <BuildingOffice2Icon className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wide mb-0.5">National Organization</p>
            <p className="text-sm font-semibold text-navy group-hover:underline truncate">{parentOrg.name}</p>
            {(parentOrg.city || parentOrg.state) && (
              <p className="text-xs text-gray-500">{[parentOrg.city, parentOrg.state].filter(Boolean).join(', ')}</p>
            )}
          </div>
          <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
        </Link>
      )}

      {org.description && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-bold text-navy text-sm mb-2">About</h2>
          <p className="text-sm text-gray-700 whitespace-pre-line">{org.description}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-navy px-4 py-3">
          <h2 className="text-white font-bold text-sm">Contact & Info</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {(org.address || org.city || org.state) && (() => {
            const line = [org.address, org.city, [org.state, org.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
            return (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(line)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-lightbg transition-colors">
                <MapPinIcon className="w-5 h-5 text-navy flex-shrink-0" />
                <span className="text-sm text-navy">{line}</span>
              </a>
            )
          })()}
          {org.hours && typeof org.hours === 'object' && Object.values(org.hours).some(Boolean) && (
            <div className="flex items-start gap-3 px-4 py-3.5">
              <ClockIcon className="w-5 h-5 text-navy flex-shrink-0 mt-0.5" />
              <div className="text-sm text-navy space-y-0.5">
                {Object.entries(org.hours).filter(([, v]) => v).map(([day, v]) => (
                  <p key={day}><span className="text-gray-500">{day}:</span> {v}</p>
                ))}
              </div>
            </div>
          )}
          {org.website && (
            <a
              href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-lightbg transition-colors"
            >
              <GlobeAltIcon className="w-5 h-5 text-navy flex-shrink-0" />
              <span className="text-sm text-navy truncate">{org.website}</span>
            </a>
          )}
          {org.email && (
            <a href={`mailto:${org.email}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-lightbg transition-colors"
            >
              <EnvelopeIcon className="w-5 h-5 text-navy flex-shrink-0" />
              <span className="text-sm text-navy">{org.email}</span>
            </a>
          )}
          {org.phone && (
            <a href={`tel:${org.phone}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-lightbg transition-colors"
            >
              <PhoneIcon className="w-5 h-5 text-navy flex-shrink-0" />
              <span className="text-sm text-navy">{org.phone}</span>
            </a>
          )}
        </div>
      </div>

      {/* Only for listed-but-unclaimed orgs (imported, no creator/admin) */}
      {!org.is_official && !org.created_by && (
        <div className="bg-navy/5 border border-navy/10 rounded-2xl p-4">
          <p className="text-navy text-sm font-semibold mb-1">Is this your organization?</p>
          <p className="text-gray-500 text-xs">
            Contact us to set up your official page and manage announcements, events, and more.
          </p>
        </div>
      )}
    </div>
  )
}

// ── OrgContactModal ────────────────────────────────────────
function OrgContactModal({ org, onClose }) {
  const { user, profile } = useAuth()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!body.trim() || !user) return
    setSending(true)
    // Message the org's current admins (the creator may have stepped down)
    const { data: admins } = await supabase.rpc('org_admin_ids', { p_org_id: org.id })
    const recipients = (admins ?? []).map(r => r.user_id).filter(id => id && id !== user.id)
    if (!recipients.length) {
      toast.error('This organization has no admin to contact yet.')
      setSending(false)
      return
    }
    const content = subject.trim() ? `[${subject.trim()}]\n\n${body.trim()}` : body.trim()
    const { error } = await supabase.from('direct_messages').insert(
      recipients.map(id => ({ sender_id: user.id, recipient_id: id, content, org_id: org.id }))
    )
    if (!error) {
      recipients.forEach(id => createNotification({
        userId: id,
        type: 'direct_message',
        referenceId: user.id,
        message: `${profile?.full_name || 'Someone'} sent ${org.name} a message`,
        actorId: user.id,
      }))
    }
    if (error) {
      toast.error('Could not send message. Please try again.')
    } else {
      toast.success('Message sent.')
      onClose()
    }
    setSending(false)
  }

  return (
    <Modal isOpen onClose={onClose} title={`Contact ${org.name}`}>
      {profile?.full_name && (
          <p className="text-xs text-gray-500 mb-4">Sent as {profile.full_name}.</p>
        )}
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:border-navy"
        />
        <textarea
            maxLength={1800}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Your message…"
          rows={5}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy"
        />
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !body.trim() || !org.created_by}
            className="px-5 py-2 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy/90 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
    </Modal>
  )
}
