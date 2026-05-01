import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  UserGroupIcon,
  XMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'
import Feed from '../components/feed/Feed'

// ── useOrganization ────────────────────────────────────────
function useOrganization(orgId) {
  const { user } = useAuth()
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [memberCount, setMemberCount] = useState(0)
  const [isMember, setIsMember] = useState(false)
  const [myRole, setMyRole] = useState(null)
  const [joinLoading, setJoinLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

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
      supabase.from('organization_members').select('user_id', { count: 'exact', head: true }).eq('org_id', orgId),
      memberCheck,
      supabase.from('org_subscriptions').select('status').eq('org_id', orgId).maybeSingle(),
    ]).then(([orgRes, countRes, memberRes, subRes]) => {
      if (cancelled) return
      if (orgRes.error) setError(orgRes.error.message)
      else setOrg(orgRes.data)
      setMemberCount(countRes.count ?? 0)
      setIsMember(!!memberRes.data)
      setMyRole(memberRes.data?.role ?? null)
      setIsSubscribed(['trialing', 'active'].includes(subRes.data?.status))
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
      if (err) toast.error('Could not leave organization.')
      else { setIsMember(false); setMyRole(null); setMemberCount(c => Math.max(0, c - 1)) }
    } else {
      const { error: err } = await supabase.from('organization_members')
        .insert({ org_id: orgId, user_id: user.id })
      if (err) toast.error('Could not join organization.')
      else { setIsMember(true); setMyRole('member'); setMemberCount(c => c + 1) }
    }
    setJoinLoading(false)
  }, [user?.id, orgId, isMember, joinLoading])

  return { org, loading, error, memberCount, isMember, myRole, joinLoading, join, isSubscribed }
}

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'about', label: 'About' },
]

export default function OrganizationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('feed')
  const [showContact, setShowContact] = useState(false)
  const { org, loading, error, memberCount, isMember, myRole, joinLoading, join, isSubscribed } = useOrganization(id)

  useEffect(() => {
    if (org) document.title = `${org.name} | Communio`
    else document.title = 'Organization | Communio'
  }, [org?.name])

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
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <BuildingOffice2Icon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <h1 className="text-white font-bold text-lg leading-snug">{org.name}</h1>
                {org.is_official && (
                  <CheckBadgeIcon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" title="Official Page" />
                )}
              </div>
              {isSubscribed && (
                <span className="inline-flex items-center gap-1 text-xs bg-gold/20 text-gold border border-gold/30 rounded-full px-2 py-0.5 font-semibold mt-1">
                  ✓ Communio Member
                </span>
              )}
              {org.category && (
                <span className="inline-block text-[10px] font-semibold text-white/60 bg-white/10 px-2 py-0.5 rounded-full mt-0.5 capitalize">
                  {org.category}
                </span>
              )}
              {(org.city || org.state) && (
                <p className="text-gray-300 text-sm mt-0.5">
                  {[org.city, org.state].filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-gray-400 text-xs mt-1">
                {memberCount.toLocaleString()} member{memberCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={join}
              disabled={joinLoading}
              className={`flex-1 sm:flex-none text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 ${
                isMember
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-gold text-navy hover:bg-gold/90'
              }`}
            >
              {joinLoading ? '…' : isMember ? 'Member' : 'Join'}
            </button>

            {(org.email || org.phone) && (
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
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-navy text-navy' : 'border-transparent text-gray-400 hover:text-gray-600'
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
        {activeTab === 'feed' && (
          <Feed
            orgId={id}
            showCreatePost={isMember}
            emptyMessage="No posts yet"
            emptySubtext="This organization hasn't posted anything yet."
          />
        )}
        {activeTab === 'about' && <OrgAbout org={org} />}
      </div>
    </div>
  )
}

// ── OrgAbout ───────────────────────────────────────────────
function OrgAbout({ org }) {
  return (
    <div className="px-4 pt-4 space-y-4 pb-8">
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
          {(org.city || org.state) && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <MapPinIcon className="w-5 h-5 text-navy flex-shrink-0" />
              <span className="text-sm text-navy">{[org.city, org.state].filter(Boolean).join(', ')}</span>
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

      {!org.is_official && (
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
    // For now, send as a direct message to the org (org admin will see it via DMs)
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      recipient_id: org.created_by,
      content: subject.trim() ? `[${subject.trim()}]\n\n${body.trim()}` : body.trim(),
      org_id: org.id,
    })
    if (error) {
      toast.error('Could not send message. Please try again.')
    } else {
      toast.success('Message sent.')
      onClose()
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy">Contact {org.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
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
      </div>
    </div>
  )
}
