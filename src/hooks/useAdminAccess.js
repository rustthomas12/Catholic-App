import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { getMyMemberships, onMembershipsChanged } from '../lib/myMemberships'

/**
 * Centralizes all admin-access checks in one place.
 *
 * Navigation, Home, My Communities, Me shortcuts and parish pages all call
 * this hook. They share one module-level store, so the lookups run once per
 * user instead of once per component (each used to fire its own four
 * requests at startup). Membership rows come from lib/myMemberships.
 *
 * Names are looked up with separate queries instead of PostgREST joins to
 * avoid FK schema-cache issues that cause 500 errors with embedded resources.
 */

const EMPTY = []
let store = { userId: null, parishAdminRecords: EMPTY, orgAdminRecords: EMPTY, moderatorParishIds: EMPTY, loaded: false }
let inflight = null // { userId, promise }
let fetchedAt = 0   // when the store was last filled
const FRESH_MS = 60_000
const subscribers = new Set()

function setStore(next) {
  store = next
  for (const cb of [...subscribers]) cb()
}

function fetchAdminAccess(userId, { force = false } = {}) {
  if (!userId) return
  if (inflight?.userId === userId && !force) return inflight.promise
  if (!force && store.loaded && store.userId === userId && Date.now() - fetchedAt < FRESH_MS) return
  if (store.userId !== userId) {
    setStore({ userId, parishAdminRecords: EMPTY, orgAdminRecords: EMPTY, moderatorParishIds: EMPTY, loaded: false })
  }

  const promise = (async () => {
    const m = await getMyMemberships(userId, { force })
    const parishRows = m.parishAdmins
    const orgRows = m.orgs.filter((o) => o.role === 'admin')
    const parishIds = parishRows.map((r) => r.parish_id)
    const orgIds = orgRows.map((r) => r.org_id)

    const [{ data: parishData }, { data: orgData }] = await Promise.all([
      parishIds.length
        ? supabase.from('parishes').select('id, name, diocese, city, state').in('id', parishIds)
        : Promise.resolve({ data: [] }),
      orgIds.length
        ? supabase.from('organizations').select('id, name, category').in('id', orgIds)
        : Promise.resolve({ data: [] }),
    ])
    if (inflight?.promise !== promise) return // superseded (sign-out / user switch)

    const parishMap = Object.fromEntries((parishData || []).map((p) => [p.id, p]))
    const orgMap = Object.fromEntries((orgData || []).map((o) => [o.id, o]))
    fetchedAt = Date.now()
    setStore({
      userId,
      parishAdminRecords: parishRows.map((r) => ({ ...r, parishes: parishMap[r.parish_id] ?? null })),
      orgAdminRecords: orgRows.map((r) => ({ ...r, organizations: orgMap[r.org_id] ?? null })),
      moderatorParishIds: m.parishModerators ?? EMPTY,
      loaded: true,
    })
  })()
    .catch(() => {
      // A failed request (e.g. an expired session after a long idle) must not
      // wipe the user's admin links: keep what we had and retry later
      if (store.userId === userId && !store.loaded) setStore({ ...store, loaded: true })
    })
    .finally(() => { if (inflight?.promise === promise) inflight = null })

  inflight = { userId, promise }
  return promise
}

// Joining, leaving or being made admin somewhere refreshes everyone's view
onMembershipsChanged(() => {
  if (subscribers.size && store.userId) fetchAdminAccess(store.userId, { force: true })
})

function subscribe(cb) {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}
const getSnapshot = () => store

export function useAdminAccess() {
  const { user, isAdmin } = useAuth()
  const userId = user?.id
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    if (!userId) {
      inflight = null
      if (store.userId) setStore({ userId: null, parishAdminRecords: EMPTY, orgAdminRecords: EMPTY, moderatorParishIds: EMPTY, loaded: false })
      return
    }
    fetchAdminAccess(userId) // shared: concurrent callers reuse one request
    // Re-check when the tab comes back into view (session may have refreshed);
    // within a minute of the last check this is served from the shared cache
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAdminAccess(userId) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId])

  const mine = userId && snap.userId === userId
  const parishAdminRecords = mine ? snap.parishAdminRecords : EMPTY // [{ parish_id, role, parishes: { id, name, diocese } }]
  const orgAdminRecords = mine ? snap.orgAdminRecords : EMPTY       // [{ org_id, role, organizations: { id, name } }]
  const moderatorParishIds = mine ? snap.moderatorParishIds : EMPTY
  // Mirrors can_moderate_parish() (migration 099); the database decides
  const canModerateParish = (parishId) => !!parishId && (
    !!isAdmin
    || parishAdminRecords.some((r) => r.parish_id === parishId && r.role !== 'pending')
    || moderatorParishIds.includes(parishId))
  return {
    isPlatformAdmin: isAdmin || false,
    isParishAdmin: parishAdminRecords.length > 0,
    parishAdminRecords,
    isOrgAdmin: orgAdminRecords.length > 0,
    orgAdminRecords,
    moderatorParishIds,
    canModerateParish,
    loading: userId ? !(mine && snap.loaded) : false,
  }
}
