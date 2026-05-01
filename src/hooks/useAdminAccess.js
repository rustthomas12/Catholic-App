import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Centralizes all admin-access checks in one place.
 * Used by Navigation and HomePage to avoid duplicating Supabase queries.
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
      const [{ data: parishes }, { data: orgs }] = await Promise.all([
        supabase
          .from('parish_admins')
          .select('parish_id, role, parishes(id, name, diocese)')
          .eq('user_id', user.id),
        supabase
          .from('organization_members')
          .select('org_id, role, organizations(id, name, category)')
          .eq('user_id', user.id)
          .eq('role', 'admin'),
      ])

      if (!cancelled) {
        setParishAdminRecords(parishes || [])
        setOrgAdminRecords(orgs || [])
        setLoading(false)
      }
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
