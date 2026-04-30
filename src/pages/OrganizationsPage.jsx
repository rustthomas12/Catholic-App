import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  BuildingOffice2Icon,
  PlusIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

// ── useOrgSearch ───────────────────────────────────────────
function useOrgSearch() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  const search = useCallback((query) => {
    clearTimeout(debounceRef.current)
    const trimmed = (query ?? '').trim()
    if (trimmed.length < 2) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('organizations')
        .select('id, name, slug, description, category, city, state, is_official')
        .or(`name.ilike.%${trimmed}%,city.ilike.%${trimmed}%,state.ilike.%${trimmed}%,category.ilike.%${trimmed}%`)
        .order('is_official', { ascending: false })
        .limit(40)
      if (err) { setError(err.message); setLoading(false); return }
      setResults(data ?? [])
      setLoading(false)
    }, 300)
  }, [])

  const clear = useCallback(() => {
    clearTimeout(debounceRef.current)
    setResults([])
    setError(null)
    setLoading(false)
  }, [])

  return { results, loading, error, search, clear }
}

// ── useMyOrgs ──────────────────────────────────────────────
function useMyOrgs(userId) {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    supabase
      .from('organization_members')
      .select('org_id, role, organizations(id, name, slug, category, city, state, is_official)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .then(({ data }) => {
        setOrgs((data ?? []).map(d => ({ ...d.organizations, role: d.role })).filter(Boolean))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId])

  return { orgs, loading }
}

// ── OrgCard ────────────────────────────────────────────────
function OrgCard({ org, isSubscribed = false }) {
  return (
    <Link
      to={`/organization/${org.id}`}
      className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
    >
      <div className="w-10 h-10 bg-navy/5 rounded-xl flex items-center justify-center flex-shrink-0">
        <BuildingOffice2Icon className="w-5 h-5 text-navy" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-bold text-navy text-sm leading-snug">{org.name}</p>
          {org.is_official && (
            <CheckBadgeIcon className="w-4 h-4 text-gold flex-shrink-0" title="Official" />
          )}
          {isSubscribed && (
            <span className="inline-flex items-center text-[10px] font-semibold bg-gold/10 text-gold border border-gold/20 px-1.5 py-0.5 rounded-full">
              ✓ Member
            </span>
          )}
        </div>
        {org.category && (
          <span className="inline-block text-[10px] font-semibold text-navy/60 bg-navy/5 px-2 py-0.5 rounded-full mt-0.5 capitalize">
            {org.category}
          </span>
        )}
        {(org.city || org.state) && (
          <p className="text-xs text-gray-400 mt-0.5">
            {[org.city, org.state].filter(Boolean).join(', ')}
          </p>
        )}
        {org.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{org.description}</p>
        )}
        {org.role && (
          <span className={`inline-block text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${
            org.role === 'admin' ? 'bg-gold/20 text-navy' : 'bg-gray-100 text-gray-500'
          }`}>
            {org.role === 'admin' ? 'Admin' : 'Member'}
          </span>
        )}
      </div>
    </Link>
  )
}

// ── OrganizationsPage ──────────────────────────────────────
export default function OrganizationsPage() {
  useEffect(() => { document.title = 'Organizations | Communio' }, [])
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const { results, loading: searchLoading, search, clear } = useOrgSearch()
  const { orgs: myOrgs, loading: myOrgsLoading } = useMyOrgs(user?.id)
  const [subscribedOrgIds, setSubscribedOrgIds] = useState(new Set())

  useEffect(() => {
    if (query.trim().length >= 2) search(query)
    else clear()
  }, [query, search, clear])

  // Fetch subscription status for visible orgs
  useEffect(() => {
    const orgsToCheck = [
      ...(myOrgs.map(o => o.id)),
      ...(results.map(o => o.id)),
    ]
    const unique = [...new Set(orgsToCheck)]
    if (!unique.length) return
    supabase
      .from('org_subscriptions')
      .select('org_id, status')
      .in('org_id', unique)
      .in('status', ['trialing', 'active'])
      .then(({ data }) => {
        setSubscribedOrgIds(new Set((data ?? []).map(s => s.org_id)))
      })
  }, [myOrgs, results])

  const isSearching = query.trim().length >= 2

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-3xl mx-auto pb-24 md:pb-8">

        {/* Header */}
        <div className="bg-navy px-4 pt-6 pb-5 md:pt-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-white font-bold text-xl">Organizations</h1>
            <Link
              to="/organizations/new"
              className="flex items-center gap-1.5 text-xs font-semibold bg-gold text-navy px-3 py-2 rounded-full"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              New
            </Link>
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, category, or city…"
              className="w-full bg-white pl-10 pr-10 py-3 rounded-xl text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); clear() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pt-4 space-y-6">

          {/* My organizations */}
          {!isSearching && !myOrgsLoading && myOrgs.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Your organizations
              </h2>
              <div className="space-y-2">
                {myOrgs.map((org) => (
                  <OrgCard key={org.id} org={org} isSubscribed={subscribedOrgIds.has(org.id)} />
                ))}
              </div>
            </section>
          )}

          {/* Search results */}
          {isSearching && (
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                {searchLoading
                  ? 'Searching…'
                  : `Results${results.length ? ` (${results.length})` : ''}`}
              </h2>

              {searchLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <BuildingOffice2Icon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-navy font-semibold text-sm">No organizations found</p>
                  <p className="text-gray-400 text-xs mt-1">Try a different name or category</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((org) => (
                    <OrgCard key={org.id} org={org} isSubscribed={subscribedOrgIds.has(org.id)} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Empty state */}
          {!isSearching && myOrgs.length === 0 && !myOrgsLoading && (
            <section>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <div className="w-14 h-14 bg-lightbg rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <BuildingOffice2Icon className="w-7 h-7 text-navy" />
                </div>
                <h3 className="font-bold text-navy mb-1">Discover Catholic organizations</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Search for ministries, apostolates, and Catholic organizations to join.
                </p>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  )
}
