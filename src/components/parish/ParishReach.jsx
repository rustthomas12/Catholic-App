import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from '../shared/LoadingSpinner'

// Parish reach (migration 107): aggregate counts only. Nothing here shows
// who read or opened what.

const PERIODS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

function useReach(parishId, sinceIso) {
  const [state, setState] = useState({ key: null, data: null, error: false })
  const key = `${parishId}|${sinceIso}`
  useEffect(() => {
    if (!sinceIso) return
    let cancelled = false
    supabase.rpc('parish_reach', { p_parish_id: parishId, p_since: sinceIso }).then(({ data, error }) => {
      if (!cancelled) setState({ key, data: data ?? null, error: !!error })
    })
    return () => { cancelled = true }
  }, [parishId, sinceIso, key])
  return state.key === key ? state : { data: null, error: false, loading: true }
}

function Stat({ value, label, hint }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-2xl font-bold text-navy">{Number(value ?? 0).toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

// Start of the last d days, as an ISO timestamp
function daysAgoIso(d) {
  return new Date(Date.now() - d * 86400000).toISOString()
}

function pct(part, whole) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–'
}

export function ReachTab({ parishId }) {
  const [days, setDays] = useState(30)
  // Fixed per selection so the request doesn't change on every render
  const [since, setSince] = useState(() => daysAgoIso(30))
  const { data, error, loading } = useReach(parishId, since)

  function pick(d) {
    setDays(d)
    setSince(daysAgoIso(d))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-navy">Reach</h2>
          <p className="text-xs text-gray-500">How far your parish's messages travel. Totals only: never who read what.</p>
        </div>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden" role="group" aria-label="Period">
          {PERIODS.map(p => (
            <button key={p.days} onClick={() => pick(p.days)} aria-pressed={days === p.days}
              className={`px-3 py-1.5 text-xs font-semibold ${days === p.days ? 'bg-navy text-white' : 'bg-white text-gray-600 hover:bg-lightbg'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : error || !data ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-4">Couldn't load reach right now. Please try again.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat value={data.followers} label="Parishioners on inFold" hint={`${Number(data.new_followers).toLocaleString()} new in this period`} />
            <Stat value={data.weekly_active} label="Active this week" hint="Posted, commented, liked or read an announcement" />
            <Stat value={data.people_reached} label="Saw an announcement" hint={`${Number(data.announcement_count).toLocaleString()} announcements in this period`} />
            <Stat value={data.pushes_opened} label="Opened a notification" hint={`${pct(data.pushes_opened, data.pushes_sent)} of ${Number(data.pushes_sent).toLocaleString()} sent`} />
            <Stat value={data.community_posts} label="Community posts" hint={`${Number(data.comments).toLocaleString()} comments`} />
            <Stat value={data.group_posts} label="Posts in parish groups" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h3 className="font-bold text-navy text-sm">Announcements</h3>
            </div>
            {data.announcements.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">No announcements in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-2 font-medium">Announcement</th>
                      <th className="px-2 py-2 font-medium text-right">Saw it</th>
                      <th className="px-2 py-2 font-medium text-right">Pushes</th>
                      <th className="px-4 py-2 font-medium text-right">Opened</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.announcements.map(a => (
                      <tr key={a.id}>
                        <td className="px-4 py-2.5">
                          <p className="text-navy line-clamp-1">{a.headline || 'Announcement'}</p>
                          <p className="text-xs text-gray-400">{format(parseISO(a.created_at), 'MMM d')}</p>
                        </td>
                        <td className="px-2 py-2.5 text-right text-navy font-semibold">{a.seen}</td>
                        <td className="px-2 py-2.5 text-right text-gray-600">{a.pushed}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{a.opened} <span className="text-xs text-gray-400">({pct(a.opened, a.pushed)})</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            "Saw it" counts people who had the announcement on screen in the app. Opens are counted from {format(new Date(2026, 10, 21), 'MMM d, yyyy')}; pushes held for quiet hours or over a person's daily limit aren't sent.
          </p>
        </>
      )}
    </div>
  )
}

// Day-75 trial summary on the Dashboard: shown in the last 15 days of a trial
export function TrialSummary({ parishId, subscription, addCard }) {
  const ends = subscription?.status === 'trialing' && subscription.trial_ends_at ? parseISO(subscription.trial_ends_at) : null
  const [now] = useState(() => Date.now())
  const daysLeft = ends ? Math.max(0, Math.ceil((ends - now) / 86400000)) : null
  const show = daysLeft !== null && daysLeft <= 15
  const since = show ? new Date(ends.getTime() - 90 * 86400000).toISOString() : null
  const { data } = useReach(parishId, since)

  if (!show || !data) return null

  const items = [
    ['Parishioners on inFold', data.followers],
    ['Joined during your trial', data.new_followers],
    ['Announcements sent', data.announcement_count],
    ['People who saw them', data.people_reached],
    ['Community posts', data.community_posts],
  ]

  return (
    <div className="bg-gradient-to-br from-navy to-navy/90 rounded-2xl p-5 text-white">
      <p className="text-gold text-xs font-bold tracking-widest uppercase mb-1">Your trial so far</p>
      <h2 className="text-lg font-bold mb-3">
        Here's what inFold did for your parish{daysLeft > 0 ? ` (${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left)` : ''}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {items.map(([label, v]) => (
          <div key={label}>
            <p className="text-2xl font-bold">{Number(v ?? 0).toLocaleString()}</p>
            <p className="text-xs text-white/70">{label}</p>
          </div>
        ))}
      </div>
      {addCard && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="[&>button]:bg-gold [&>button]:text-navy">{addCard}</div>
          <p className="text-xs text-white/70">You won't be charged before the trial ends. Cancel any time.</p>
        </div>
      )}
    </div>
  )
}
