import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  BuildingLibraryIcon,
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  XMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../hooks/useAuth.jsx'
import { useAdminAccess } from '../hooks/useAdminAccess'
import { useParish } from '../hooks/useParish.js'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'
import Feed from '../components/feed/Feed'
import ParishPageSkeleton from '../components/shared/skeletons/ParishPageSkeleton'
import ParishEvents from '../components/parish/ParishEvents'
import ParishGroups from '../components/parish/ParishGroups'
import { format, isPast } from 'date-fns'

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'events', label: 'Events' },
  { id: 'groups', label: 'Groups' },
  { id: 'about', label: 'About' },
]

export default function ParishPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { parishAdminRecords } = useAdminAccess()
  const [activeTab, setActiveTab] = useState('feed')
  const [showContact, setShowContact] = useState(false)

  // Check if the current user admins THIS specific parish
  const adminRecord = parishAdminRecords.find(r => r.parish_id === id)
  const adminRole = adminRecord?.role ?? null

  const {
    parish,
    loading,
    error,
    followerCount,
    isFollowing,
    isMyParish,
    followLoading,
    follow,
    setAsMyParish,
    unsetMyParish,
  } = useParish(id)

  // Must be before early returns — hooks cannot come after conditional returns
  useEffect(() => {
    if (parish?.name) document.title = `${parish.name} | Communio`
  }, [parish?.name])

  if (loading) return <ParishPageSkeleton />

  if (error || !parish) {
    return (
      <div className="min-h-screen bg-cream md:pl-60 flex items-center justify-center p-8">
        <div className="text-center">
          <BuildingLibraryIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-navy mb-1">Parish not found</p>
          <p className="text-gray-400 text-sm mb-4">This parish may have been removed.</p>
          <Link to="/directory" className="text-navy text-sm font-semibold hover:underline">
            ← Back to directory
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">

      {/* ── Header ── */}
      <div className="bg-navy relative">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 text-white/70 hover:text-white p-1 flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Directory</span>
        </button>

        <div className="px-4 pt-14 pb-5 max-w-3xl mx-auto">
          {/* Parish icon + name */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <BuildingLibraryIcon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <h1 className="text-white font-bold text-lg leading-snug">{parish.name}</h1>
                {parish.is_official && (
                  <CheckBadgeIcon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" title="Official Parish Page" />
                )}
              </div>
              <p className="text-gray-300 text-sm mt-0.5">
                {[parish.city, parish.state].filter(Boolean).join(', ')}
                {parish.diocese ? ` · ${parish.diocese}` : ''}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {followerCount.toLocaleString()} parishioner{followerCount !== 1 ? 's' : ''} here
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {adminRole && (
              <Link
                to={`/parish-admin/${id}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-gold text-navy rounded-xl text-sm font-semibold hover:bg-gold/90 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                Manage Parish
              </Link>
            )}

            <button
              onClick={follow}
              disabled={followLoading}
              className={`flex-1 sm:flex-none text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 ${
                isFollowing || isMyParish
                  ? 'bg-white/20 text-white hover:bg-red-500/80'
                  : 'bg-gold text-navy hover:bg-gold/90'
              }`}
            >
              {followLoading ? '…' : isFollowing || isMyParish ? 'Unfollow' : 'Follow Parish'}
            </button>

            {!isMyParish && isFollowing && (
              <button
                onClick={setAsMyParish}
                className="flex-1 sm:flex-none text-sm font-semibold px-5 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                Set as my parish
              </button>
            )}

            {!isFollowing && !isMyParish && (
              <button
                onClick={setAsMyParish}
                className="flex-1 sm:flex-none text-sm font-semibold px-5 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                Set as my parish
              </button>
            )}

            {isMyParish && (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1.5 text-sm text-gold font-semibold px-1 py-2.5">
                  <CheckBadgeIcon className="w-4 h-4" />
                  Your parish
                </span>
                <button
                  onClick={unsetMyParish}
                  className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 px-2 py-1.5 rounded-lg transition-colors"
                  title="Remove as my parish"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            )}

            <button
              onClick={() => setShowContact(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <EnvelopeIcon className="w-4 h-4" />
              Contact
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contact modal ── */}
      {showContact && (
        <ContactModal
          parishId={id}
          parishName={parish.name}
          onClose={() => setShowContact(false)}
        />
      )}

      {/* ── Tab content ── */}
      <div className="max-w-3xl mx-auto pb-24 md:pb-8">
        {activeTab === 'feed' && (
          <Feed
            parishId={id}
            showCreatePost={isFollowing || isMyParish}
            emptyMessage="No posts yet"
            emptySubtext="This parish hasn't posted anything yet."
          />
        )}

        {activeTab === 'events' && <ParishEvents parishId={id} />}
        {activeTab === 'groups' && <ParishGroups parishId={id} />}
        {activeTab === 'about' && <ParishAbout parish={parish} />}
      </div>
    </div>
  )
}

// ── Contact Parish Modal ────────────────────────────────────
function ContactModal({ parishId, parishName, onClose }) {
  const { user, profile } = useAuth()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!body.trim() || !user) return
    setSending(true)
    const { error } = await supabase.from('parish_messages').insert({
      parish_id: parishId,
      sender_id: user.id,
      subject: subject.trim() || null,
      body: body.trim(),
    })
    if (error) {
      toast.error('Could not send message. Please try again.')
    } else {
      toast.success('Message sent to parish.')
      onClose()
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy">Contact {parishName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Your message will be sent to the parish admin inbox.
          {profile?.full_name && ` Sent as ${profile.full_name}.`}
        </p>
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
            disabled={sending || !body.trim()}
            className="px-5 py-2 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy/90 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── About tab ──────────────────────────────────────────────
function ParishAbout({ parish }) {
  const hasContact = parish.address || parish.phone || parish.website || parish.email
  const isIrsBmf   = parish.data_source === 'irs_bmf'

  return (
    <div className="px-4 pt-4 space-y-4 pb-8">

      {/* IRS BMF data quality note */}
      {isIrsBmf && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-lg leading-none flex-shrink-0 mt-0.5">ℹ</span>
          <div>
            <p className="text-amber-800 text-sm font-semibold leading-snug">
              Limited information available
            </p>
            <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
              This parish listing comes from public IRS records. Phone, website, and Mass times may not be listed yet.{' '}
              {parish.website ? null : 'Know the details? '}
            </p>
            {!parish.website && !parish.phone && (
              <p className="text-amber-700 text-xs mt-0.5">
                Help us improve — <a href="mailto:hello@communio.app" className="underline font-semibold">send a correction</a>.
              </p>
            )}
          </div>
        </div>
      )}

      {hasContact && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-navy px-4 py-3">
            <h2 className="text-white font-bold text-sm">Contact & Location</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {parish.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  `${parish.address}, ${parish.city}, ${parish.state} ${parish.zip}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-lightbg transition-colors"
              >
                <MapPinIcon className="w-5 h-5 text-navy flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-navy">{parish.address}</p>
                  <p className="text-xs text-gray-500">
                    {parish.city}, {parish.state} {parish.zip}
                  </p>
                  <p className="text-xs text-navy font-medium mt-0.5">Open in Maps →</p>
                </div>
              </a>
            )}
            {parish.phone && (
              <a
                href={`tel:${parish.phone}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-lightbg transition-colors"
              >
                <PhoneIcon className="w-5 h-5 text-navy flex-shrink-0" />
                <span className="text-sm text-navy">{parish.phone}</span>
              </a>
            )}
            {parish.website && (
              <a
                href={parish.website.startsWith('http') ? parish.website : `https://${parish.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-lightbg transition-colors"
              >
                <GlobeAltIcon className="w-5 h-5 text-navy flex-shrink-0" />
                <span className="text-sm text-navy truncate">{parish.website}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Mass Times */}
      {parish.mass_times ? (
        <MassTimes massTimes={parish.mass_times} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-gray-400 text-sm">Mass times not listed.</p>
          {parish.website && (
            <a
              href={parish.website.startsWith('http') ? parish.website : `https://${parish.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-navy text-sm font-semibold hover:underline mt-1 inline-block"
            >
              Visit parish website →
            </a>
          )}
        </div>
      )}

      {/* B2B prompt */}
      {!parish.is_official && (
        <div className="bg-navy/5 border border-navy/10 rounded-2xl p-4">
          <p className="text-navy text-sm font-semibold mb-1">Is this your parish?</p>
          <p className="text-gray-500 text-xs">
            Contact us to set up your official page and manage announcements, events, and more.
          </p>
        </div>
      )}
    </div>
  )
}

function MassTimes({ massTimes }) {
  // massTimes can be a string, an array, or an object
  const renderContent = () => {
    if (typeof massTimes === 'string') {
      return <p className="text-sm text-navy whitespace-pre-line">{massTimes}</p>
    }
    if (Array.isArray(massTimes)) {
      return (
        <ul className="space-y-1.5">
          {massTimes.map((t, i) => (
            <li key={i} className="text-sm text-navy flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
              {typeof t === 'string' ? t : JSON.stringify(t)}
            </li>
          ))}
        </ul>
      )
    }
    if (typeof massTimes === 'object') {
      return (
        <dl className="space-y-2">
          {Object.entries(massTimes).map(([day, time]) => (
            <div key={day} className="flex items-start gap-3">
              <dt className="text-xs font-semibold text-gray-500 uppercase w-24 flex-shrink-0 pt-0.5">
                {day}
              </dt>
              <dd className="text-sm text-navy">{String(time)}</dd>
            </div>
          ))}
        </dl>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-navy px-4 py-3">
        <h2 className="text-white font-bold text-sm">Mass Times</h2>
      </div>
      <div className="p-4">{renderContent()}</div>
    </div>
  )
}
