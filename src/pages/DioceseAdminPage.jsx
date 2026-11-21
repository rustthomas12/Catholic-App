import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeftIcon, PlusIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { supabase, authJsonHeaders } from '../lib/supabase'
import { apiUrl, openExternal, canPurchaseInApp } from '../lib/platform'
import IosPlanNotice from '../components/shared/IosPlanNotice'
import { containsIlike } from '../utils/search'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { toast } from '../components/shared/Toast'

// /diocese-admin/:id: the diocese plan (migration 108). $49 per covered
// parish per month; the diocese picks its parishes; reach is rolled up from
// each parish (totals only, never who read what).

const PRICE_PER_PARISH = 49
const COVERING = ['active', 'trialing', 'past_due']

async function dioceseApi(body) {
  const res = await fetch(apiUrl('/api/diocese'), {
    method: 'POST',
    headers: await authJsonHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

function Stat({ value, label }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-2xl font-bold text-navy">{Number(value ?? 0).toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function DioceseAdminPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [diocese, setDiocese] = useState(null)
  const [sub, setSub] = useState(null)
  const [reach, setReach] = useState(null)
  const [denied, setDenied] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [busy, setBusy] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => { document.title = 'Diocese | inFold' }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('dioceses').select('id, name').eq('id', id).maybeSingle(),
      supabase.from('diocese_subscriptions').select('*').eq('diocese_id', id).maybeSingle(),
      supabase.rpc('diocese_reach', { p_diocese_id: id }),
    ]).then(([{ data: d }, { data: s }, { data: r, error }]) => {
      if (cancelled) return
      setDiocese(d)
      setSub(s)
      setReach(r)
      setDenied(!!error)
    })
    return () => { cancelled = true }
  }, [id, reloadKey])

  // Back from Stripe checkout: the webhook may land a moment later
  useEffect(() => {
    if (searchParams.get('plan') !== 'started') return
    toast.success('Thank you! Your diocese plan is starting.')
    const next = new URLSearchParams(searchParams)
    next.delete('plan')
    setSearchParams(next, { replace: true })
    const t = setTimeout(reload, 2500)
    return () => clearTimeout(t)
  }, [searchParams, setSearchParams, reload])

  const covered = reach?.parishes ?? []
  const coveredIds = new Set(covered.map((p) => p.parish_id))
  const running = COVERING.includes(sub?.status)

  const q = query.trim()
  const shownResults = q.length >= 2 ? results.filter((r) => !coveredIds.has(r.id)) : []
  useEffect(() => {
    if (q.length < 2 || !diocese) return
    const t = setTimeout(async () => {
      const { data } = await supabase.from('parishes').select('id, name, city')
        .eq('diocese', diocese.name).ilike('name', containsIlike(q)).order('name').limit(10)
      setResults(data ?? [])
    }, 250)
    return () => clearTimeout(t)
  }, [q, diocese])

  async function setParish(parishId, on) {
    setBusy(parishId)
    try {
      await dioceseApi({ dioceseId: id, action: 'set-parish', parishId, on })
      toast.success(on ? 'Parish added' : 'Parish removed')
      setQuery('')
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function go(action) {
    setBusy(action)
    try {
      const { url } = await dioceseApi({ dioceseId: id, action })
      await openExternal(url)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(null)
    }
  }

  if (!diocese && !denied) return <LoadingSpinner fullPage />

  if (denied || !diocese) {
    return (
      <div className="min-h-screen bg-cream md:pl-60 flex items-center justify-center p-6">
        <p className="text-sm text-gray-500">Only this diocese's admins can see this page.</p>
      </div>
    )
  }

  const t = reach?.totals ?? {}
  const monthly = covered.length * PRICE_PER_PARISH

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="bg-navy px-4 pt-5 pb-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/" aria-label="Back" className="text-white/70 hover:text-white"><ArrowLeftIcon className="w-5 h-5" /></Link>
          <div>
            <p className="text-gold text-xs font-bold tracking-widest uppercase">Diocese plan</p>
            <h1 className="text-white text-xl font-bold">{diocese.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Plan. On iOS: status only, no prices or buttons (guideline 3.1.1) */}
        {!canPurchaseInApp ? (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="font-bold text-navy">{running ? `Plan active: ${covered.length} ${covered.length === 1 ? 'parish' : 'parishes'}` : 'No plan yet'}</p>
            {!running && <div className="mt-1"><IosPlanNotice kind="diocese" compact /></div>}
          </section>
        ) : (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[14rem]">
            {running ? (
              <>
                <p className="font-bold text-navy">
                  Plan active: {covered.length} {covered.length === 1 ? 'parish' : 'parishes'}, ${monthly.toLocaleString()}/month
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  ${PRICE_PER_PARISH} per parish per month on autopay
                  {sub?.current_period_end ? `, renews ${format(parseISO(sub.current_period_end), 'MMM d, yyyy')}` : ''}.
                  Adding or removing a parish adjusts the bill, prorated.
                  {sub?.status === 'past_due' ? ' The last payment failed: please update the card.' : ''}
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-navy">No plan yet</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pick the parishes to cover below, then start the plan: ${PRICE_PER_PARISH} per parish per month on card autopay.
                  Parishes already paying for themselves stop being charged when their current paid month ends.
                </p>
              </>
            )}
          </div>
          {running ? (
            <button onClick={() => go('portal')} disabled={busy === 'portal'}
              className="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-navy hover:bg-lightbg disabled:opacity-60">
              {busy === 'portal' ? 'Opening…' : 'Manage billing'}
            </button>
          ) : (
            <button onClick={() => go('checkout')} disabled={busy === 'checkout' || covered.length === 0}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-gold text-navy hover:bg-gold/90 disabled:opacity-50">
              {busy === 'checkout' ? 'Opening…' : covered.length ? `Start plan: $${monthly.toLocaleString()}/month` : 'Add a parish to start'}
            </button>
          )}
        </section>
        )}

        {/* Totals */}
        <section>
          <h2 className="font-bold text-navy mb-1">Reach across your parishes</h2>
          <p className="text-xs text-gray-500 mb-3">Last 30 days. Totals only: never who read what.</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Stat value={t.followers} label="Parishioners on inFold" />
            <Stat value={t.new_followers} label="New in 30 days" />
            <Stat value={t.weekly_active} label="Active this week" />
            <Stat value={t.announcement_count} label="Announcements" />
            <Stat value={t.people_reached} label="Saw an announcement" />
          </div>
        </section>

        {/* Parishes */}
        <section>
          <h2 className="font-bold text-navy mb-3">Covered parishes</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {covered.length === 0 ? (
              <p className="text-sm text-gray-500 p-4">No parishes yet. Add them below.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-2 font-medium">Parish</th>
                      <th className="px-2 py-2 font-medium text-right">Parishioners</th>
                      <th className="px-2 py-2 font-medium text-right">Active</th>
                      <th className="px-2 py-2 font-medium text-right">Announcements</th>
                      <th className="px-2 py-2 font-medium text-right">Saw one</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {covered.map((p) => (
                      <tr key={p.parish_id}>
                        <td className="px-4 py-2.5">
                          <Link to={`/parish/${p.parish_id}`} className="text-navy font-medium hover:underline">{p.name}</Link>
                          <p className="text-xs text-gray-400">
                            {p.city}{!p.has_admin && <span className="ml-1 text-amber-600">· no parish admin yet</span>}
                          </p>
                        </td>
                        <td className="px-2 py-2.5 text-right">{p.reach?.followers ?? 0}</td>
                        <td className="px-2 py-2.5 text-right">{p.reach?.weekly_active ?? 0}</td>
                        <td className="px-2 py-2.5 text-right">{p.reach?.announcement_count ?? 0}</td>
                        <td className="px-2 py-2.5 text-right">{p.reach?.people_reached ?? 0}</td>
                        <td className="px-2 py-2.5 text-right">
                          <button onClick={() => setParish(p.parish_id, false)} disabled={busy === p.parish_id}
                            aria-label={`Remove ${p.name}`} className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-50">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="border-t border-gray-100 p-4">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Add a parish in the ${diocese.name}`} aria-label="Add a parish"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              {shownResults.length > 0 && (
                <ul className="mt-2 border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {shownResults.map((r) => (
                    <li key={r.id}>
                      <button onClick={() => setParish(r.id, true)} disabled={busy === r.id}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-lightbg disabled:opacity-50">
                        <PlusIcon className="w-4 h-4 text-gold" /> {r.name}
                        <span className="text-gray-400">{r.city}</span>
                        {running && canPurchaseInApp && <span className="ml-auto text-xs text-gray-400">+${PRICE_PER_PARISH}/mo</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
