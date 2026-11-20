import { supabase } from './supabase'

/**
 * postLive — shared, *filtered* realtime subscriptions for the `posts` table.
 *
 *  - watchPost(id, cb)          → cb(row) on UPDATE of that post (like/comment
 *                                 counts, edits, removal), cb(null) on DELETE
 *  - watchNewPosts(cb, scope)   → cb(row) on INSERT of posts in the scope:
 *                                 { parishIds, groupIds, orgIds, authorIds }
 *
 * Why filtered: Realtime checks every change against every subscriber. With
 * one unfiltered subscription per open app, each like anywhere fanned out to
 * every connected user (a load test dropped 13–45% of events in bursts).
 * Now a phone only hears about the posts on its screen and the communities
 * it belongs to, so a like reaches only the people looking at that post.
 *
 * - Watched post ids are grouped into channels of at most 100 (Realtime's
 *   limit for an `in` filter). Adding ids rebuilds only the last group; the
 *   new channel is subscribed before the old one is removed, so nothing is
 *   missed in between.
 * - New-post listeners share one channel built from the union of their
 *   scopes, rebuilt (same swap) when the union changes.
 * - DELETE events can't be filtered by Realtime and carry only the id; they
 *   are rare (posts are normally soft-deleted, which is an UPDATE), so one
 *   unfiltered DELETE binding rides on the new-posts channel.
 * - Everything closes 5 s after the last listener leaves.
 *
 * Requires `posts` in the supabase_realtime publication (migration 088).
 */

const CHUNK = 100
const SYNC_DELAY = 250

const postListeners = new Map()   // postId → Set<cb>
const insertListeners = new Map() // cb → scope
let updateGroups = []             // [{ ids: string[], channel }]
let insertChannel = null
let insertKey = null
let syncTimer = null
let closeTimer = null

const uid = () => Math.random().toString(36).slice(2)

function listenerCount() {
  let n = insertListeners.size
  for (const set of postListeners.values()) n += set.size
  return n
}

function emitPost(id, row) {
  const set = postListeners.get(id)
  if (!set) return
  for (const cb of [...set]) {
    try { cb(row) } catch { /* a bad listener must not break the others */ }
  }
}

function emitInsert(row) {
  for (const cb of [...insertListeners.keys()]) {
    try { cb(row) } catch { /* ignore */ }
  }
}

// Subscribe `next`, then drop `prev` once `next` is live (or after 10 s)
function swap(prev, next) {
  if (!prev) { next.subscribe(); return }
  let done = false
  const drop = () => { if (done) return; done = true; supabase.removeChannel(prev) }
  next.subscribe((status) => { if (status === 'SUBSCRIBED') drop() })
  setTimeout(drop, 10000)
}

function updateChannel(ids) {
  return supabase
    .channel(`posts_upd_${uid()}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts', filter: `id=in.(${ids.join(',')})` }, (payload) => {
      if (payload.new?.id) emitPost(payload.new.id, payload.new)
    })
}

function syncUpdates() {
  const wanted = new Set(postListeners.keys())
  // Drop groups none of whose posts are still watched
  updateGroups = updateGroups.filter((g) => {
    if (g.ids.some((id) => wanted.has(id))) return true
    supabase.removeChannel(g.channel)
    return false
  })
  const covered = new Set(updateGroups.flatMap((g) => g.ids))
  let fresh = [...wanted].filter((id) => !covered.has(id))
  if (!fresh.length) return

  // Top up the last group if it has room (rebuild it with the new ids)
  const last = updateGroups[updateGroups.length - 1]
  if (last) {
    const keep = last.ids.filter((id) => wanted.has(id))
    const room = CHUNK - keep.length
    if (room > 0) {
      const ids = [...keep, ...fresh.slice(0, room)]
      fresh = fresh.slice(room)
      const channel = updateChannel(ids)
      swap(last.channel, channel)
      updateGroups[updateGroups.length - 1] = { ids, channel }
    }
  }
  for (let i = 0; i < fresh.length; i += CHUNK) {
    const ids = fresh.slice(i, i + CHUNK)
    const channel = updateChannel(ids)
    swap(null, channel)
    updateGroups.push({ ids, channel })
  }
}

function unionScope() {
  const u = { parishIds: new Set(), groupIds: new Set(), orgIds: new Set(), authorIds: new Set() }
  for (const scope of insertListeners.values()) {
    for (const k of Object.keys(u)) for (const id of scope?.[k] ?? []) if (id) u[k].add(id)
  }
  return Object.fromEntries(Object.entries(u).map(([k, s]) => [k, [...s].sort()]))
}

function syncInserts() {
  const scope = unionScope()
  const key = JSON.stringify(scope)
  if (key === insertKey && insertChannel) return
  insertKey = key
  const ch = supabase
    .channel(`posts_new_${uid()}`)
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
      if (payload.old?.id) emitPost(payload.old.id, null)
    })
  const columns = { parishIds: 'parish_id', groupIds: 'group_id', orgIds: 'org_id', authorIds: 'author_id' }
  for (const [k, column] of Object.entries(columns)) {
    const ids = scope[k]
    for (let i = 0; i < ids.length; i += CHUNK) {
      ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `${column}=in.(${ids.slice(i, i + CHUNK).join(',')})` }, (payload) => {
        if (payload.new?.id) emitInsert(payload.new)
      })
    }
  }
  const prev = insertChannel
  insertChannel = ch
  swap(prev, ch)
}

function scheduleSync() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  if (syncTimer) return
  syncTimer = setTimeout(() => {
    syncTimer = null
    if (listenerCount() === 0) return
    syncUpdates()
    syncInserts()
  }, SYNC_DELAY)
}

function maybeClose() {
  if (listenerCount() > 0 || closeTimer) { if (listenerCount() > 0) scheduleSync(); return }
  // Short grace period: navigating between pages unmounts one feed and
  // mounts the next; don't tear down and rebuild the sockets in between
  closeTimer = setTimeout(() => {
    closeTimer = null
    if (listenerCount() > 0) return
    for (const g of updateGroups) supabase.removeChannel(g.channel)
    updateGroups = []
    if (insertChannel) supabase.removeChannel(insertChannel)
    insertChannel = null
    insertKey = null
  }, 5000)
}

export function watchPost(postId, cb) {
  if (!postId) return () => {}
  let set = postListeners.get(postId)
  if (!set) { set = new Set(); postListeners.set(postId, set) }
  set.add(cb)
  scheduleSync()
  return () => {
    set.delete(cb)
    if (set.size === 0) postListeners.delete(postId)
    maybeClose()
  }
}

export function watchNewPosts(cb, scope) {
  insertListeners.set(cb, scope || {})
  scheduleSync()
  return () => {
    insertListeners.delete(cb)
    maybeClose()
  }
}

// A row that should no longer be shown (soft-deleted or moderated away)
export function isHiddenRow(row) {
  return !row || !!row.deleted_at || !!row.is_removed
}
