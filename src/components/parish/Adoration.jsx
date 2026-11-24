import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { SunIcon, MapPinIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import { toast } from '../shared/Toast'
import ConfirmDeleteButton from '../shared/ConfirmDeleteButton'
import { adorationSlots, formatClock, normalizeEnd, validWindow, WEEKDAYS } from '../../utils/adoration'

// Eucharistic adoration with holy hour sign-ups (migration 114).
// AdorationSignup: parishioners claim slots (parish page, Events tab).
// AdorationAdmin:  the parish team creates schedules and sees who's coming.

const today = () => format(new Date(), 'yyyy-MM-dd')

function when(s) {
  const span = `${formatClock(s.start_time)} – ${formatClock(s.end_time)}`
  return s.weekday != null
    ? `Every ${WEEKDAYS[s.weekday]} · ${span}`
    : `${format(parseISO(s.on_date), 'EEEE, MMMM d')} · ${span}`
}

// Upcoming schedules for a parish, how full each slot is, and the viewer's
// own sign-ups. With `withNames`, every sign-up with the person's name (the
// parish team can read them all).
function useAdoration(parishId, { withNames = false } = {}) {
  const { user } = useAuth()
  const [state, setState] = useState({ loading: true, schedules: [], counts: {}, mine: new Set(), people: {} })

  const load = useCallback(async () => {
    if (!parishId) return
    const { data: schedules } = await supabase.from('adoration_schedules')
      .select('*').eq('parish_id', parishId)
      .order('on_date', { ascending: true, nullsFirst: true })
      .order('weekday', { ascending: true }).order('start_time', { ascending: true })
    const list = (schedules ?? []).filter(s => !s.on_date || s.on_date >= today())
    const ids = list.map(s => s.id)
    const key = (sid, i) => `${sid}:${i}`
    let counts = {}, mine = new Set(), people = {}
    if (ids.length) {
      const [{ data: c }, { data: rows }] = await Promise.all([
        supabase.rpc('adoration_slot_counts', { p_schedule_ids: ids }),
        // RLS returns only the viewer's rows, or all of them for the parish team
        supabase.from('adoration_signups').select('schedule_id, slot_index, user_id').in('schedule_id', ids),
      ])
      counts = Object.fromEntries((c ?? []).map(r => [key(r.schedule_id, r.slot_index), r.taken]))
      mine = new Set((rows ?? []).filter(r => r.user_id === user?.id).map(r => key(r.schedule_id, r.slot_index)))
      if (withNames && rows?.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', [...new Set(rows.map(r => r.user_id))])
        const names = Object.fromEntries((profs ?? []).map(p => [p.id, p.full_name]))
        for (const r of rows) (people[key(r.schedule_id, r.slot_index)] ??= []).push(names[r.user_id] ?? 'Parishioner')
      }
    }
    setState({ loading: false, schedules: list, counts, mine, people })
  }, [parishId, user?.id, withNames])

  useEffect(() => { load().catch(() => setState(s => ({ ...s, loading: false }))) }, [load])
  return { ...state, reload: load, key: (sid, i) => `${sid}:${i}` }
}

// ── Parishioners ────────────────────────────────────────────
export function AdorationSignup({ parishId }) {
  const { user } = useAuth()
  const { loading, schedules, counts, mine, reload, key } = useAdoration(parishId)
  const [busy, setBusy] = useState(null)

  if (loading || !schedules.length) return null

  async function toggle(s, slot) {
    const k = key(s.id, slot.index)
    setBusy(k)
    const res = mine.has(k)
      ? await supabase.from('adoration_signups').delete().match({ schedule_id: s.id, slot_index: slot.index, user_id: user.id })
      : await supabase.from('adoration_signups').insert({ schedule_id: s.id, slot_index: slot.index, user_id: user.id })
    if (res.error) {
      toast.error(/full/i.test(res.error.message) ? 'Sorry, that hour just filled up.' : 'Could not update your sign-up. Please try again.')
    } else if (!mine.has(k)) {
      toast.success(s.weekday != null
        ? `You're signed up for ${formatClock(slot.start)} every ${WEEKDAYS[s.weekday]}.`
        : `You're signed up for ${formatClock(slot.start)} on ${format(parseISO(s.on_date), 'MMMM d')}.`)
    }
    await reload()
    setBusy(null)
  }

  return (
    <div className="px-4 pt-4 space-y-3">
      {schedules.map(s => {
        const slots = adorationSlots(s)
        return (
          <section key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-navy px-4 py-3 flex items-start gap-3">
              <SunIcon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-white font-bold text-sm">{s.title}</h2>
                <p className="text-white/70 text-xs mt-0.5">{when(s)}</p>
                {s.location && (
                  <p className="text-white/60 text-xs mt-0.5 flex items-center gap-1">
                    <MapPinIcon className="w-3.5 h-3.5" aria-hidden="true" />{s.location}
                  </p>
                )}
              </div>
            </div>
            <div className="p-4">
              {s.notes && <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{s.notes}</p>}
              <p className="text-xs text-gray-500 mb-2">
                {s.weekday != null ? 'Pick an hour to keep each week.' : 'Pick a time to keep watch.'} Tap again to cancel.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {slots.map(slot => {
                  const k = key(s.id, slot.index)
                  const taken = counts[k] ?? 0
                  const isMine = mine.has(k)
                  const full = !isMine && taken >= s.capacity
                  return (
                    <button key={slot.index} type="button" disabled={full || busy === k} onClick={() => toggle(s, slot)}
                      aria-pressed={isMine}
                      aria-label={`${formatClock(slot.start)} to ${formatClock(slot.end)}, ${taken} of ${s.capacity} signed up${isMine ? ', including you' : ''}`}
                      className={`min-h-[52px] rounded-xl border px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed ${
                        isMine ? 'bg-gold/15 border-gold text-navy'
                          : full ? 'bg-gray-50 border-gray-100 text-gray-400'
                          : 'bg-white border-gray-200 text-navy hover:border-navy/40'}`}>
                      <span className="block text-sm font-semibold">{formatClock(slot.start)}</span>
                      <span className="block text-[11px] mt-0.5">
                        {isMine ? 'You’re signed up ✓' : full ? 'Full' : taken === 0 ? 'Open' : `${taken} of ${s.capacity}`}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ── Parish team ─────────────────────────────────────────────
const EMPTY = { kind: 'weekly', title: 'Eucharistic Adoration', weekday: '5', on_date: '', start_time: '09:00', end_time: '17:00', slot_minutes: '60', capacity: '2', location: '', notes: '' }

export function AdorationAdmin({ parishId }) {
  const { user } = useAuth()
  const { loading, schedules, counts, people, reload, key } = useAdoration(parishId, { withNames: true })
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    if (!validWindow(form.start_time, form.end_time)) { toast.error('The end time must be after the start time.'); return }
    if (form.kind === 'once' && (!form.on_date || form.on_date < today())) { toast.error('Pick a date from today on.'); return }
    setSaving(true)
    const { error } = await supabase.from('adoration_schedules').insert({
      parish_id: parishId,
      title: form.title.trim() || 'Eucharistic Adoration',
      weekday: form.kind === 'weekly' ? Number(form.weekday) : null,
      on_date: form.kind === 'once' ? form.on_date : null,
      start_time: form.start_time,
      end_time: normalizeEnd(form.end_time),
      slot_minutes: Number(form.slot_minutes),
      capacity: Number(form.capacity),
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      created_by: user?.id,
    })
    setSaving(false)
    if (error) { toast.error('Could not save the schedule. Please try again.'); return }
    toast.success('Adoration schedule added. Parishioners can sign up on the parish page under Events.')
    setForm(null)
    reload()
  }

  async function remove(s) {
    const { error } = await supabase.from('adoration_schedules').delete().eq('id', s.id)
    if (error) { toast.error('Could not delete. Please try again.'); return }
    toast.success('Schedule deleted.')
    reload()
  }

  const input = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy'
  const label = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-navy">Adoration</h2>
          <p className="text-xs text-gray-500 mt-0.5">Set up holy hours. Parishioners sign up on the parish page under Events.</p>
        </div>
        {!form && (
          <button type="button" onClick={() => setForm(EMPTY)}
            className="flex items-center gap-1.5 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-navy/90 min-h-[40px] flex-shrink-0">
            <PlusIcon className="w-4 h-4" aria-hidden="true" /> New schedule
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Schedule type">
            {[['weekly', 'Weekly', 'Same hours every week'], ['once', 'One time', 'A single date, e.g. First Friday']].map(([v, t, d]) => (
              <button key={v} type="button" role="radio" aria-checked={form.kind === v} onClick={() => setForm(f => ({ ...f, kind: v }))}
                className={`text-left rounded-xl border px-3 py-2.5 ${form.kind === v ? 'border-navy bg-navy/5' : 'border-gray-200'}`}>
                <span className="block text-sm font-semibold text-navy">{t}</span>
                <span className="block text-xs text-gray-500">{d}</span>
              </button>
            ))}
          </div>
          <div>
            <label className={label} htmlFor="ad-title">Title</label>
            <input id="ad-title" className={input} maxLength={80} value={form.title} onChange={set('title')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              {form.kind === 'weekly' ? (<>
                <label className={label} htmlFor="ad-day">Day</label>
                <select id="ad-day" className={input} value={form.weekday} onChange={set('weekday')}>
                  {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </>) : (<>
                <label className={label} htmlFor="ad-date">Date</label>
                <input id="ad-date" type="date" className={input} min={today()} value={form.on_date} onChange={set('on_date')} required />
              </>)}
            </div>
            <div>
              <label className={label} htmlFor="ad-start">Starts</label>
              <input id="ad-start" type="time" step="900" className={input} value={form.start_time} onChange={set('start_time')} required />
            </div>
            <div>
              <label className={label} htmlFor="ad-end">Ends</label>
              <input id="ad-end" type="time" step="900" className={input} value={form.end_time} onChange={set('end_time')} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="ad-slot">Sign-up slots</label>
              <select id="ad-slot" className={input} value={form.slot_minutes} onChange={set('slot_minutes')}>
                <option value="60">1 hour</option>
                <option value="30">30 minutes</option>
                <option value="15">15 minutes</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="ad-cap">Adorers per slot</label>
              <input id="ad-cap" type="number" min="1" max="20" className={input} value={form.capacity} onChange={set('capacity')} required />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="ad-loc">Where (optional)</label>
            <input id="ad-loc" className={input} maxLength={120} placeholder="e.g. Adoration chapel" value={form.location} onChange={set('location')} />
          </div>
          <div>
            <label className={label} htmlFor="ad-notes">Notes for adorers (optional)</label>
            <textarea id="ad-notes" rows={2} className={input} maxLength={500} placeholder="e.g. Use the side door after 6pm" value={form.notes} onChange={set('notes')} />
          </div>
          <p className="text-xs text-gray-500">An end time of 12:00 AM means until midnight.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setForm(null)} className="flex-1 min-h-[44px] border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 min-h-[44px] bg-gold text-navy rounded-xl text-sm font-bold disabled:opacity-60">
              {saving ? 'Saving…' : 'Add schedule'}
            </button>
          </div>
        </form>
      )}

      {loading ? null : !schedules.length && !form ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <SunIcon className="w-10 h-10 text-gold/60 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-navy font-semibold">No adoration scheduled</p>
          <p className="text-xs text-gray-500 mt-1">Add a weekly holy hour schedule or a one-time adoration, and parishioners can sign up for slots.</p>
        </div>
      ) : schedules.map(s => {
        const slots = adorationSlots(s)
        const empty = slots.filter(sl => !(counts[key(s.id, sl.index)] > 0)).length
        return (
          <section key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-navy text-sm">{s.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{when(s)}{s.location ? ` · ${s.location}` : ''}</p>
                <p className={`text-xs mt-1 font-semibold ${empty ? 'text-amber-700' : 'text-green-700'}`}>
                  {empty ? `${empty} of ${slots.length} slots have nobody yet` : 'Every slot is covered'}
                </p>
              </div>
              <ConfirmDeleteButton
                title="Delete this schedule?"
                message="Everyone's sign-ups for it will be removed. This can't be undone."
                aria-label={`Delete ${s.title}`}
                onConfirm={() => remove(s)}
                className="text-gray-400 hover:text-red-600 p-1"
              >
                <TrashIcon className="w-5 h-5" aria-hidden="true" />
              </ConfirmDeleteButton>
            </div>
            <ul className="divide-y divide-gray-50">
              {slots.map(sl => {
                const names = people[key(s.id, sl.index)] ?? []
                return (
                  <li key={sl.index} className="px-4 py-2 flex items-center gap-3 text-sm">
                    <span className="w-36 flex-shrink-0 text-gray-600">{formatClock(sl.start)} – {formatClock(sl.end)}</span>
                    <span className={`flex-1 min-w-0 truncate ${names.length ? 'text-navy' : 'text-amber-700'}`}>
                      {names.length ? names.join(', ') : 'Nobody yet'}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{names.length}/{s.capacity}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
