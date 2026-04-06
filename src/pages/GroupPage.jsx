import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  UserGroupIcon,
  LockClosedIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { format, isPast, isSameDay } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup, useGroupMembers, useGroupJoin, useGroupMemberships } from '../hooks/useGroups'
import { GroupAvatar } from '../components/groups/GroupCard'
import { GroupPageSkeleton } from '../components/shared/skeletons'
import Feed from '../components/feed/Feed'
import Modal from '../components/shared/Modal'

const TABS = [
  { id: 'feed',    label: 'tab_feed' },
  { id: 'events',  label: 'tab_events' },
  { id: 'members', label: 'tab_members' },
  { id: 'about',   label: 'tab_about' },
]

export default function GroupPage() {
  const { t } = useTranslation('groups')
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('feed')
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { group, loading, error, refresh: refreshGroup } = useGroup(id)
  const { members, loading: membersLoading, refresh: refreshMembers } = useGroupMembers(id)
  const { memberships, memberGroupIds, adminGroupIds, refresh: refreshMemberships } = useGroupMemberships()
  const { joinGroup, leaveGroup, requestToJoin, approveRequest, denyRequest, hasRequested, pendingRequests, loadPendingRequests } = useGroupJoin()

  const isMember = memberGroupIds.has(id)
  const isAdmin = adminGroupIds.has(id)
  const requested = hasRequested(id)

  // Load pending requests when admin views members tab
  function handleTabChange(tabId) {
    setActiveTab(tabId)
    if (tabId === 'members' && isAdmin) {
      loadPendingRequests(adminGroupIds)
    }
  }

  async function handleJoin() {
    if (group.is_private) {
      await requestToJoin(id, group.name)
    } else {
      await joinGroup(id, () => {
        refreshMemberships()
        refreshGroup()
      })
    }
  }

  async function handleLeave() {
    await leaveGroup(id, adminGroupIds, () => {
      refreshMemberships()
      refreshGroup()
      setLeaveOpen(false)
    })
    setLeaveOpen(false)
  }

  async function handleDelete() {
    await supabase.from('groups').delete().eq('id', id)
    setDeleteOpen(false)
    navigate('/groups')
  }

  async function handleApprove(req) {
    await approveRequest(req.id, req.user.id, id, group.name, () => {
      refreshMembers()
      refreshGroup()
    })
  }

  async function handleDeny(req) {
    await denyRequest(req.id, req.user.id, id, group.name)
  }

  if (loading) return <GroupPageSkeleton />

  if (error || !group) {
    return (
      <div className="min-h-screen bg-cream md:pl-60 flex items-center justify-center p-8">
        <div className="text-center">
          <UserGroupIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-navy mb-1">{t('group_not_found')}</p>
          <Link to="/groups" className="text-navy text-sm font-semibold hover:underline">
            ← {t('title')}
          </Link>
        </div>
      </div>
    )
  }

  document.title = `${group.name} | Parish App`

  const memberCount = group.member_count ?? group.group_members?.[0]?.count ?? 0
  const memberLabel = memberCount === 1
    ? t('member_count_one', { count: 1 })
    : t('member_count_other', { count: memberCount })

  const myPending = pendingRequests.filter(r => r.group_id === id)

  return (
    <div className="min-h-screen bg-cream md:pl-60">

      {/* ── Header ── */}
      <div className="bg-navy relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 text-white/70 hover:text-white p-1 flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{t('title')}</span>
        </button>

        {isAdmin && (
          <Link
            to={`/group/${id}/settings`}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </Link>
        )}

        <div className="px-4 pt-14 pb-5 max-w-3xl mx-auto flex flex-col items-center text-center">
          <GroupAvatar group={group} size={64} />

          <h1 className="text-white font-bold text-xl mt-3 leading-snug">{group.name}</h1>

          <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
            <span className="text-xs bg-white/15 text-white rounded-full px-2.5 py-0.5">
              {t(`category_${group.category}`)}
            </span>
            {group.is_private && (
              <span className="flex items-center gap-1 text-xs text-white/70">
                <LockClosedIcon className="w-3 h-3" />
                {t('private')}
              </span>
            )}
          </div>

          <p className="text-gray-300 text-xs mt-1.5">{memberLabel}</p>
          {group.parish && (
            <Link
              to={`/parish/${group.parish.id}`}
              className="text-gold text-xs mt-0.5 hover:underline"
            >
              {group.parish.name}
            </Link>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex gap-2 flex-wrap justify-center">
            {isMember ? (
              <button
                onClick={() => setLeaveOpen(true)}
                className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors"
              >
                <CheckIcon className="w-4 h-4" />
                {t('joined')}
              </button>
            ) : requested ? (
              <button
                disabled
                className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-white/10 text-white/50 cursor-not-allowed"
              >
                {t('request_sent')}
              </button>
            ) : (
              <button
                onClick={handleJoin}
                className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-gold text-navy hover:bg-gold/90 transition-colors"
              >
                {group.is_private ? t('request') : t('join')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors relative ${
                activeTab === tab.id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t(tab.label)}
              {tab.id === 'members' && isAdmin && myPending.length > 0 && (
                <span className="absolute top-2 right-3 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-3xl mx-auto pb-24 md:pb-8">
        {activeTab === 'feed' && (
          <Feed
            groupId={id}
            showCreatePost={isMember}
            emptyMessage={t('empty')}
            emptySubtext="Be the first to post in this group."
          />
        )}

        {activeTab === 'events' && <GroupEvents groupId={id} t={t} />}

        {activeTab === 'members' && (
          <GroupMembers
            members={members}
            loading={membersLoading}
            pendingRequests={myPending}
            isAdmin={isAdmin}
            currentUserId={user?.id}
            groupId={id}
            onApprove={handleApprove}
            onDeny={handleDeny}
            onRefresh={() => { refreshMembers(); refreshMemberships() }}
            t={t}
          />
        )}

        {activeTab === 'about' && (
          <GroupAbout
            group={group}
            isAdmin={isAdmin}
            onDeleteClick={() => setDeleteOpen(true)}
            t={t}
          />
        )}
      </div>

      {/* ── Leave modal ── */}
      <Modal isOpen={leaveOpen} onClose={() => setLeaveOpen(false)} title={t('leave')} size="sm">
        <p className="text-sm text-gray-600 mb-5">{t('leave_confirm', { name: group.name })}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setLeaveOpen(false)}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLeave}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600"
          >
            {t('leave')}
          </button>
        </div>
      </Modal>

      {/* ── Delete modal ── */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title={t('delete_group')} size="sm">
        <p className="text-sm text-gray-600 mb-5">{t('delete_confirm', { name: group.name })}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteOpen(false)}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600"
          >
            {t('delete_group')}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── GroupEvents ────────────────────────────────────────────
function GroupEvents({ groupId, t }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    if (!groupId) return
    supabase
      .from('events')
      .select('id, title, description, start_time, end_time, location, rsvp_count')
      .eq('group_id', groupId)
      .order('start_time', { ascending: true })
      .then(({ data }) => {
        setEvents(data ?? [])
        setLoading(false)
      })
  }, [groupId])

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />
        ))}
      </div>
    )
  }

  const upcoming = events.filter(e => !isPast(new Date(e.start_time)))
  const past = events.filter(e => isPast(new Date(e.start_time)))
  const displayed = showPast ? past : upcoming

  if (events.length === 0) {
    return (
      <div className="px-4 pt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <CalendarDaysIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-navy text-sm">{t('no_events')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-3">
      {past.length > 0 && (
        <div className="flex bg-lightbg rounded-xl p-0.5 w-fit">
          <button
            onClick={() => setShowPast(false)}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${!showPast ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            onClick={() => setShowPast(true)}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${showPast ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}
          >
            Past ({past.length})
          </button>
        </div>
      )}
      {displayed.map(event => <GroupEventCard key={event.id} event={event} />)}
    </div>
  )
}

function GroupEventCard({ event }) {
  const start = new Date(event.start_time)
  const end = event.end_time ? new Date(event.end_time) : null
  const past = isPast(start)

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${past ? 'opacity-60' : ''}`}>
      <div className="flex">
        <div className="bg-navy w-16 flex-shrink-0 flex flex-col items-center justify-center py-4">
          <p className="text-gold text-xs font-bold uppercase tracking-wider">{format(start, 'MMM')}</p>
          <p className="text-white font-bold text-2xl leading-none">{format(start, 'd')}</p>
          <p className="text-gray-300 text-xs">{format(start, 'EEE')}</p>
        </div>
        <div className="flex-1 px-4 py-3 min-w-0">
          <p className="font-bold text-navy text-sm leading-snug">{event.title}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
              {format(start, 'h:mm a')}
              {end && !isSameDay(start, end) ? ` – ${format(end, 'MMM d')}` : end ? ` – ${format(end, 'h:mm a')}` : ''}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 text-xs text-gray-500 truncate">
                <MapPinIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{event.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── GroupMembers ───────────────────────────────────────────
function GroupMembers({ members, loading, pendingRequests, isAdmin, currentUserId, groupId, onApprove, onDeny, onRefresh, t }) {
  const [openMenuId, setOpenMenuId] = useState(null)

  async function handlePromote(userId) {
    await supabase
      .from('group_members')
      .update({ role: 'moderator' })
      .eq('group_id', groupId)
      .eq('user_id', userId)
    setOpenMenuId(null)
    onRefresh()
  }

  async function handleRemove(userId) {
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)
    setOpenMenuId(null)
    onRefresh()
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl h-14 animate-pulse border border-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      {/* Pending requests (admin only) */}
      {isAdmin && pendingRequests.length > 0 && (
        <section>
          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-2">
            {t('pending_requests')} ({pendingRequests.length})
          </p>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-white rounded-xl border border-amber-100 shadow-sm p-3 flex items-center gap-3">
                {req.user.avatar_url ? (
                  <img src={req.user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-navy font-bold text-sm">{req.user.full_name?.[0] ?? '?'}</span>
                  </div>
                )}
                <p className="flex-1 text-sm font-semibold text-navy truncate">{req.user.full_name}</p>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => onDeny(req)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    {t('deny')}
                  </button>
                  <button
                    onClick={() => onApprove(req)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold text-navy hover:bg-gold/90"
                  >
                    {t('approve')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Member list */}
      <section>
        <p className="text-xs font-bold text-gold uppercase tracking-widest mb-2">
          {t('tab_members')} ({members.length})
        </p>
        {members.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <UserGroupIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{t('no_members')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(member => {
              const profile = member.profiles
              const isMe = profile?.id === currentUserId
              return (
                <div key={member.user_id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-navy font-bold text-sm">{profile?.full_name?.[0] ?? '?'}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">
                      {profile?.full_name ?? 'Unknown'}
                      {isMe && <span className="text-gray-400 font-normal"> (you)</span>}
                    </p>
                    {member.role !== 'member' && (
                      <p className="text-xs text-gold font-semibold">{t(`role_${member.role}`)}</p>
                    )}
                  </div>

                  {/* Admin menu (can't act on yourself or other admins) */}
                  {isAdmin && !isMe && member.role !== 'admin' && (
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === member.user_id ? null : member.user_id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                      </button>
                      {openMenuId === member.user_id && (
                        <div className="absolute right-0 top-7 bg-white border border-gray-100 rounded-xl shadow-lg z-10 min-w-40 overflow-hidden">
                          {member.role === 'member' && (
                            <button
                              onClick={() => handlePromote(member.user_id)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-navy hover:bg-lightbg transition-colors"
                            >
                              <ShieldCheckIcon className="w-4 h-4 text-gold" />
                              {t('promote_moderator')}
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(member.user_id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <UserMinusIcon className="w-4 h-4" />
                            {t('remove_member')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

// ── GroupAbout ─────────────────────────────────────────────
function GroupAbout({ group, isAdmin, onDeleteClick, t }) {
  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      {/* Description */}
      {group.description && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-bold text-gold uppercase tracking-widest mb-2">About</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{group.description}</p>
        </div>
      )}

      {/* Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-navy px-4 py-3">
          <h2 className="text-white font-bold text-sm">Details</h2>
        </div>
        <div className="divide-y divide-gray-50">
          <DetailRow label={t('about_category')} value={t(`category_${group.category}`)} />
          <DetailRow
            label={t('about_privacy')}
            value={group.is_private ? t('private') : t('public')}
          />
          {group.parish && (
            <DetailRow
              label={t('about_parish')}
              value={
                <Link to={`/parish/${group.parish.id}`} className="text-navy font-semibold hover:underline">
                  {group.parish.name}
                </Link>
              }
            />
          )}
          {group.creator && (
            <DetailRow label={t('about_creator')} value={group.creator.full_name} />
          )}
          {group.created_at && (
            <DetailRow label={t('about_created')} value={format(new Date(group.created_at), 'MMMM d, yyyy')} />
          )}
        </div>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="space-y-2">
          <Link
            to={`/group/${group.id}/settings`}
            className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-sm font-semibold text-navy hover:bg-lightbg transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
            {t('settings')}
          </Link>
          <button
            onClick={onDeleteClick}
            className="w-full flex items-center gap-3 bg-white rounded-xl border border-red-100 shadow-sm px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
            {t('delete_group')}
          </button>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-xs font-semibold text-gray-500 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-navy flex-1">{value}</span>
    </div>
  )
}
