import { supabase } from './supabase'

/**
 * postLive — one shared realtime channel for the `posts` table.
 *
 * Every post card and feed on screen listens through this single channel
 * instead of opening its own, so a page with 40 posts still uses one
 * websocket subscription.
 *
 *  - watchPost(id, cb)   → cb(row) on UPDATE (like/comment counts, edits,
 *                          removal), cb(null) on DELETE
 *  - watchNewPosts(cb)   → cb(row) on INSERT (rows the viewer may see; RLS
 *                          is applied by Realtime)
 *
 * The channel opens on the first listener and closes after the last one
 * leaves. Requires `posts` in the supabase_realtime publication (migration
 * 088); without it nothing arrives and the app behaves as before.
 */

const postListeners = new Map() // postId → Set<cb>
const insertListeners = new Set()
let channel = null
let closeTimer = null

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

function open() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  if (channel) return
  channel = supabase
    .channel(`posts_live_${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
      if (payload.new?.id) emitPost(payload.new.id, payload.new)
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
      if (payload.old?.id) emitPost(payload.old.id, null)
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
      if (!payload.new?.id) return
      for (const cb of [...insertListeners]) {
        try { cb(payload.new) } catch { /* ignore */ }
      }
    })
    .subscribe()
}

function maybeClose() {
  if (listenerCount() > 0 || !channel || closeTimer) return
  // Short grace period: navigating between pages unmounts one feed and
  // mounts the next; don't tear down and rebuild the socket in between
  closeTimer = setTimeout(() => {
    closeTimer = null
    if (listenerCount() === 0 && channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }, 5000)
}

export function watchPost(postId, cb) {
  if (!postId) return () => {}
  let set = postListeners.get(postId)
  if (!set) { set = new Set(); postListeners.set(postId, set) }
  set.add(cb)
  open()
  return () => {
    set.delete(cb)
    if (set.size === 0) postListeners.delete(postId)
    maybeClose()
  }
}

export function watchNewPosts(cb) {
  insertListeners.add(cb)
  open()
  return () => {
    insertListeners.delete(cb)
    maybeClose()
  }
}

// A row that should no longer be shown (soft-deleted or moderated away)
export function isHiddenRow(row) {
  return !row || !!row.deleted_at || !!row.is_removed
}
