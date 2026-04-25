import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChartBarIcon,
  MegaphoneIcon,
  CalendarDaysIcon,
  ClockIcon,
  UsersIcon,
  Cog6ToothIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'
import { format, parseISO } from 'date-fns'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const TABS = [
  { id: 'dashboard',     label: 'Dashboard',    Icon: ChartBarIcon },
  { id: 'announcements', label: 'Announcements', Icon: MegaphoneIcon },
  { id: 'events',        label: 'Events',        Icon: CalendarDaysIcon },
  { id: 'masstimes',     label: 'Mass Times',    Icon: ClockIcon },
  { id: 'parishioners',  label: 'Parishioners',  Icon: UsersIcon },
  { id: 'settings',      label: 'Settings',      Icon: Cog6ToothIcon },
]

// ── Access guard ────────────────────────────────────────────
async function checkAccess(parishId, userId) {
  const { data } = await supabase
    .from('parish_admins')
    .select('role')
    .eq('parish_id', parishId)
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export default function ParishAdminPage() {
  const { parishId } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [parish, setParish] = useState(null)
  const [adminRole, setAdminRole] = useState(null)
  const [loading, setLoading] = useState(true)

  document.title = 'Parish Admin | Communio'

  useEffect(() => {
    if (!user) return
    async function init() {
      // App-level admins bypass parish_admins check
      if (!isAdmin) {
        const access = await checkAccess(parishId, user.id)
        if (!access) { navigate('/', { replace: true }); return }
        setAdminRole(access.role)
      } else {
        setAdminRole('admin')
      }
      const { data } = await supabase
        .from('parishes')
        .select('*')
        .eq('id', parishId)
        .single()
      if (!data) { navigate('/', { replace: true }); return }
      setParish(data)
      setLoading(false)
    }
    init()
  }, [parishId, user, isAdmin, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream md:pl-60 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const ActivePanel = {
    dashboard:     DashboardTab,
    announcements: AnnouncementsTab,
    events:        EventsTab,
    masstimes:     MassTimesTab,
    parishioners:  ParishionersTab,
    settings:      SettingsTab,
  }[activeTab]

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      {/* ── Header ── */}
      <div className="bg-navy px-4 pt-5 pb-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link to={`/parish/${parishId}`} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-gold text-xs font-semibold uppercase tracking-widest">Parish Admin</p>
              <h1 className="text-white font-bold text-lg leading-tight">{parish?.name}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-gray-100 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex min-w-max">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <ActivePanel parishId={parishId} parish={parish} setParish={setParish} adminRole={adminRole} />
      </div>
    </div>
  )
}

// ── Dashboard Tab ───────────────────────────────────────────
function DashboardTab({ parishId }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [followRes, postRes, eventRes, msgRes] = await Promise.all([
        supabase.from('parish_follows').select('id', { count: 'exact', head: true }).eq('parish_id', parishId),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('parish_id', parishId).is('deleted_at', null),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('parish_id', parishId),
        supabase.from('parish_messages').select('id', { count: 'exact', head: true }).eq('parish_id', parishId).eq('is_read', false),
      ])
      setStats({
        followers: followRes.count ?? 0,
        posts: postRes.count ?? 0,
        events: eventRes.count ?? 0,
        unreadMessages: msgRes.count ?? 0,
      })
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [parishId])

  // Recent posts with engagement
  const [recentPosts, setRecentPosts] = useState([])
  useEffect(() => {
    supabase.from('posts')
      .select('id, content, created_at, like_count, comment_count')
      .eq('parish_id', parishId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentPosts(data ?? []))
  }, [parishId])

  if (loading) return <LoadingSpinner />

  const statCards = [
    { label: 'Parishioners', value: stats.followers, color: 'bg-navy' },
    { label: 'Posts', value: stats.posts, color: 'bg-gold' },
    { label: 'Events', value: stats.events, color: 'bg-green-600' },
    { label: 'Unread Messages', value: stats.unreadMessages, color: 'bg-red-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-2xl font-bold text-navy">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            <div className={`h-1 ${color} rounded-full mt-3 opacity-70`} style={{ width: '40%' }} />
          </div>
        ))}
      </div>

      {/* Recent posts */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-navy text-sm">Recent Posts</h2>
          <Link to={`/parish/${parishId}`} className="text-xs text-gold font-semibold hover:underline">View feed →</Link>
        </div>
        {recentPosts.length === 0 ? (
          <p className="text-gray-400 text-sm p-4">No posts yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentPosts.map(post => (
              <div key={post.id} className="px-4 py-3">
                <p className="text-sm text-navy line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-xs text-gray-400">{format(parseISO(post.created_at), 'MMM d, yyyy')}</span>
                  <span className="text-xs text-gray-500">♥ {post.like_count ?? 0}</span>
                  <span className="text-xs text-gray-500">💬 {post.comment_count ?? 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Announcements Tab ───────────────────────────────────────
function AnnouncementsTab({ parishId }) {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [scheduleFor, setScheduleFor] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('scheduled_posts')
      .select('id, content, scheduled_for, published, created_at')
      .eq('parish_id', parishId)
      .order('scheduled_for', { ascending: false })
      .limit(20)
    setPosts(data ?? [])
    setLoading(false)
  }, [parishId])

  useEffect(() => { load() }, [load])

  async function handlePublish() {
    if (!draft.trim() || !user) return
    setSaving(true)
    const payload = {
      parish_id: parishId,
      author_id: user.id,
      content: draft.trim(),
      published: !scheduleFor,
      scheduled_for: scheduleFor || new Date().toISOString(),
    }
    const { error } = await supabase.from('scheduled_posts').insert(payload)
    if (error) {
      toast.error('Could not save announcement.')
    } else {
      toast.success(scheduleFor ? 'Announcement scheduled.' : 'Announcement published.')
      setDraft('')
      setScheduleFor('')
      setComposing(false)
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('scheduled_posts').delete().eq('id', id)
    if (error) { toast.error('Could not delete.'); return }
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">Announcements</h2>
        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-1.5 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-navy/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          New
        </button>
      </div>

      {composing && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
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
                onClick={() => { setComposing(false); setDraft(''); setScheduleFor('') }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={saving || !draft.trim()}
                className="px-4 py-1.5 bg-gold text-navy text-sm font-bold rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : scheduleFor ? 'Schedule' : 'Publish Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-gray-400 text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-navy flex-1">{post.content}</p>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="text-red-300 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                {post.published ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> Published
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-orange-500 font-semibold">
                    <ClockIcon className="w-3.5 h-3.5" />
                    Scheduled {post.scheduled_for ? format(parseISO(post.scheduled_for), 'MMM d, h:mm a') : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Events Tab ──────────────────────────────────────────────
function EventsTab({ parishId }) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '', location: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('id, title, description, start_time, end_time, location, rsvp_count')
      .eq('parish_id', parishId)
      .order('start_time', { ascending: false })
      .limit(20)
    setEvents(data ?? [])
    setLoading(false)
  }, [parishId])

  useEffect(() => { load() }, [load])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.start_time || !user) return
    setSaving(true)
    const { error } = await supabase.from('events').insert({
      parish_id: parishId,
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
          className="flex items-center gap-1.5 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-navy/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          New Event
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-navy text-sm">Create Event</h3>
          <input
            value={form.title}
            onChange={e => handleChange('title', e.target.value)}
            placeholder="Event title *"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
          <textarea
            value={form.description}
            onChange={e => handleChange('description', e.target.value)}
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
                onChange={e => handleChange('start_time', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">End</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={e => handleChange('end_time', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
          </div>
          <input
            value={form.location}
            onChange={e => handleChange('location', e.target.value)}
            placeholder="Location (optional)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.title.trim() || !form.start_time}
              className="px-4 py-1.5 bg-gold text-navy text-sm font-bold rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
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
                  {ev.rsvp_count > 0 && (
                    <p className="text-xs text-navy font-medium mt-1">✓ {ev.rsvp_count} attending</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="text-red-300 hover:text-red-500 transition-colors flex-shrink-0"
                >
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

// ── Mass Times Tab ──────────────────────────────────────────
function MassTimesTab({ parishId, parish, setParish }) {
  // mass_times stored as JSON object { day: times } or plain text
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Editable as structured rows
  const defaultRows = [
    { day: 'Sunday', time: '' },
    { day: 'Saturday', time: '' },
    { day: 'Weekdays', time: '' },
    { day: 'Holy Day', time: '' },
  ]

  function parseExisting() {
    if (!parish?.mass_times) return defaultRows
    const mt = parish.mass_times
    if (typeof mt === 'object' && !Array.isArray(mt)) {
      return Object.entries(mt).map(([day, time]) => ({ day, time: String(time) }))
    }
    return defaultRows
  }

  const [rows, setRows] = useState(parseExisting)

  function updateRow(i, field, value) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  function addRow() {
    setRows(prev => [...prev, { day: '', time: '' }])
  }

  function removeRow(i) {
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)
    const massTimesObj = Object.fromEntries(
      rows.filter(r => r.day.trim() && r.time.trim()).map(r => [r.day.trim(), r.time.trim()])
    )
    const { data, error } = await supabase
      .from('parishes')
      .update({ mass_times: massTimesObj })
      .eq('id', parishId)
      .select()
      .single()

    if (error) {
      toast.error('Could not save mass times.')
    } else {
      setParish(data)
      setEditMode(false)
      toast.success('Mass times updated.')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">Mass Times</h2>
        {!editMode && (
          <button
            onClick={() => { setRows(parseExisting()); setEditMode(true) }}
            className="flex items-center gap-1.5 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-navy/90 transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {editMode ? (
          <div className="p-4 space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={row.day}
                  onChange={e => updateRow(i, 'day', e.target.value)}
                  placeholder="Day"
                  className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-navy"
                />
                <input
                  value={row.time}
                  onChange={e => updateRow(i, 'time', e.target.value)}
                  placeholder="e.g. 7:00 AM, 10:00 AM, 12:00 PM"
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
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setEditMode(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-gold text-navy text-sm font-bold rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : parish?.mass_times && typeof parish.mass_times === 'object' ? (
          <div className="divide-y divide-gray-50">
            {Object.entries(parish.mass_times).map(([day, time]) => (
              <div key={day} className="px-4 py-3 flex items-start gap-4">
                <span className="text-xs font-bold text-gray-400 uppercase w-24 flex-shrink-0 pt-0.5">{day}</span>
                <span className="text-sm text-navy">{String(time)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-400 text-sm">No mass times set. Click Edit to add them.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Parishioners Tab ────────────────────────────────────────
function ParishionersTab({ parishId }) {
  const [parishioners, setParishioners] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('parish_follows')
      .select(`
        created_at,
        profiles!user_id(id, full_name, avatar_url, vocation_state, is_verified_clergy)
      `)
      .eq('parish_id', parishId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setParishioners((data ?? []).filter(d => d.profiles))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [parishId])

  const filtered = parishioners.filter(p => {
    const name = p.profiles?.full_name?.toLowerCase() ?? ''
    return name.includes(search.toLowerCase())
  })

  const vocLabels = { single: 'Single', married: 'Married', religious: 'Religious', ordained: 'Ordained' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-navy">Parishioners ({parishioners.length})</h2>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-navy w-40"
        />
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-gray-400 text-sm">{search ? 'No results.' : 'No parishioners yet.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {filtered.map((p, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-xs font-bold text-navy flex-shrink-0">
                {p.profiles.full_name?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy truncate">{p.profiles.full_name}</p>
                {p.profiles.vocation_state && (
                  <p className="text-xs text-gray-400">{vocLabels[p.profiles.vocation_state]}</p>
                )}
              </div>
              {p.profiles.is_verified_clergy && (
                <span className="text-xs bg-navy/10 text-navy font-semibold px-2 py-0.5 rounded-full">Clergy</span>
              )}
              <span className="text-xs text-gray-400 flex-shrink-0">{format(parseISO(p.created_at), 'MMM yyyy')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Settings Tab ────────────────────────────────────────────
function SettingsTab({ parishId, parish, setParish }) {
  const [form, setForm] = useState({
    name: parish?.name ?? '',
    address: parish?.address ?? '',
    city: parish?.city ?? '',
    state: parish?.state ?? '',
    zip: parish?.zip ?? '',
    phone: parish?.phone ?? '',
    email: parish?.email ?? '',
    website: parish?.website ?? '',
    description: parish?.description ?? '',
  })
  const [saving, setSaving] = useState(false)

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const { data, error } = await supabase
      .from('parishes')
      .update(form)
      .eq('id', parishId)
      .select()
      .single()
    if (error) {
      toast.error('Could not save settings.')
    } else {
      setParish(data)
      toast.success('Parish profile updated.')
    }
    setSaving(false)
  }

  const fields = [
    { key: 'name', label: 'Parish Name', required: true },
    { key: 'address', label: 'Street Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'zip', label: 'ZIP Code' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'website', label: 'Website' },
  ]

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-navy">Parish Settings</h2>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map(({ key, label, required }) => (
            <div key={key} className={key === 'name' ? 'sm:col-span-2' : ''}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                {label}{required && ' *'}
              </label>
              <input
                value={form[key]}
                onChange={e => handleChange(key, e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">About / Description</label>
          <textarea
            value={form.description}
            onChange={e => handleChange('description', e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="px-6 py-2 bg-gold text-navy text-sm font-bold rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-navy/5 border border-navy/10 rounded-2xl p-4">
        <p className="text-sm font-semibold text-navy mb-1">Parish Page</p>
        <p className="text-xs text-gray-500 mb-2">View how your parish appears to the community.</p>
        <Link
          to={`/parish/${parishId}`}
          className="text-sm font-semibold text-navy hover:underline"
        >
          View parish page →
        </Link>
      </div>
    </div>
  )
}
