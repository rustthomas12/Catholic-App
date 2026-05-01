import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Centralizes all admin-access checks in one place.
 * Used by Navigation and HomePage to avoid duplicating Supabase queries.
 *
 * Uses separate queries instead of PostgREST joins to avoid FK schema-cache
 * issues that cause 500 errors with the embedded resource syntax.
 */
export function useAdminAccess() {
  const { user, isAdmin } = useAuth()
  const [parishAdminRecords, setParishAdminRecords] = useState([])
  const [orgAdminRecords, setOrgAdminRecords]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setParishAdminRecords([])
      setOrgAdminRecords([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchAdminAccess() {
      // Step 1 — get the IDs and roles the user admins
      const [{ data: parishAdminData }, { data: orgAdminData }] = await Promise.all([
        supabase
          .from('parish_admins')
          .select('parish_id, role')
          .eq('user_id', user.id),
        supabase
          .from('organization_members')
          .select('org_id, role')
          .eq('user_id', user.id)
          .eq('role', 'admin'),
      ])

      if (cancelled) return

      // Step 2 — look up names separately (avoids PostgREST join / FK cache issues)
      const parishIds = (parishAdminData || []).map(r => r.parish_id)
      const orgIds    = (orgAdminData    || []).map(r => r.org_id)

      const [{ data: parishData }, { data: orgData }] = await Promise.all([
        parishIds.length > 0
          ? supabase.from('parishes').select('id, name, diocese').in('id', parishIds)
          : Promise.resolve({ data: [] }),
        orgIds.length > 0
          ? supabase.from('organizations').select('id, name, category').in('id', orgIds)
          : Promise.resolve({ data: [] }),
      ])

      if (cancelled) return

      // Merge names back into the admin records
      const parishMap = Object.fromEntries((parishData || []).map(p => [p.id, p]))
      const orgMap    = Object.fromEntries((orgData    || []).map(o => [o.id, o]))

      setParishAdminRecords(
        (parishAdminData || []).map(r => ({ ...r, parishes: parishMap[r.parish_id] ?? null }))
      )
      setOrgAdminRecords(
        (orgAdminData || []).map(r => ({ ...r, organizations: orgMap[r.org_id] ?? null }))
      )
      setLoading(false)
    }

    fetchAdminAccess()
    return () => { cancelled = true }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isPlatformAdmin:    isAdmin || false,
    isParishAdmin:      parishAdminRecords.length > 0,
    parishAdminRecords, // [{ parish_id, role, parishes: { id, name, diocese } }]
    isOrgAdmin:         orgAdminRecords.length > 0,
    orgAdminRecords,    // [{ org_id, role, organizations: { id, name } }]
    loading,
  }
}
