import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FlagIcon, EyeSlashIcon, ArrowUturnLeftIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import { containsIlike } from '../../utils/search'
import { formatRelativeTime } from '../../utils/dates'
import { toast } from '../shared/Toast'
import LoadingSpinner from '../shared/LoadingSpinner'

// Parish moderation (migration 099). Used by the parish dashboard's
// Moderation tab and by /parish/:id/moderation for appointed moderators.
// Reporters stay anonymous here: reasons and counts only.

function excerpt(text, n = 220) {
  const s = (text || '').trim()
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s
}

export function FlagQueue({ parishId }) {
  const { t } = useTranslation('parish')
  const [rows, setRows] = useState(null)
  const [hidden, setHidden] = useState([])
  const [busy, setBusy] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const load = useCallback(() => setReloadKey(k => k + 1), [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.rpc('parish_flag_queue', { p_parish_id: parishId }),
      supabase.from('posts')
        .select('id, content, created_at, author:profiles!author_id(full_name)')
        .eq('parish_id', parishId).is('group_id', null).is('org_id', null)
        .eq('is_removed', true)
        .order('created_at', { ascending: false }).limit(20),
    ]).then(([{ data, error }, { data: removed }]) => {
      if (cancelled) return
      setRows(error ? [] : (data ?? []))
      setHidden(removed ?? [])
    })
    return () => { cancelled = true }
  }, [parishId, reloadKey])

  async function act(postId, rpc, args, done) {
    setBusy(postId)
    const { error } = await supabase.rpc(rpc, args)
    setBusy(null)
    if (error) { toast.error(error.code === '42501' ? error.message : t('moderation.error', 'Something went wrong. Please try again.')); return }
    toast.success(done)
    load()
  }

  if (rows === null) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-bold text-navy mb-1 flex items-center gap-2">
          <FlagIcon className="w-4 h-4 text-red-500" /> {t('moderation.reported', 'Reported posts')}
          {rows.length > 0 && <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{rows.length}</span>}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {t('moderation.reported_help', 'Hide a post to take it down for everyone, or keep it to close the reports. Who reported it stays private.')}
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-4">{t('moderation.none', 'No open reports. All clear.')}</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.post_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-navy truncate">{r.author_name || t('moderation.member', 'Parish member')}</p>
                  <span className="text-xs text-gray-500 flex-shrink-0">{formatRelativeTime(r.post_created_at)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line break-words">{excerpt(r.content)}</p>
                {r.image_url && <p className="text-xs text-gray-500 mt-1">{t('moderation.has_photo', '(includes a photo)')}</p>}
                <p className="text-xs text-red-600 mt-2">
                  {t('moderation.report_count', { count: Number(r.flag_count), defaultValue: '{{count}} report(s)' })}: {(r.reasons ?? []).filter(Boolean).join(', ') || t('moderation.no_reason', 'no reason given')}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button disabled={busy === r.post_id}
                    onClick={() => act(r.post_id, 'moderate_post', { p_post_id: r.post_id, p_action: 'hide' }, t('moderation.hidden_ok', 'Post hidden'))}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50">
                    <EyeSlashIcon className="w-4 h-4" /> {t('moderation.hide', 'Hide post')}
                  </button>
                  <button disabled={busy === r.post_id}
                    onClick={() => act(r.post_id, 'dismiss_post_flags', { p_post_id: r.post_id }, t('moderation.kept_ok', 'Reports closed'))}
                    className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-50">
                    {t('moderation.keep', 'Keep post')}
                  </button>
                  <Link to={`/post/${r.post_id}`} className="text-xs font-semibold px-3 py-2 text-navy hover:underline">
                    {t('moderation.open', 'Open')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {hidden.length > 0 && (
        <section>
          <h3 className="font-bold text-navy mb-1">{t('moderation.recently_hidden', 'Recently hidden')}</h3>
          <p className="text-xs text-gray-500 mb-3">{t('moderation.recently_hidden_help', 'Restore a post if it was hidden by mistake.')}</p>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {hidden.map(p => (
              <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-navy">{p.author?.full_name || t('moderation.member', 'Parish member')}</p>
                  <p className="text-xs text-gray-500 truncate">{excerpt(p.content, 120)}</p>
                </div>
                <button disabled={busy === p.id}
                  onClick={() => act(p.id, 'moderate_post', { p_post_id: p.id, p_action: 'restore' }, t('moderation.restored_ok', 'Post restored'))}
                  className="flex items-center gap-1 text-xs font-semibold text-navy hover:underline disabled:opacity-50 flex-shrink-0">
                  <ArrowUturnLeftIcon className="w-3.5 h-3.5" /> {t('moderation.restore', 'Restore')}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// Verified parish admins appoint moderators from the parish's members.
// Moderators can hide posts and comments; nothing else on the dashboard.
export function ModeratorsPanel({ parishId }) {
  const { t } = useTranslation('parish')
  const [mods, setMods] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const load = useCallback(() => setReloadKey(k => k + 1), [])

  useEffect(() => {
    let cancelled = false
    supabase.from('parish_moderators').select('user_id').eq('parish_id', parishId)
      .then(({ data }) => {
        const ids = (data ?? []).map(r => r.user_id)
        return ids.length ? supabase.from('profiles').select('id, full_name, username').in('id', ids) : { data: [] }
      })
      .then(({ data: people }) => { if (!cancelled) setMods(people ?? []) })
    return () => { cancelled = true }
  }, [parishId, reloadKey])

  const q = query.trim()
  const shownResults = q.length >= 2 ? results : []
  useEffect(() => {
    if (q.length < 2) return
    const timer = setTimeout(async () => {
      const { data: follows } = await supabase.from('parish_follows').select('user_id').eq('parish_id', parishId).limit(1000)
      const ids = (follows ?? []).map(f => f.user_id)
      if (!ids.length) { setResults([]); return }
      const { data } = await supabase.from('profiles').select('id, full_name, username')
        .in('id', ids).ilike('full_name', containsIlike(q)).limit(8)
      setResults(data ?? [])
    }, 250)
    return () => clearTimeout(timer)
  }, [q, parishId])

  async function setModerator(userId, on) {
    setBusy(true)
    const { error } = await supabase.rpc('set_parish_moderator', { p_parish_id: parishId, p_user_id: userId, p_on: on })
    setBusy(false)
    if (error) { toast.error(['42501', 'P0001'].includes(error.code) ? error.message : t('moderation.error', 'Something went wrong. Please try again.')); return }
    toast.success(on ? t('moderation.mod_added', 'Moderator added') : t('moderation.mod_removed', 'Moderator removed'))
    setQuery('')
    load()
  }

  return (
    <section>
      <h3 className="font-bold text-navy mb-1">{t('moderation.moderators', 'Moderators')}</h3>
      <p className="text-xs text-gray-500 mb-3">
        {t('moderation.moderators_help', "Trusted parishioners who can hide posts and comments in your parish's community. They can't post announcements or see anything else on the dashboard.")}
      </p>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        {mods === null ? <LoadingSpinner /> : mods.length === 0 ? (
          <p className="text-sm text-gray-500">{t('moderation.no_mods', 'No moderators yet. You and your staff can always moderate.')}</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {mods.map(m => (
              <li key={m.id} className="flex items-center gap-2 py-2">
                <span className="flex-1 text-sm text-navy truncate">{m.full_name}{m.username ? <span className="text-gray-400"> @{m.username}</span> : null}</span>
                <button disabled={busy} onClick={() => setModerator(m.id, false)}
                  aria-label={t('moderation.remove_mod', 'Remove {{name}} as moderator', { name: m.full_name })}
                  className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"><XMarkIcon className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
        <div>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t('moderation.search_member', 'Add a moderator: search your parishioners')}
            aria-label={t('moderation.search_member', 'Add a moderator: search your parishioners')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
          {shownResults.length > 0 && (
            <ul className="mt-2 border border-gray-100 rounded-xl divide-y divide-gray-50">
              {shownResults.filter(r => !mods?.some(m => m.id === r.id)).map(r => (
                <li key={r.id}>
                  <button disabled={busy} onClick={() => setModerator(r.id, true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-lightbg disabled:opacity-50">
                    <UserPlusIcon className="w-4 h-4 text-gold" /> {r.full_name}
                    {r.username && <span className="text-gray-400">@{r.username}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

// Weekly prompt threads (migration 106): the parish team turns each on or
// off. They're posted under the pastor's name and don't push on their own.
const PROMPTS = [
  { kind: 'homily',    when: ['moderation.prompt_homily_when', 'Sundays, 2pm'],     title: ['moderation.prompt_homily', "Discuss Sunday's homily"] },
  { kind: 'intention', when: ['moderation.prompt_intention_when', 'Mondays, 8am'],  title: ['moderation.prompt_intention', 'Share your intention this week'] },
  { kind: 'rides',     when: ['moderation.prompt_rides_when', 'Thursdays, 10am'],   title: ['moderation.prompt_rides', 'Need a ride to Mass?'] },
]

export function PromptsPanel({ parishId }) {
  const { t } = useTranslation('parish')
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(null) // { kind: bool }
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase.from('parish_prompts').select('kind, enabled').eq('parish_id', parishId)
      .then(({ data }) => {
        if (!cancelled) setEnabled(Object.fromEntries((data ?? []).map(r => [r.kind, r.enabled])))
      })
    return () => { cancelled = true }
  }, [parishId])

  async function toggle(kind) {
    const next = !enabled?.[kind]
    setSaving(kind)
    setEnabled(prev => ({ ...prev, [kind]: next }))
    const { error } = await supabase.from('parish_prompts').upsert(
      { parish_id: parishId, kind, enabled: next, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'parish_id,kind' })
    setSaving(null)
    if (error) {
      setEnabled(prev => ({ ...prev, [kind]: !next }))
      toast.error(t('moderation.error', 'Something went wrong. Please try again.'))
    }
  }

  return (
    <section>
      <h3 className="font-bold text-navy mb-1">{t('moderation.prompts', 'Weekly prompts')}</h3>
      <p className="text-xs text-gray-500 mb-3">
        {t('moderation.prompts_help', "Conversation starters posted in your parish's community under your name, once a week. They don't send a push of their own.")}
      </p>
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {enabled === null ? <div className="p-4"><LoadingSpinner /></div> : PROMPTS.map(p => (
          <div key={p.kind} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy">{t(...p.title)}</p>
              <p className="text-xs text-gray-500">{t(...p.when)}</p>
            </div>
            <button role="switch" aria-checked={!!enabled[p.kind]} aria-label={t(...p.title)}
              disabled={saving === p.kind} onClick={() => toggle(p.kind)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-60 ${enabled[p.kind] ? 'bg-navy' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled[p.kind] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
