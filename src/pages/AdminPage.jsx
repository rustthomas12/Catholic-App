import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FlagIcon,
  UsersIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  XMarkIcon,
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
  BuildingOffice2Icon,
  UserCircleIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, authJsonHeaders } from '../lib/supabase';
import { apiUrl } from '../lib/platform';
import { fuzzyIlike, containsIlike } from '../utils/search';
import Avatar from '../components/shared/Avatar';
import Modal from '../components/shared/Modal';
import { toast } from '../components/shared/Toast';
import ConfirmDeleteButton from '../components/shared/ConfirmDeleteButton';
import LoadingSpinner from '../components/shared/LoadingSpinner';

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4'>
      <div className='flex-shrink-0 bg-navy-50 text-navy-600 rounded-lg p-2'>
        <Icon className='w-6 h-6' />
      </div>
      <div>
        <p className='text-2xl font-bold text-gray-900'>{value}</p>
        <p className='text-sm text-gray-500'>{label}</p>
      </div>
    </div>
  );
}

function ReasonBadge({ reason }) {
  const styles = {
    spam: 'bg-gray-100 text-gray-700',
    hateful: 'bg-red-100 text-red-700',
    misinformation: 'bg-orange-100 text-orange-700',
    violates_values: 'bg-purple-100 text-purple-700',
    other: 'bg-gray-100 text-gray-700',
  };
  const labels = {
    spam: 'Spam',
    hateful: 'Hateful',
    misinformation: 'Misinformation',
    violates_values: 'Violates Values',
    other: 'Other',
  };
  const cls = styles[reason] || styles.other;
  const label = labels[reason] || reason;
  return (
    <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + cls}>
      {label}
    </span>
  );
}

// ── Reusable entity search ─────────────────────────────────
function EntitySearch({ placeholder, onSelect, selected, onClear, searchFn, renderResult, icon: Icon }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (selected) { setQuery(''); setResults([]); return }
    if (query.trim().length < 2) { setResults([]); setSearching(false); return }
    let stale = false
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await searchFn(query.trim())
      if (stale) return
      setResults(res)
      setSearching(false)
    }, 300)
    return () => { stale = true; clearTimeout(timerRef.current) }
  }, [query, selected])

  if (selected) {
    return (
      <div className='flex items-center gap-2 bg-navy/5 border border-navy/10 rounded-xl px-3 py-2.5'>
        {Icon && <Icon className='w-4 h-4 text-navy flex-shrink-0' />}
        <span className='text-sm font-semibold text-navy flex-1 truncate'>{renderResult(selected, true)}</span>
        <button aria-label="Clear selection" type='button' onClick={onClear} className='text-gray-500 hover:text-navy transition-colors'>
          <XMarkIcon className='w-4 h-4' />
        </button>
      </div>
    )
  }

  return (
    <div className='relative'>
      <div className='flex items-center border border-gray-200 rounded-xl px-3 py-2 gap-2 focus-within:border-navy bg-white'>
        <MagnifyingGlassIcon className='w-4 h-4 text-gray-500 flex-shrink-0' />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className='flex-1 text-sm focus:outline-none bg-transparent'
        />
        {searching && <LoadingSpinner size='sm' color='gray' />}
      </div>
      {results.length > 0 && (
        <div className='absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto'>
          {results.map(item => (
            <button
              key={item.id}
              type='button'
              onClick={() => { onSelect(item); setResults([]) }}
              className='flex items-center gap-3 w-full px-3 py-2.5 hover:bg-navy/5 text-left transition-colors'
            >
              {Icon && <Icon className='w-4 h-4 text-navy flex-shrink-0' />}
              <span className='text-sm text-navy truncate'>{renderResult(item)}</span>
            </button>
          ))}
        </div>
      )}
      {query.length >= 2 && !searching && results.length === 0 && (
        <p className='text-xs text-gray-500 mt-1 px-1'>No results found.</p>
      )}
    </div>
  )
}

// ── Assign Org Admin ───────────────────────────────────────
function AssignOrgAdmin() {
  const [org, setOrg] = useState(null)
  const [user, setUser] = useState(null)
  const [saving, setSaving] = useState(false)

  async function searchOrgs(q) {
    const { data } = await supabase.from('organizations').select('id, name, city, state').ilike('name', fuzzyIlike(q)).limit(8)
    return data || []
  }

  async function searchUsers(q) {
    const trimmed = q.replace(/^@/, '').trim()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .is('deleted_at', null)
      .or(`full_name.ilike.${containsIlike(trimmed)},username.ilike.${containsIlike(trimmed)}`)
      .limit(8)
    return data || []
  }

  async function handleAssign() {
    if (!org || !user) return
    setSaving(true)
    const { error } = await supabase.from('organization_members').upsert(
      { org_id: org.id, user_id: user.id, role: 'admin' },
      { onConflict: 'org_id,user_id' }
    )
    setSaving(false)
    if (error) {
      toast.error('Failed to assign admin: ' + error.message)
    } else {
      toast.success(`${user.full_name} is now an admin of ${org.name}`)
      setOrg(null)
      setUser(null)
    }
  }

  return (
    <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3'>
      <div className='flex items-center gap-2 mb-1'>
        <BuildingOffice2Icon className='w-4 h-4 text-navy' />
        <h3 className='text-sm font-bold text-navy'>Assign Org Admin</h3>
      </div>

      <div>
        <label className='text-xs font-semibold text-gray-500 mb-1 block'>Organization</label>
        <EntitySearch
          placeholder='Search organizations…'
          selected={org}
          onSelect={setOrg}
          onClear={() => setOrg(null)}
          searchFn={searchOrgs}
          renderResult={o => o.name + (o.city ? ` — ${o.city}` : '')}
          icon={BuildingOffice2Icon}
        />
      </div>

      <div>
        <label className='text-xs font-semibold text-gray-500 mb-1 block'>User</label>
        <EntitySearch
          placeholder='Search by name or @username…'
          selected={user}
          onSelect={setUser}
          onClear={() => setUser(null)}
          searchFn={searchUsers}
          renderResult={u => u.username ? `${u.full_name} (@${u.username})` : u.full_name}
          icon={UserCircleIcon}
        />
      </div>

      <button
        onClick={handleAssign}
        disabled={!org || !user || saving}
        className='w-full flex items-center justify-center gap-2 bg-navy text-white text-sm font-bold py-2.5 rounded-xl hover:bg-navy/90 disabled:opacity-40 transition-colors'
      >
        {saving ? <LoadingSpinner size='sm' color='white' /> : <CheckIcon className='w-4 h-4' />}
        {saving ? 'Assigning…' : 'Assign as Admin'}
      </button>
    </div>
  )
}

