import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'
import { useFollowedParishes } from './useParish.js'
import { useAdminAccess } from './useAdminAccess'

// Every parish you follow or run, and every organization you belong to —
// for the Home card and the My Communities page.
//   parishes: [{ id, name, city, state, isHome, isAdmin }]   home parish first
//   orgs:     [{ id, name, city, state, org_type, isAdmin }]
export function useMyCommunities() {
  const { user, profile } = useAuth()
  const userId = user?.id
  const { parishes: followed, loading: followedLoading } = useFollowedParishes()
  const { parishAdminRecords, loading: adminLoading } = useAdminAccess()
  const [orgs, setOrgs] = useState([])
  const [orgsLoading, setOrgsLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setOrgs([]); setOrgsLoading(false); return }
    let cancelled = false
    supabase
      .from('organization_members')
      .select('role, organizations(id, name, city, state, org_type)')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (cancelled) return
        setOrgs((data ?? [])
          .filter(m => m.organizations)
          .map(m => ({ ...m.organizations, isAdmin: m.role === 'admin' }))
          .sort((a, b) => a.name.localeCompare(b.name)))
        setOrgsLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  const parishes = useMemo(() => {
    const homeId = profile?.parish_id
    const adminIds = new Set(parishAdminRecords.map(r => r.parish_id))
    const byId = new Map()
    for (const p of followed) byId.set(p.id, p)
    // Parishes you run but don't follow still belong on the list
    for (const r of parishAdminRecords) {
      if (!byId.has(r.parish_id) && r.parishes) byId.set(r.parish_id, { id: r.parish_id, ...r.parishes })
    }
    return [...byId.values()]
      .map(p => ({ id: p.id, name: p.name, city: p.city, state: p.state,
                   isHome: p.id === homeId, isAdmin: adminIds.has(p.id) }))
      .sort((a, b) => (b.isHome - a.isHome) || a.name.localeCompare(b.name))
  }, [followed, parishAdminRecords, profile?.parish_id])

  return { parishes, orgs, loading: followedLoading || adminLoading || orgsLoading }
}
