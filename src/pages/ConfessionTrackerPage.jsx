import Modal from '../components/shared/Modal'
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/shared/TopBar'
import { ShieldCheckIcon, TrashIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'

const REMINDER_KEY = 'confession_reminder_days'
const REMINDER_OPTIONS = [7, 14, 30, 45, 90, null]
const REMINDER_LABELS = { 7: '7d', 14: '14d', 30: '30d', 45: '45d', 90: '90d', null: 'Off' }

export default function ConfessionTrackerPage() {
  useEffect(() => { document.title = 'Confession Tracker | inFold' }, [])

  const { t } = useTranslation('premium')
  const { user } = useAuth()
  const userId = user?.id

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [logging, setLogging] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [reminderDays, setReminderDays] = useState(() => {
    const saved = localStorage.getItem(REMINDER_KEY)
    return saved === 'null' ? null : saved ? parseInt(saved, 10) : 30
  })

  // Add-a-past-date / edit-an-entry dialog: { entry (null when adding), date }
  const [editor, setEditor] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // Load confession history (newest first)
  const loadHistory = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('confession_tracker')
      .select('id, confessed_at')
      .eq('user_id', userId)
      .order('confessed_at', { ascending: false })
      .limit(10)
    if (!error && data) setHistory(data)
    setLoading(false)
  }, [userId])

  useEffect(() => { loadHistory() }, [loadHistory])

  const lastConfession = history[0] ?? null
  const daysSince = lastConfession
    ? differenceInCalendarDays(new Date(), parseISO(lastConfession.confessed_at))
    : null

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const alreadyLoggedToday = history.some(h => h.confessed_at === todayStr)

  // Add a confession you forgot to log, or change / remove an entry's date
  async function handleSaveEdit() {
    if (!user?.id || !editor || savingEdit) return
    const { entry, date } = editor
    if (!date || date > todayStr) { toast.error(t('tracker_date_future')); return }
    if (entry && date === entry.confessed_at) { setEditor(null); return }
    if (history.some(h => h.confessed_at === date && h.id !== entry?.id)) {
      toast.error(t('tracker_date_exists'))
      return
    }
    setSavingEdit(true)
    const { error } = entry
      ? await supabase.from('confession_tracker').update({ confessed_at: date }).eq('id', entry.id).eq('user_id', user.id)
      : await supabase.from('confession_tracker').insert({ user_id: user.id, confessed_at: date })
    setSavingEdit(false)
    if (error) { toast.error(t('tracker_save_error')); return }
    setEditor(null)
    toast.success(t(entry ? 'tracker_updated' : 'tracker_added'))
    loadHistory()
  }

  async function handleDeleteEntry() {
    if (!user?.id || !editor?.entry || savingEdit) return
    setSavingEdit(true)
    const { error } = await supabase.from('confession_tracker').delete().eq('id', editor.entry.id).eq('user_id', user.id)
    setSavingEdit(false)
    if (error) { toast.error(t('tracker_save_error')); return }
    setEditor(null)
    toast.success(t('tracker_deleted'))
    loadHistory()
  }

  async function handleLog() {
    if (!user?.id || alreadyLoggedToday || logging) return
    setLogging(true)
    const { data, error } = await supabase
      .from('confession_tracker')
      .insert({ user_id: user.id, confessed_at: todayStr })
      .select('id, confessed_at')
      .single()
    if (error) {
      toast.error('Could not save. Please try again.')
    } else {
      setHistory(prev => [data, ...prev].slice(0, 10))
      toast.success(t('tracker_logged'))
    }
    setLogging(false)
  }

  async function handleClearHistory() {
    if (!user?.id || clearing) return
    setClearing(true)
    const { error } = await supabase
      .from('confession_tracker')
      .delete()
      .eq('user_id', user.id)
    if (error) {
      toast.error('Could not clear history.')
    } else {
      setHistory([])
      setClearConfirm(false)
      toast.success(t('tracker_history_cleared'))
    }
    setClearing(false)
  }

  // The server sends the reminders, so the interval is saved to the account
  // (notification_preferences); "Off" turns the confession reminder off.
  async function handleReminderChange(val) {
    const prev = reminderDays
    setReminderDays(val)
    if (!user) return
    const { error } = await supabase.from('notification_preferences').upsert({
      user_id: user.id,
      confession_reminder: val !== null,
      ...(val !== null ? { reminder_interval_days: val } : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) {
      // Don't show a reminder setting the server never received
      setReminderDays(prev)
      toast.error('Could not save your reminder. Please try again.')
      return
    }
    localStorage.setItem(REMINDER_KEY, String(val))
  }

  // Load the saved interval from the account (falls back to this device's choice)
  useEffect(() => {
    if (!user) return
    supabase.from('notification_preferences')
      .select('confession_reminder, reminder_interval_days')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setReminderDays(data.confession_reminder === false ? null : (data.reminder_interval_days ?? 30))
      })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* ── Header ── */}
        <TopBar variant="navy" title={t('tracker_title')} back={true} />
        <div className="bg-navy px-4 pb-6">
          <p className="text-white/75 text-sm ml-10">{t('tracker_subtitle')}</p>
        </div>

        <div className="px-4 pt-6 space-y-5">

          {/* ── Privacy notice ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <ShieldCheckIcon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">{t('tracker_privacy')}</p>
          </div>

          {/* ── Days since counter ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-16 w-24 bg-gray-100 rounded-xl mx-auto mb-3" />
                <div className="h-4 w-40 bg-gray-100 rounded mx-auto" />
              </div>
            ) : daysSince === null ? (
              <>
                <p className="text-5xl font-bold text-gray-200 mb-2">—</p>
                <p className="text-sm text-gray-500">{t('tracker_never')}</p>
              </>
            ) : daysSince === 0 ? (
              <>
                <CheckCircleIcon className="w-16 h-16 text-gold mx-auto mb-2" />
                <p className="text-sm font-semibold text-navy">{t('tracker_recorded_today')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(parseISO(lastConfession.confessed_at), 'MMMM d, yyyy')}
                </p>
              </>
            ) : (
              <>
                <p className="text-6xl font-bold text-navy mb-1">{daysSince}</p>
                <p className="text-sm text-gray-500">
                  {t('tracker_last', { count: daysSince })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(parseISO(lastConfession.confessed_at), 'MMMM d, yyyy')}
                </p>
              </>
            )}
          </div>

          {/* ── Log button ── */}
          <button
            onClick={handleLog}
            disabled={alreadyLoggedToday || logging}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
              alreadyLoggedToday
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-gold text-navy hover:bg-gold/90 active:scale-[0.98]'
            }`}
          >
            {logging ? t('tracker_saving') : alreadyLoggedToday ? t('tracker_logged_today') : t('tracker_log')}
          </button>
          <button
            type="button"
            onClick={() => setEditor({ entry: null, date: todayStr })}
            className="w-full -mt-2 flex items-center justify-center gap-1.5 min-h-[44px] text-sm font-semibold text-navy hover:underline"
          >
            <PlusIcon className="w-4 h-4" />
            {t('tracker_add_past')}
          </button>

          {/* ── Reminder frequency ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-navy mb-3">{t('tracker_reminder')}</p>
            <div className="flex gap-2 flex-wrap">
              {REMINDER_OPTIONS.map((val) => (
                <button
                  key={String(val)}
                  onClick={() => handleReminderChange(val)}
                  aria-pressed={reminderDays === val}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    reminderDays === val
                      ? 'bg-gold text-navy'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {REMINDER_LABELS[val]}
                </button>
              ))}
            </div>
            {reminderDays !== null && (
              <p className="text-xs text-gray-500 mt-2">
                {t('tracker_reminder_note', { days: reminderDays })}
              </p>
            )}
          </div>

          {/* ── History ── */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-navy">{t('tracker_history')}</p>
                <button
                  onClick={() => setClearConfirm(true)}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 min-h-[32px] transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  {t('tracker_clear')}
                </button>
              </div>
              <p className="text-xs text-gray-500 -mt-2 mb-2">{t('tracker_edit_hint')}</p>
              <div className="space-y-1">
                {history.map((entry, i) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setEditor({ entry, date: entry.confessed_at })}
                    aria-label={`${t('tracker_edit_title')}: ${format(parseISO(entry.confessed_at), 'MMMM d, yyyy')}`}
                    className="w-full flex items-center justify-between py-2 min-h-[44px] border-b border-gray-50 last:border-0 text-left hover:bg-lightbg rounded-lg px-1 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                      <p className="text-sm text-navy">
                        {format(parseISO(entry.confessed_at), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <span className="flex items-center gap-2">
                      {i === 0 && (
                        <span className="text-xs bg-gold/10 text-navy font-semibold px-2 py-0.5 rounded-full">
                          {t('tracker_most_recent')}
                        </span>
                      )}
                      <PencilSquareIcon className="w-4 h-4 text-gray-500" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Examination of conscience link ── */}
          <div className="bg-navy/5 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-navy">{t('examination_title')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('examination_subtitle')}</p>
            </div>
            <Link
              to="/premium/examination"
              className="text-xs font-bold text-navy bg-white border border-gold/40 px-3 py-2 min-h-[36px] rounded-xl hover:bg-gold/10 transition-colors flex-shrink-0 ml-3"
            >
              Open →
            </Link>
          </div>

        </div>
      </div>

      {/* ── Add a past confession / edit an entry ── */}
      {editor && (
        <Modal isOpen onClose={() => setEditor(null)} title={t(editor.entry ? 'tracker_edit_title' : 'tracker_add_title')} size="sm">
          <label htmlFor="confession-date" className="block text-sm font-semibold text-navy mb-1.5">{t('tracker_date_label')}</label>
          <input
            id="confession-date"
            type="date"
            value={editor.date}
            max={todayStr}
            onChange={e => setEditor(ed => ({ ...ed, date: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-navy focus:outline-none focus:border-navy mb-5"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditor(null)}
              className="flex-1 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {t('tracker_cancel')}
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={savingEdit || !editor.date}
              className="flex-1 py-2.5 min-h-[44px] bg-gold text-navy rounded-xl text-sm font-bold hover:bg-gold/90 transition-colors disabled:opacity-60"
            >
              {savingEdit ? t('tracker_saving') : t('tracker_save')}
            </button>
          </div>
          {editor.entry && (
            <button
              type="button"
              onClick={handleDeleteEntry}
              disabled={savingEdit}
              className="w-full mt-3 flex items-center justify-center gap-1.5 min-h-[44px] text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-60"
            >
              <TrashIcon className="w-4 h-4" />
              {t('tracker_delete_entry')}
            </button>
          )}
        </Modal>
      )}

      {/* ── Clear confirmation modal ── */}
      {clearConfirm && (
        <Modal isOpen onClose={() => setClearConfirm(false)} title={t('tracker_clear_title')} size="sm">
          <p className="text-sm text-gray-500 mb-5">{t('tracker_clear_confirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setClearConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                disabled={clearing}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {clearing ? 'Clearing…' : 'Clear all'}
              </button>
            </div>
        </Modal>
      )}
    </div>
  )
}
