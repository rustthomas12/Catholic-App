import { supabase } from './supabase'

/**
 * The signed-in user's memberships, fetched once and shared.
 *
 * Startup used to run the same four lookups (parish follows, parish admin
 * roles, group memberships, organization memberships) from the feed, the
 * events list, the groups hook and every useAdminAccess caller: up to 17
 * requests competing for the connection before the feed could load. Now
 * there is one round of four requests per user, deduplicated while in
 * flight and cached briefly.
 *
 *   getMyMemberships(userId, { force }) → Promise<{
 *     parishFollows: [parish_id], parishAdmins: [{ parish_id, role }],
 *     groups: [{ group_id, role }], orgs: [{ org_id, role }] }>
 *   invalidateMyMemberships()  call after joining/leaving/following anything
 *   onMembershipsChanged(cb)   cb() after an invalidation; returns unsubscribe
 */

const TTL = 60_000
let cache = null      // { userId, ts, data }
let inflight = null   // { userId, promise }
const listeners = new Set()

async function load(userId) {
  const [pf, pa, gm, om, pm] = await Promise.all([
    supabase.from('parish_follows').select('parish_id').eq('user_id', userId),
    supabase.from('parish_admins').select('parish_id, role').eq('user_id', userId),
    supabase.from('group_members').select('group_id, role').eq('user_id', userId),
    supabase.from('organization_members').select('org_id, role').eq('user_id', userId),
    supabase.from('parish_moderators').select('parish_id').eq('user_id', userId),
  ])
  const error = pf.error || pa.error || gm.error || om.error
  if (error) throw error
  // Moderators (migration 099): a failure here shouldn't break memberships
  return {
    parishFollows: (pf.data ?? []).map((r) => r.parish_id),
    parishAdmins: pa.data ?? [],
    groups: gm.data ?? [],
    orgs: om.data ?? [],
    parishModerators: (pm.data ?? []).map((r) => r.parish_id),
  }
}

export function getMyMemberships(userId, { force = false } = {}) {
  if (!userId) return Promise.resolve({ parishFollows: [], parishAdmins: [], groups: [], orgs: [], parishModerators: [] })
  if (!force && cache?.userId === userId && Date.now() - cache.ts < TTL) return Promise.resolve(cache.data)
  if (inflight?.userId === userId) return inflight.promise
  const promise = load(userId)
    .then((data) => {
      // Ignore a result that was invalidated while it was loading
      if (inflight?.promise === promise) cache = { userId, ts: Date.now(), data }
      return data
    })
    .finally(() => { if (inflight?.promise === promise) inflight = null })
  inflight = { userId, promise }
  return promise
}

// Last known result without fetching (null if none)
export function peekMyMemberships(userId) {
  return cache?.userId === userId ? cache.data : null
}

export function invalidateMyMemberships() {
  cache = null
  inflight = null
  for (const cb of [...listeners]) {
    try { cb() } catch { /* a bad listener must not break the others */ }
  }
}

export function onMembershipsChanged(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
