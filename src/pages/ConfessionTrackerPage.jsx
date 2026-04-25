import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheckIcon, ChevronLeftIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'
import { format, differenceInDays, parseISO } from 'date-fns'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'

const REMINDER_KEY = 'confession_reminder_days'
const REMINDER_OPTIONS = [7, 14, 30, 45, 90, null]
const REMINDER_LABELS = { 7: '7d', 14: '14d', 30: '30d', 45: '45d', 90: '90d', null: 'Off' }

export default function ConfessionTrackerPage() {
  document.title = 'Confession Tracker | Communio'

  const { t } = useTranslation('premium')
  const navigate = useNavigate()
  const { user } = useAuth()

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [logging, setLogging] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [reminderDays, setReminderDays] = useState(() => {
    const saved = localStorage.getItem(REMINDER_KEY)
    return saved === 'null' ? null : saved ? parseInt(saved, 10) : 30
  })

  // Load confession history
  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    supabase
      .from('confession_tracker')
      .select('id, confessed_at')
      .eq('user_id', user.id)
      .order('confessed_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data) setHistory(data)
        setLoading(false)
      })
  }, [user, isPremium])

  const lastConfession = history[0] ?? null
  const daysSince = lastConfession
    ? differenceInDays(new Date(), parseISO(lastConfession.confessed_at))
    : null

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const alreadyLoggedToday = history.some(h => h.confessed_at === todayStr)

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
      toast.success('History cleared')
    }
    setClearing(false)
  }

  function handleReminderChange(val) {
    setReminderDays(val)
    localStorage.setItem(REMINDER_KEY, String(val))
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* ── Header ── */}
        <div className="bg-navy px-4 pt-5 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="text-white/70 hover:text-white p-1 flex items-center transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-white font-bold text-xl">{t('tracker_title')}</h1>
          </div>
          <p className="text-gray-300 text-sm ml-8">{t('tracker_subtitle')}</p>
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
                <p className="text-sm text-gray-400">{t('tracker_never')}</p>
              </>
            ) : daysSince === 0 ? (
              <>
                <CheckCircleIcon className="w-16 h-16 text-gold mx-auto mb-2" />
                <p className="text-sm font-semibold text-navy">Confession recorded today</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(parseISO(lastConfession.confessed_at), 'MMMM d, yyyy')}
                </p>
              </>
            ) : (
              <>
                <p className="text-6xl font-bold text-navy mb-1">{daysSince}</p>
                <p className="text-sm text-gray-500">
                  {t('tracker_last', { days: daysSince })}
                </p>
                <p className="text-xs text-gray-400 mt-1">
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
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gold text-navy hover:bg-gold/90 active:scale-[0.98]'
            }`}
          >
            {logging ? 'Saving…' : alreadyLoggedToday ? 'Logged today' : t('tracker_log')}
          </button>

          {/* ── Reminder frequency ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-navy mb-3">{t('tracker_reminder')}</p>
            <div className="flex gap-2 flex-wrap">
              {REMINDER_OPTIONS.map((val) => (
                <button
                  key={String(val)}
                  onClick={() => handleReminderChange(val)}
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
              <p className="text-xs text-gray-400 mt-2">
                Reminders every {reminderDays} days (notifications coming soon)
              </p>
            )}
          </div>

          {/* ── History ── */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-navy">History</p>
                <button
                  onClick={() => setClearConfirm(true)}
                  className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  {t('tracker_clear')}
                </button>
              </div>
              <div className="space-y-1">
                {history.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                      <p className="text-sm text-navy">
                        {format(parseISO(entry.confessed_at), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    {i === 0 && (
                      <span className="text-xs bg-gold/10 text-gold font-semibold px-2 py-0.5 rounded-full">
                        Most recent
                      </span>
                    )}
                  </div>
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
              to="/examination"
              className="text-xs font-bold text-gold bg-white border border-gold/30 px-3 py-2 rounded-xl hover:bg-gold/5 transition-colors flex-shrink-0 ml-3"
            >
              Open →
            </Link>
          </div>

        </div>
      </div>

      {/* ── Clear confirmation modal ── */}
      {clearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="font-bold text-navy text-base mb-2">Clear history?</p>
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
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {clearing ? 'Clearing…' : 'Clear all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