// ── Diocese accounts (migration 108) ───────────────────────
// Dioceses sign up by talking to us: create the account here, matched to a
// diocese name on the parish list, and appoint its admin. The admin then
// picks parishes and starts the $49/parish plan at /diocese-admin/:id.
function DioceseAccounts() {
  const { user: me } = useAuth()
  const [names, setNames] = useState([])
  const [accounts, setAccounts] = useState([])
  const [name, setName] = useState('')
  const [user, setUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('parishes').select('diocese').not('diocese', 'is', null).limit(5000),
      supabase.from('dioceses').select('id, name, diocese_admins(user_id, profiles(full_name)), diocese_subscriptions(status, quantity)').order('name'),
    ]).then(([{ data: p }, { data: d }]) => {
      if (cancelled) return
      setNames([...new Set((p ?? []).map((r) => r.diocese).filter(Boolean))].sort())
      setAccounts(d ?? [])
    })
    return () => { cancelled = true }
  }, [reloadKey])

  async function searchUsers(q) {
    const trimmed = q.replace(/^@/, '').trim()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .is('deleted_at', null)
      .or(`full_name.ilike.${containsIlike(trimmed)},username.ilike.${containsIlike(trimmed)}`)
      .limit(8)
    return data || []
  }

  async function handleSave() {
    if (!name || !user) return
    setSaving(true)
    let diocese = accounts.find((a) => a.name === name)
    if (!diocese) {
      const { data, error } = await supabase.from('dioceses').insert({ name, created_by: me?.id ?? null }).select('id, name').single()
      if (error) { setSaving(false); toast.error('Could not create the diocese: ' + error.message); return }
      diocese = data
    }
    const { error } = await supabase.from('diocese_admins').upsert(
      { diocese_id: diocese.id, user_id: user.id }, { onConflict: 'diocese_id,user_id' }
    )
    setSaving(false)
    if (error) { toast.error('Could not appoint the admin: ' + error.message); return }
    toast.success(`${user.full_name} now manages the ${name} plan`)
    setUser(null)
    setReloadKey((k) => k + 1)
  }

  return (
    <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3'>
      <div className='flex items-center gap-2 mb-1'>
        <BuildingLibraryIcon className='w-4 h-4 text-navy' />
        <h3 className='text-sm font-bold text-navy'>Diocese accounts</h3>
      </div>
      {accounts.length > 0 && (
        <ul className='divide-y divide-gray-50 text-sm'>
          {accounts.map((a) => {
            const sub = Array.isArray(a.diocese_subscriptions) ? a.diocese_subscriptions[0] : a.diocese_subscriptions
            return (
              <li key={a.id} className='py-2 flex flex-wrap items-center gap-x-3'>
                <Link to={`/diocese-admin/${a.id}`} className='font-semibold text-navy hover:underline'>{a.name}</Link>
                <span className='text-xs text-gray-500'>
                  {(a.diocese_admins ?? []).map((x) => x.profiles?.full_name).filter(Boolean).join(', ') || 'no admin'}
                  {' · '}{sub?.status ? `${sub.status}, ${sub.quantity ?? 0} parishes` : 'no plan yet'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <div>
        <label className='text-xs font-semibold text-gray-500 mb-1 block'>Diocese</label>
        <select value={name} onChange={(e) => setName(e.target.value)}
          className='w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white'>
          <option value=''>Choose a diocese…</option>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div>
        <label className='text-xs font-semibold text-gray-500 mb-1 block'>Diocese admin</label>
        <EntitySearch
          placeholder='Search by name or @username…'
          selected={user}
          onSelect={setUser}
          onClear={() => setUser(null)}
          searchFn={searchUsers}
          renderResult={u => u.username ? `${u.full_name} (@${u.username})` : u.full_name}
          icon={UserCircleIcon}
        />
      </div>
      <button onClick={handleSave} disabled={!name || !user || saving}
        className='w-full flex items-center justify-center gap-2 bg-navy text-white text-sm font-bold py-2.5 rounded-xl hover:bg-navy/90 disabled:opacity-40 transition-colors'>
        {saving ? <LoadingSpinner size='sm' color='white' /> : <CheckIcon className='w-4 h-4' />}
        {saving ? 'Saving…' : 'Create account / appoint admin'}
      </button>
    </div>
  )
}

// ── Assign Parish Pastor ───────────────────────────────────
function AssignParishPastor() {
  const [parish, setParish] = useState(null)
  const [user, setUser] = useState(null)
  const [saving, setSaving] = useState(false)

  async function searchParishes(q) {
    const { data } = await supabase.from('parishes').select('id, name, city, state').ilike('name', fuzzyIlike(q)).limit(8)
    return data || []
  }

  async function searchUsers(q) {
    const trimmed = q.replace(/^@/, '').trim()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .is('deleted_at', null)
      .or(`full_name.ilike.${containsIlike(trimmed)},username.ilike.${containsIlike(trimmed)}`)
      .limit(8)
    return data || []
  }

  async function handleAssign() {
    if (!parish || !user) return
    setSaving(true)

    // Upsert into parish_admins
    const { error } = await supabase.from('parish_admins').upsert(
      { parish_id: parish.id, user_id: user.id },
      { onConflict: 'parish_id,user_id' }
    )

    // Also mark the user as verified clergy if they aren't already
    let verified = true
    if (!error) {
      const { data: updated } = await supabase.from('profiles')
        .update({ is_verified_clergy: true, pending_pastor_parish_id: null }).eq('id', user.id).select('id')
      verified = !!updated?.length
    }

    setSaving(false)
    if (error) {
      toast.error('Failed to assign pastor: ' + error.message)
    } else if (!verified) {
      toast.error(`${user.full_name} can now manage ${parish.name}, but could not be marked as verified clergy.`)
    } else {
      toast.success(`${user.full_name} is now pastor/admin of ${parish.name}`)
      setParish(null)
      setUser(null)
    }
  }

  return (
    <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3'>
      <div className='flex items-center gap-2 mb-1'>
        <BuildingLibraryIcon className='w-4 h-4 text-navy' />
        <h3 className='text-sm font-bold text-navy'>Assign Parish Pastor / Admin</h3>
      </div>

      <div>
        <label className='text-xs font-semibold text-gray-500 mb-1 block'>Parish</label>
        <EntitySearch
          placeholder='Search parishes…'
          selected={parish}
          onSelect={setParish}
          onClear={() => setParish(null)}
          searchFn={searchParishes}
          renderResult={p => p.name + (p.city ? ` — ${p.city}` : '')}
          icon={BuildingLibraryIcon}
        />
      </div>

      <div>
        <label className='text-xs font-semibold text-gray-500 mb-1 block'>User</label>
        <EntitySearch
          placeholder='Search by name or @username…'
          selected={user}
          onSelect={setUser}
          onClear={() => setUser(null)}
          searchFn={searchUsers}
          renderResult={u => u.username ? `${u.full_name} (@${u.username})` : u.full_name}
          icon={UserCircleIcon}
        />
      </div>

      <p className='text-xs text-gray-500'>This will also grant the user the verified clergy badge.</p>

      <button
        onClick={handleAssign}
        disabled={!parish || !user || saving}
        className='w-full flex items-center justify-center gap-2 bg-navy text-white text-sm font-bold py-2.5 rounded-xl hover:bg-navy/90 disabled:opacity-40 transition-colors'
      >
        {saving ? <LoadingSpinner size='sm' color='white' /> : <CheckIcon className='w-4 h-4' />}
        {saving ? 'Assigning…' : 'Assign as Pastor'}
      </button>
    </div>
  )
}

// ── Main AdminPage ─────────────────────────────────────────
// ── App errors ─────────────────────────────────────────────
// Groups the last 300 reports by message: how often, how many people,
// when last seen, and one example stack.
function AppErrors() {
  const [rows, setRows] = useState(null)
  const [open, setOpen] = useState(null)
  const load = useCallback(() => {
    supabase.from('client_errors')
      .select('created_at, user_id, kind, message, stack, path, app_version, platform')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data, error }) => setRows(error ? [] : data ?? []))
  }, [])
  useEffect(() => { load() }, [load])

  const groups = []
  const byKey = new Map()
  for (const r of rows ?? []) {
    const key = `${r.kind}:${r.message}`
    let g = byKey.get(key)
    if (!g) { g = { key, ...r, count: 0, users: new Set(), paths: new Set() }; byKey.set(key, g); groups.push(g) }
    g.count++
    if (r.user_id) g.users.add(r.user_id)
    if (r.path) g.paths.add(r.path)
  }

  return (
    <>
      <h2 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2'>
        App errors <span className='font-normal normal-case'>(last 30 days)</span>
        <button onClick={load} className='ml-auto text-xs font-semibold text-navy normal-case hover:underline'>Refresh</button>
      </h2>
      {rows === null ? (
        <div className='h-16 bg-white rounded-xl border border-gray-100 animate-pulse' />
      ) : groups.length === 0 ? (
        <p className='bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-500'>No errors reported.</p>
      ) : (
        <ul className='bg-white rounded-xl border border-gray-100 divide-y divide-gray-50'>
          {groups.map((g) => (
            <li key={g.key} className='p-3'>
              <button onClick={() => setOpen(open === g.key ? null : g.key)} className='w-full text-left'>
                <p className='text-sm font-semibold text-navy break-words'>{g.message}</p>
                <p className='text-xs text-gray-500 mt-0.5'>
                  {g.count}× · {g.users.size} {g.users.size === 1 ? 'person' : 'people'} · last {new Date(g.created_at).toLocaleString()} · {g.kind} · v{g.app_version} {g.platform}
                </p>
                <p className='text-xs text-gray-500 truncate'>{[...g.paths].slice(0, 4).join(', ')}</p>
              </button>
              {open === g.key && g.stack && (
                <pre className='mt-2 text-[11px] leading-snug bg-gray-50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-words text-gray-700'>{g.stack}</pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function AdminPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ users: 0, postsToday: 0, openFlags: 0, parishes: 0 });
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [contentReports, setContentReports] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // 'all' | 'clergy' | 'suspended' | 'admin'
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [banTarget, setBanTarget] = useState(null);
  const [banFlagId, setBanFlagId] = useState(null);
  const [banInput, setBanInput] = useState('');
  const [banModalOpen, setBanModalOpen] = useState(false);

  useEffect(() => {
    document.title = 'Platform Admin | inFold';
  }, []);

  useEffect(() => {
    if (profile && !profile.is_admin) {
      navigate('/');
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (!profile?.is_admin) return;
    loadStats();
    loadFlaggedPosts();
    loadContentReports();
  }, [profile]);

  useEffect(() => {
    if (!profile?.is_admin) return;
    const timer = setTimeout(() => {
      loadRecentUsers(userSearch, userFilter);
    }, 400);
    return () => clearTimeout(timer);
  }, [userSearch, userFilter, profile]);

  async function loadStats() {
    setLoadingStats(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const [usersRes, postsRes, flagsRes, parishesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', todayIso).is('deleted_at', null),
        supabase.from('post_flags').select('id', { count: 'exact', head: true }).neq('is_resolved', true),
        supabase.from('parishes').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        users: usersRes.count ?? 0,
        postsToday: postsRes.count ?? 0,
        openFlags: flagsRes.count ?? 0,
        parishes: parishesRes.count ?? 0,
      });
    } catch (err) {
      toast.error('Failed to load stats');
    } finally {
      setLoadingStats(false);
    }
  }

  // Reports on comments, messages, group chat, prayer requests, profiles, groups
  async function loadContentReports() {
    const { data, error } = await supabase
      .from('content_reports')
      .select('id, content_type, content_id, reason, notes, snapshot, created_at, reported:profiles!reported_user_id(id, full_name, avatar_url), reporter:profiles!reporter_id(id, full_name)')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });
    if (error) { console.error('loadContentReports', error); return; }
    setContentReports(data || []);
  }

  async function dismissReport(id) {
    const { error } = await supabase
      .from('content_reports')
      .update({ is_resolved: true, resolution: 'dismissed', resolved_by: profile.id, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Failed to dismiss report'); return; }
    setContentReports((prev) => prev.filter((r) => r.id !== id));
  }

  async function removeReported(report) {
    const { error } = await supabase.rpc('admin_remove_reported_content', { p_report_id: report.id });
    if (error) { toast.error(error.message || 'Failed to remove'); return; }
    toast.success('Removed');
    setContentReports((prev) => prev.filter((r) => !(r.content_type === report.content_type && r.content_id === report.content_id)));
  }

  async function loadFlaggedPosts() {
    setLoadingFlags(true);
    try {
      const { data, error } = await supabase
        .from('post_flags')
        .select('id, reason, created_at, post:posts!post_id(id, content, image_url, created_at, author:profiles!author_id(id, full_name, avatar_url)), reporter:profiles!user_id(id, full_name)')
        .neq('is_resolved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlaggedPosts(data || []);
    } catch (err) {
      toast.error('Failed to load flagged posts');
    } finally {
      setLoadingFlags(false);
    }
  }

  const loadRecentUsers = useCallback(async (search, filter = 'all') => {
    setLoadingUsers(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, suspended_at, created_at, is_verified_clergy, is_admin, vocation_state')
        .is('deleted_at', null)
        .order('suspended_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      // Text search — match full_name OR username
      const trimmed = (search ?? '').trim();
      if (trimmed) {
        query = query.or(`full_name.ilike.${containsIlike(trimmed)},username.ilike.${containsIlike(trimmed)}`);
      }

      // Role / status filters
      if (filter === 'clergy')    query = query.eq('is_verified_clergy', true);
      if (filter === 'suspended') query = query.not('suspended_at', 'is', null);
      if (filter === 'admin')     query = query.eq('is_admin', true);

      const { data, error } = await query.limit(50);
      if (error) {
        console.error('loadRecentUsers error:', error);
        throw error;
      }
      setRecentUsers(data || []);
    } catch (err) {
      toast.error('Failed to load users: ' + (err?.message || 'unknown error'));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  async function dismissFlag(flagId) {
    try {
      const { error } = await supabase
        .from('post_flags')
        .update({ is_resolved: true, resolved_by: profile.id, resolved_at: new Date().toISOString() })
        .eq('id', flagId);
      if (error) throw error;
      toast.success('Flag dismissed');
      setFlaggedPosts((prev) => prev.filter((f) => f.id !== flagId));
      setStats((prev) => ({ ...prev, openFlags: Math.max(0, prev.openFlags - 1) }));
    } catch (err) {
      toast.error('Failed to dismiss flag');
    }
  }

  // Through an RPC: RLS only lets a post's author update it, so a direct
  // update here silently changed nothing and the flag was closed anyway
  async function hidePost(flagId, postId) {
    const { error } = await supabase.rpc('admin_hide_flagged_post', { p_flag_id: flagId });
    if (error) {
      toast.error('Failed to hide post');
      return;
    }
    toast.success('Post hidden');
    // Hiding settles every open flag on that post
    const settled = flaggedPosts.filter((f) => f.id === flagId || f.post?.id === postId).length;
    setFlaggedPosts((prev) => prev.filter((f) => f.id !== flagId && f.post?.id !== postId));
    setStats((prev) => ({ ...prev, openFlags: Math.max(0, prev.openFlags - settled) }));
  }

  function openBanModal(flagId, user) {
    setBanFlagId(flagId);
    setBanTarget(user);
    setBanInput('');
    setBanModalOpen(true);
  }

  async function banUser() {
    if (banInput !== 'BAN') { toast.error('Type BAN to confirm'); return; }
    try {
      const { error: banError } = await supabase.rpc('set_user_suspended', {
        target_user_id: banTarget.id,
        suspended: true,
      });
      if (banError) throw banError;
      if (banFlagId) await dismissFlag(banFlagId);
      toast.success('User suspended');
      setBanModalOpen(false);
      setBanTarget(null);
      setBanFlagId(null);
      setBanInput('');
      loadRecentUsers(userSearch);
    } catch (err) {
      toast.error(err?.code === 'P0001' ? err.message : 'Failed to suspend user');
    }
  }

  async function toggleSuspend(user) {
    try {
      const suspending = !user.suspended_at;
      const { error } = await supabase.rpc('set_user_suspended', {
        target_user_id: user.id,
        suspended: suspending,
      });
      if (error) throw error;
      toast.success(suspending ? 'User suspended' : 'User reinstated');
      setRecentUsers((prev) => prev.map((u) =>
        u.id === user.id ? { ...u, suspended_at: suspending ? new Date().toISOString() : null } : u
      ));
    } catch (err) {
      toast.error(err?.code === 'P0001' ? err.message : 'Failed to update user status');
    }
  }

  if (!profile?.is_admin) return null;

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Top bar */}
      <div className='bg-navy text-white px-4 py-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <ShieldExclamationIcon className='w-5 h-5' />
          <h1 className='font-semibold text-lg'>Platform Admin</h1>
        </div>
        <Link to='/' className='text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1'>
          <XMarkIcon className='w-4 h-4' />
          Back to app
        </Link>
      </div>

      <div className='max-w-3xl mx-auto px-4 pt-6 pb-16 space-y-8'>
        {/* Stats */}
        <section>
          <h2 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3'>Overview</h2>
          {loadingStats ? (
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              {[0, 1, 2, 3].map((i) => <div key={i} className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm animate-pulse h-20' />)}
            </div>
          ) : (
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              <StatCard label='Total Users' value={stats.users} icon={UsersIcon} />
              <StatCard label='Posts Today' value={stats.postsToday} icon={DocumentTextIcon} />
              <StatCard label='Open Flags' value={stats.openFlags} icon={FlagIcon} />
              <StatCard label='Parishes' value={stats.parishes} icon={BuildingLibraryIcon} />
            </div>
          )}
        </section>

        {/* Role Management */}
        <section>
          <h2 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2'>
            <UserCircleIcon className='w-4 h-4' />
            Role Management
          </h2>
          <div className='grid md:grid-cols-2 gap-4'>
            <AssignOrgAdmin />
            <AssignParishPastor />
          </div>
          <PendingPastors />
          <TrialsEnding />
          <SignupFunnel />
        </section>

        {/* Flagged Posts */}
        <section>
          <h2 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2'>
            <FlagIcon className='w-4 h-4 text-red-500' />
            Flagged Posts
          </h2>
          {loadingFlags ? (
            <div className='space-y-3'>
              {[0, 1, 2].map((i) => <div key={i} className='bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse h-28' />)}
            </div>
          ) : flaggedPosts.length === 0 ? (
            <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-gray-500 text-sm'>
              No open flags — great job!
            </div>
          ) : (
            <div className='space-y-3'>
              {flaggedPosts.map((flag) => {
                const post = flag.post;
                const author = post?.author;
                const reporter = flag.reporter;
                return (
                  <div key={flag.id} className='bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-red-400 p-4'>
                    <div className='flex items-start justify-between gap-3 mb-2'>
                      <div className='flex items-center gap-2 min-w-0'>
                        {author && <Avatar src={author.avatar_url} name={author.full_name} size='sm' />}
                        <div className='min-w-0'>
                          <p className='text-sm font-medium text-gray-900 truncate'>{author?.full_name || 'Unknown user'}</p>
                          <p className='text-xs text-gray-500'>Reported by {reporter?.full_name || 'unknown'}</p>
                        </div>
                      </div>
                      <ReasonBadge reason={flag.reason} />
                    </div>

                    {post?.content && <p className='text-sm text-gray-700 mb-3 line-clamp-3'>{post.content}</p>}
                    {post?.image_url && <img src={post.image_url} alt='Post image' className='rounded-lg mb-3 max-h-40 object-cover' />}

                    <div className='flex flex-wrap gap-2'>
                      <button onClick={() => dismissFlag(flag.id)} className='text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>
                        Dismiss
                      </button>
                      {post && (
                        <button onClick={() => hidePost(flag.id, post.id)} className='text-xs px-3 py-1.5 rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors'>
                          Hide Post
                        </button>
                      )}
                      {author && (
                        <button onClick={() => openBanModal(flag.id, author)} className='text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors'>
                          Suspend Author
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Other reports */}
        <section>
          <h2 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2'>
            <FlagIcon className='w-4 h-4 text-red-500' />
            Other Reports
          </h2>
          {contentReports.length === 0 ? (
            <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-gray-500 text-sm'>
              No open reports on comments, messages, prayer requests, profiles or groups.
            </div>
          ) : (
            <div className='space-y-3'>
              {contentReports.map((r) => (
                <div key={r.id} className='bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-red-400 p-4'>
                  <div className='flex items-start justify-between gap-3 mb-2'>
                    <div className='flex items-center gap-2 min-w-0'>
                      {r.reported && <Avatar src={r.reported.avatar_url} name={r.reported.full_name} size='sm' />}
                      <div className='min-w-0'>
                        <p className='text-sm font-medium text-gray-900 truncate'>
                          {r.reported?.full_name || 'Unknown user'}
                          <span className='ml-2 text-xs font-normal text-gray-500 capitalize'>{r.content_type.replace('_', ' ')}</span>
                        </p>
                        <p className='text-xs text-gray-500'>Reported by {r.reporter?.full_name || 'unknown'}</p>
                      </div>
                    </div>
                    <ReasonBadge reason={r.reason} />
                  </div>
                  {r.snapshot && <p className='text-sm text-gray-700 mb-2 whitespace-pre-wrap line-clamp-4'>{r.snapshot}</p>}
                  {r.notes && <p className='text-xs text-gray-500 italic mb-3'>Note: {r.notes}</p>}
                  <div className='flex flex-wrap gap-2'>
                    <button onClick={() => dismissReport(r.id)} className='text-xs px-3 min-h-[36px] rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>
                      Dismiss
                    </button>
                    {r.content_type !== 'profile' && (
                      <button onClick={() => removeReported(r)} className='text-xs px-3 min-h-[36px] rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors'>
                        Remove {r.content_type === 'group' ? 'group' : 'content'}
                      </button>
                    )}
                    {r.reported && (
                      <button onClick={() => openBanModal(null, r.reported)} className='text-xs px-3 min-h-[36px] rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors'>
                        Suspend User
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Users */}
        <section>
          <h2 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2'>
            <UsersIcon className='w-4 h-4' />
            Users
          </h2>

          {/* Search input */}
          <div className='relative mb-2'>
            <MagnifyingGlassIcon className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500' />
            <input
              type='text'
              placeholder='Search by name or username…'
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className='w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy bg-white'
            />
          </div>

          {/* Filter chips */}
          <div className='flex gap-2 mb-3 flex-wrap'>
            {[
              { key: 'all', label: 'All' },
              { key: 'clergy', label: 'Clergy' },
              { key: 'suspended', label: 'Suspended' },
              { key: 'admin', label: 'Admins' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setUserFilter(key)}
                className={
                  'text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ' +
                  (userFilter === key
                    ? 'bg-navy text-white border-navy'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy')
                }
              >
                {label}
              </button>
            ))}
          </div>

          {loadingUsers ? (
            <div className='space-y-2'>
              {[0, 1, 2, 3].map((i) => <div key={i} className='bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse h-14' />)}
            </div>
          ) : recentUsers.length === 0 ? (
            <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-gray-500 text-sm'>
              {userSearch
                ? `No ${userFilter !== 'all' ? userFilter + ' ' : ''}users match that search.`
                : userFilter !== 'all'
                ? `No ${userFilter} users found.`
                : 'No new users in the last 7 days.'}
            </div>
          ) : (
            <div className='bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50'>
              {recentUsers.map((user) => (
                <div key={user.id} className='flex items-center gap-3 px-4 py-3'>
                  <Avatar src={user.avatar_url} name={user.full_name} size='sm' />
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <p className='text-sm font-medium text-gray-900 truncate'>{user.full_name}</p>
                      {user.is_verified_clergy && (
                        <span className='text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex-shrink-0'>Clergy</span>
                      )}
                      {user.is_admin && (
                        <span className='text-[10px] font-bold bg-navy/10 text-navy px-1.5 py-0.5 rounded-full flex-shrink-0'>Admin</span>
                      )}
                    </div>
                    <p className='text-xs text-gray-500 truncate'>
                      {user.username ? `@${user.username} · ` : ''}
                      {user.vocation_state ? `${user.vocation_state} · ` : ''}
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {user.suspended_at && (
                    <span className='text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0'>
                      Suspended
                    </span>
                  )}
                  {(user.suspended_at || (user.id !== profile?.id && !user.is_admin)) && (
                  <button
                    onClick={() => toggleSuspend(user)}
                    className={
                      'text-xs px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ' +
                      (user.suspended_at ? 'border-green-200 text-green-700 hover:bg-green-50' : 'border-red-200 text-red-700 hover:bg-red-50')
                    }
                  >
                    {user.suspended_at ? 'Unsuspend' : 'Suspend'}
                  </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Crashes reported by the app (client_errors, kept 30 days) */}
        <section>
          <AppErrors />
        </section>

        {/* Diocese plan accounts */}
        <section>
          <DioceseAccounts />
        </section>

        {/* Parish Clusters */}
        <section>
          <ParishClusters />
        </section>
      </div>

      {/* Ban Confirmation Modal */}
      <Modal
        isOpen={banModalOpen}
        onClose={() => { setBanModalOpen(false); setBanTarget(null); setBanFlagId(null); setBanInput(''); }}
        title='Confirm Suspension'
      >
        <div className='space-y-4'>
          <p className='text-sm text-gray-700'>
            You are about to suspend{' '}
            <span className='font-semibold'>{banTarget?.full_name}</span>. This will prevent them from logging in. Type{' '}
            <span className='font-mono font-bold'>BAN</span> to confirm.
          </p>
          <input
            type='text'
            value={banInput}
            onChange={(e) => setBanInput(e.target.value)}
            placeholder='Type BAN to confirm'
            className='w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400'
          />
          <div className='flex gap-3 justify-end'>
            <button
              onClick={() => { setBanModalOpen(false); setBanTarget(null); setBanFlagId(null); setBanInput(''); }}
              className='text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={banUser}
              disabled={banInput !== 'BAN'}
              className={
                'text-sm px-4 py-2 rounded-lg font-medium transition-colors ' +
                (banInput === 'BAN' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-100 text-gray-500 cursor-not-allowed')
              }
            >
              Suspend User
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Parish Clusters ────────────────────────────────────────
// Pastors who completed parish checkout and await verification
// (stripe-webhook sets profiles.pending_pastor_parish_id)
function PendingPastors() {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    const { data: people } = await supabase.rpc('admin_pending_pastors')
    const ids = [...new Set((people ?? []).map(p => p.pending_pastor_parish_id))]
    const { data: parishes } = ids.length
      ? await supabase.from('parishes').select('id, name, city, state').in('id', ids)
      : { data: [] }
    const byId = Object.fromEntries((parishes ?? []).map(p => [p.id, p]))
    // Role and pastor invite (migration 096): their own application, or the
    // staff application whose invite they accepted
    const userIds = (people ?? []).map(p => p.id)
    const { data: apps } = userIds.length
      ? await supabase.from('parish_signups')
          .select('parish_id, user_id, applicant_role, staff_title, pastor_name, pastor_email, invite_sent_at, invite_accepted_by, invite_accepted_at')
          .or(`user_id.in.(${userIds.join(',')}),invite_accepted_by.in.(${userIds.join(',')})`)
      : { data: [] }
    const own = (p) => (apps ?? []).find(a => a.user_id === p.id && a.parish_id === p.pending_pastor_parish_id)
    const invitedVia = (p) => (apps ?? []).find(a => a.invite_accepted_by === p.id && a.parish_id === p.pending_pastor_parish_id)
    const { data: inviters } = (apps ?? []).length
      ? await supabase.from('profiles').select('id, full_name').in('id', [...new Set(apps.map(a => a.user_id))])
      : { data: [] }
    const nameOf = Object.fromEntries((inviters ?? []).map(x => [x.id, x.full_name]))
    setRows((people ?? []).map(p => {
      const via = invitedVia(p)
      return {
        ...p,
        parish: byId[p.pending_pastor_parish_id],
        application: own(p),
        invitedBy: via ? nameOf[via.user_id] || 'parish staff' : null,
      }
    }))
  }, [])
  useEffect(() => { load() }, [load])

  // Admin access and the clergy badge are separate: a business manager or
  // lay administrator can run the parish without being shown as clergy.
  // Upserting role 'admin' replaces their provisional 'pending' row.
  // Staff are approved as 'staff', never with the badge.
  async function approve(row, withBadge, role = 'admin') {
    setBusy(row.id)
    const parishId = row.pending_pastor_parish_id
    const { error } = await supabase.from('parish_admins').upsert(
      { parish_id: parishId, user_id: row.id, role }, { onConflict: 'parish_id,user_id' })
    // A refused update returns no rows rather than an error
    const { data: updated, error: pErr0 } = error ? { error } : await supabase.from('profiles')
      .update(withBadge ? { is_verified_clergy: true, pending_pastor_parish_id: null } : { pending_pastor_parish_id: null })
      .eq('id', row.id).select('id')
    const pErr = pErr0 || (!error && !updated?.length ? { message: 'their profile could not be updated' } : null)
    setBusy(null)
    if (error || pErr) { toast.error('Could not approve: ' + (error || pErr).message); return }
    await supabase.from('notifications').insert({
      user_id: row.id, type: 'pastor_verified', reference_id: parishId, actor_id: user.id, is_read: false,
      message: withBadge
        ? `You're verified as pastor of ${row.parish?.name || 'your parish'}. Your full parish dashboard is unlocked.`
        : `You're verified as ${role === 'staff' ? 'parish staff' : 'an admin'} of ${row.parish?.name || 'your parish'}. Your full parish dashboard is unlocked.`,
    })
    toast.success(`${row.full_name} now manages ${row.parish?.name || 'the parish'}`)
    load()
  }

  // Server-side: also cancels the trial the pastor started at checkout,
  // which otherwise bills them on day 91
  async function decline(row) {
    setBusy(row.id)
    try {
      const res = await fetch(apiUrl('/api/create-portal-session'), {
        method: 'POST',
        headers: await authJsonHeaders(),
        body: JSON.stringify({ action: 'decline-pastor', applicantId: row.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error('Could not decline: ' + (data.error || res.status)); return }
      toast.success(data.canceled ? 'Application declined and their trial canceled' : 'Application declined')
      load()
    } catch {
      toast.error('Could not decline. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  if (!rows?.length) return null
  return (
    <div className='bg-white rounded-xl border border-amber-200 shadow-sm p-4 mt-4'>
      <h3 className='text-sm font-bold text-navy mb-3'>Pending parish applications ({rows.length})</h3>
      <div className='space-y-2'>
        {rows.map(r => (
          <div key={r.id} className='flex flex-wrap items-center gap-2 border border-gray-100 rounded-lg px-3 py-2'>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-semibold text-navy truncate'>{r.full_name} <span className='text-gray-500 font-normal'>@{r.username} · {r.vocation_state}</span></p>
              <p className='text-xs text-gray-500 truncate'>{r.parish ? `${r.parish.name}, ${r.parish.city}, ${r.parish.state}` : r.pending_pastor_parish_id}</p>
              <p className='text-xs text-navy mt-0.5'>
                {r.invitedBy
                  ? <>Named as pastor by {r.invitedBy}; accepted the invite</>
                  : r.application?.applicant_role === 'staff'
                    ? <>Parish staff{r.application.staff_title ? ` · ${r.application.staff_title}` : ''}. Named pastor: {r.application.pastor_name || 'not given'}
                        {r.application.pastor_email
                          ? (r.application.invite_accepted_at ? ' (accepted)' : r.application.invite_sent_at ? ` (invite sent to ${r.application.pastor_email})` : ` (${r.application.pastor_email}, invite not sent)`)
                          : ' (no email: confirm with the parish office)'}</>
                    : r.application?.applicant_role === 'clergy' ? 'Other clergy'
                    : r.application ? 'Pastor' : 'Role not recorded (signed up before roles were asked)'}
              </p>
            </div>
            {r.application?.applicant_role === 'staff' ? (
              <button disabled={busy === r.id} onClick={() => approve(r, false, 'staff')}
                title='Full dashboard access as parish staff, no clergy badge'
                className='text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy text-white disabled:opacity-50'>Approve as staff</button>
            ) : (
              <>
                <button disabled={busy === r.id} onClick={() => approve(r, true)}
                  title='Full dashboard access plus the verified clergy badge'
                  className='text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy text-white disabled:opacity-50'>Approve as clergy</button>
                <button disabled={busy === r.id} onClick={() => approve(r, false)}
                  title='Full dashboard access, no clergy badge (business manager, lay administrator)'
                  className='text-xs font-semibold px-3 py-1.5 rounded-lg border border-navy text-navy disabled:opacity-50'>Approve, no badge</button>
              </>
            )}
            <ConfirmDeleteButton
              title='Decline this application?'
              message={`${r.full_name} will not manage ${r.parish?.name || 'this parish'}, and the free trial they started at checkout is canceled so they are never charged.`}
              confirmLabel='Decline'
              aria-label={`Decline ${r.full_name}'s application`}
              onConfirm={() => decline(r)}
              className='text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-50'>Decline</ConfirmDeleteButton>
          </div>
        ))}
      </div>
    </div>
  )
}

// Parish trials and paused plans, for following up with pastors who haven't
// added a card. Trials start without one (migration 093); with no card by
// day 91, Stripe pauses the plan until a card is added.
function TrialsEnding() {
  const [rows, setRows] = useState(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    supabase.rpc('admin_trials_ending').then(({ data }) => {
      const now = Date.now()
      setRows((data ?? []).map(r => ({
        ...r,
        days_left: r.trial_ends_at ? Math.ceil((new Date(r.trial_ends_at) - now) / 86400000) : null,
      })))
    })
  }, [])

  if (!rows?.length) return null
  const daysLeft = (r) => r.days_left
  const needsFollowUp = (r) => r.status === 'paused' || (!r.has_payment_method && (daysLeft(r) ?? 99) <= 21)
  const urgent = rows.filter(needsFollowUp)
  const shown = showAll ? rows : urgent

  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-4 mt-4'>
      <div className='flex items-center justify-between gap-2 mb-1'>
        <h3 className='text-sm font-bold text-navy'>
          Trials ending ({urgent.length} to follow up{rows.length > urgent.length ? ` · ${rows.length} trial${rows.length === 1 ? '' : 's'}` : ''})
        </h3>
        {rows.length > urgent.length && (
          <button onClick={() => setShowAll(v => !v)} className='text-xs font-semibold text-navy hover:underline'>
            {showAll ? 'Only follow-ups' : 'Show all trials'}
          </button>
        )}
      </div>
      <p className='text-xs text-gray-500 mb-3'>Paused plans, and trials with no card and 3 weeks or less left.</p>
      {shown.length === 0 ? (
        <p className='text-sm text-gray-500'>Nothing to follow up right now.</p>
      ) : (
        <div className='space-y-2'>
          {shown.map(r => {
            const d = daysLeft(r)
            return (
              <div key={r.parish_id} className='border border-gray-100 rounded-lg px-3 py-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Link to={`/parish/${r.parish_id}`} className='text-sm font-semibold text-navy hover:underline flex-1 min-w-0 truncate'>
                    {r.parish_name}<span className='text-gray-500 font-normal'> · {[r.city, r.state].filter(Boolean).join(', ')}</span>
                  </Link>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    r.status === 'paused' ? 'bg-red-100 text-red-600'
                      : r.has_payment_method ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status === 'paused' ? 'Paused, no card'
                      : r.has_payment_method ? 'Card on file'
                      : d === null ? 'No card' : d <= 0 ? 'No card · ends today' : `No card · ${d} day${d === 1 ? '' : 's'} left`}
                  </span>
                </div>
                <div className='mt-1 space-y-0.5'>
                  {(r.contacts ?? []).length === 0
                    ? <p className='text-xs text-gray-500'>No admin yet</p>
                    : r.contacts.map(c => (
                      <p key={c.email} className='text-xs text-gray-600 truncate'>
                        {c.name || 'Unnamed'} <span className='text-gray-400'>({c.role})</span>{' '}
                        <a href={`mailto:${c.email}`} className='text-navy hover:underline'>{c.email}</a>
                      </p>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Parish signup funnel (migration 097): how many reached each step in the
// window, and each parish's furthest step. Parish-level counts only.
const FUNNEL_LABELS = {
  started: 'Opened signup',
  parish_chosen: 'Chose a parish',
  plan_chosen: 'Chose a plan',
  trial_started: 'Started trial',
  profile_updated: 'Edited parish page',
  verified: 'Verified',
  first_announcement: 'First announcement',
  members_25: '25 members',
  paid: 'Paid',
}

function SignupFunnel() {
  const [days, setDays] = useState(90)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase.rpc('admin_signup_funnel', { p_days: days }).then(({ data: d, error }) => {
      if (!cancelled) setData(error ? { steps: [], parishes: [] } : d)
    })
    return () => { cancelled = true }
  }, [days])

  const steps = data?.steps ?? []
  const max = Math.max(1, ...steps.map(st => st.count))

  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-4 mt-4'>
      <div className='flex items-center justify-between gap-2 mb-1'>
        <h3 className='text-sm font-bold text-navy'>Parish signup funnel</h3>
        <select value={days} onChange={e => setDays(Number(e.target.value))} aria-label='Time window'
          className='text-xs border border-gray-200 rounded-lg px-2 py-1 text-navy'>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>
      <p className='text-xs text-gray-500 mb-3'>
        First time each parish reached each step (the first step counts people). Tracking started Nov 21, 2026.
      </p>
      {!data ? <LoadingSpinner /> : (
        <>
          <div className='space-y-1.5'>
            {steps.map((st, i) => {
              const prev = i > 0 ? steps[i - 1].count : null
              const drop = prev ? Math.round(100 - (st.count / prev) * 100) : null
              return (
                <div key={st.step} className='flex items-center gap-2 text-xs'>
                  <span className='w-36 flex-shrink-0 text-gray-600 truncate'>{FUNNEL_LABELS[st.step] || st.step}</span>
                  <div className='flex-1 h-4 bg-gray-50 rounded'>
                    <div className='h-4 bg-navy/80 rounded' style={{ width: `${(st.count / max) * 100}%` }} />
                  </div>
                  <span className='w-8 text-right font-semibold text-navy tabular-nums'>{st.count}</span>
                  <span className='w-12 text-right text-gray-400 tabular-nums'>{drop !== null && drop > 0 ? `-${drop}%` : ''}</span>
                </div>
              )
            })}
          </div>
          {data.parishes?.length > 0 && (
            <div className='mt-4 border-t border-gray-100 pt-3'>
              <p className='text-xs font-semibold text-gray-500 mb-2'>Parishes by furthest step</p>
              <div className='space-y-1'>
                {data.parishes.map(r => (
                  <div key={r.parish_id} className='flex items-center gap-2 text-xs'>
                    <Link to={`/parish/${r.parish_id}`} className='flex-1 min-w-0 truncate text-navy hover:underline'>
                      {r.name}<span className='text-gray-400'> · {[r.city, r.state].filter(Boolean).join(', ')}</span>
                    </Link>
                    <span className='text-gray-600'>{FUNNEL_LABELS[r.furthest] || r.furthest}</span>
                    <span className='w-20 text-right text-gray-400'>{new Date(r.last_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ParishClusters() {
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [addState, setAddState] = useState({})

  useEffect(() => { loadClusters() }, [])

  async function loadClusters() {
    setLoading(true)
    const { data } = await supabase
      .from('parish_clusters')
      .select('id, name, parish_cluster_members(parishes(id, name, city, state))')
      .order('name')
    setClusters(data ?? [])
    setLoading(false)
  }

  async function createCluster() {
    if (!newName.trim()) return
    setCreating(true)
    const { error } = await supabase.from('parish_clusters').insert({ name: newName.trim() })
    if (error) toast.error('Could not create cluster')
    else { setNewName(''); await loadClusters() }
    setCreating(false)
  }

  async function deleteCluster(clusterId) {
    const { data, error } = await supabase.from('parish_clusters').delete().eq('id', clusterId).select('id')
    if (error || !data?.length) toast.error('Could not delete cluster')
    else setClusters(prev => prev.filter(c => c.id !== clusterId))
  }

  async function removeParish(clusterId, parishId) {
    const { data, error } = await supabase.from('parish_cluster_members').delete()
      .eq('cluster_id', clusterId).eq('parish_id', parishId).select('parish_id')
    if (error || !data?.length) { toast.error('Could not remove parish'); return }
    setClusters(prev => prev.map(c =>
      c.id !== clusterId ? c : {
        ...c,
        parish_cluster_members: c.parish_cluster_members.filter(m => m.parishes?.id !== parishId),
      }
    ))
  }

  async function searchParishes(clusterId, q) {
    setAddState(prev => ({ ...prev, [clusterId]: { ...prev[clusterId], query: q, results: [] } }))
    if (q.trim().length < 2) return
    const { data } = await supabase.from('parishes')
      .select('id, name, city, state')
      .ilike('name', fuzzyIlike(q))
      .limit(8)
    // Ignore responses for an older keystroke that arrive late
    setAddState(prev => prev[clusterId]?.query !== q ? prev
      : ({ ...prev, [clusterId]: { ...prev[clusterId], results: data ?? [] } }))
  }

  async function addParish(clusterId, parish) {
    const { error } = await supabase.from('parish_cluster_members')
      .insert({ cluster_id: clusterId, parish_id: parish.id })
    if (error) {
      toast.error(error.code === '23505' ? 'Already in this cluster' : 'Could not add parish')
    } else {
      setClusters(prev => prev.map(c =>
        c.id !== clusterId ? c : {
          ...c,
          parish_cluster_members: [...c.parish_cluster_members, { parishes: parish }],
        }
      ))
      setAddState(prev => ({ ...prev, [clusterId]: { query: '', results: [] } }))
    }
  }

  return (
    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
      <div className='bg-navy px-5 py-4'>
        <h2 className='text-white font-bold'>Parish Clusters</h2>
        <p className='text-white/60 text-xs mt-0.5'>Group parishes under a shared pastoral name</p>
      </div>

      <div className='p-5 space-y-6'>
        {/* Create */}
        <div className='flex gap-2'>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createCluster()}
            placeholder='Cluster name (e.g. Carlo Acutis Parish)'
            className='flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy'
          />
          <button
            onClick={createCluster}
            disabled={creating || !newName.trim()}
            className='flex items-center gap-1.5 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-navy/90 disabled:opacity-50 transition-colors'
          >
            <PlusIcon className='w-4 h-4' />
            Create
          </button>
        </div>

        {loading ? <LoadingSpinner /> : clusters.length === 0 ? (
          <p className='text-gray-500 text-sm text-center py-4'>No clusters yet.</p>
        ) : (
          <div className='space-y-5'>
            {clusters.map(cluster => {
              const state = addState[cluster.id] ?? {}
              return (
                <div key={cluster.id} className='border border-gray-100 rounded-2xl overflow-hidden'>
                  <div className='bg-lightbg px-4 py-3 flex items-center justify-between'>
                    <p className='font-bold text-navy text-sm'>{cluster.name}</p>
                    <ConfirmDeleteButton
                      aria-label={`Delete cluster ${cluster.name}`}
                      title='Delete this cluster?'
                      message={`${cluster.name} will be removed. Its parishes stay in the directory, no longer grouped. This can't be undone.`}
                      onConfirm={() => deleteCluster(cluster.id)}
                      className='text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors'
                    >
                      <TrashIcon className='w-3.5 h-3.5' />
                      Delete
                    </ConfirmDeleteButton>
                  </div>

                  <div className='divide-y divide-gray-50'>
                    {cluster.parish_cluster_members.map((m, i) => m.parishes && (
                      <div key={i} className='px-4 py-2.5 flex items-center gap-3'>
                        <BuildingLibraryIcon className='w-4 h-4 text-navy/75 flex-shrink-0' />
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium text-navy truncate'>{m.parishes.name}</p>
                          {m.parishes.city && (
                            <p className='text-xs text-gray-500'>{m.parishes.city}, {m.parishes.state}</p>
                          )}
                        </div>
                        <button aria-label={`Remove ${m.parishes.name} from ${cluster.name}`}
                          onClick={() => removeParish(cluster.id, m.parishes.id)}
                          className='text-gray-500 hover:text-red-700 transition-colors p-1 tap-target'
                        >
                          <XMarkIcon className='w-4 h-4' />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className='px-4 py-3 border-t border-gray-50 space-y-1'>
                    <div className='relative'>
                      <MagnifyingGlassIcon className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none' />
                      <input
                        value={state.query ?? ''}
                        onChange={e => searchParishes(cluster.id, e.target.value)}
                        placeholder='Add a parish by name…'
                        className='w-full border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-navy'
                      />
                    </div>
                    {state.results?.length > 0 && (
                      <div className='border border-gray-100 rounded-xl overflow-hidden'>
                        {state.results.map(p => (
                          <button
                            key={p.id}
                            onClick={() => addParish(cluster.id, p)}
                            className='w-full flex items-center gap-2 px-3 py-2 hover:bg-lightbg transition-colors text-left text-sm'
                          >
                            <span className='font-medium text-navy truncate'>{p.name}</span>
                            <span className='text-gray-500 text-xs flex-shrink-0'>{p.city}, {p.state}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
