import { supabase } from './supabase'

/**
 * postSeen — records that the viewer has seen an official parish post
 * (announcement or featured), so it drops out of their "From the parish"
 * strip (migration 101). Calls are batched: ids collect for a second and go
 * up in one mark_posts_seen() call. Each id is sent at most once per session.
 */

const sent = new Set()
let queue = new Set()
let timer = null

function flush() {
  timer = null
  const ids = [...queue]
  queue = new Set()
  if (!ids.length) return
  supabase.rpc('mark_posts_seen', { p_post_ids: ids }).then(({ error }) => {
    // Let a failed batch be retried next time the cards come into view
    if (error) ids.forEach((id) => sent.delete(id))
  })
}

export function markPostSeen(postId) {
  if (!postId || sent.has(postId)) return
  sent.add(postId)
  queue.add(postId)
  if (!timer) timer = setTimeout(flush, 1000)
}

// Reset on sign-out so the next account starts fresh
export function resetPostSeen() {
  sent.clear()
  queue = new Set()
  if (timer) { clearTimeout(timer); timer = null }
}

// Mark a post seen once at least 60% of it has been on screen for 1.5 s.
// Returns a cleanup function.
export function observeSeen(el, postId) {
  if (!el || typeof IntersectionObserver === 'undefined' || sent.has(postId)) return () => {}
  let dwell = null
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!dwell) dwell = setTimeout(() => { markPostSeen(postId); io.disconnect() }, 1500)
    } else if (dwell) {
      clearTimeout(dwell)
      dwell = null
    }
  }, { threshold: 0.6 })
  io.observe(el)
  return () => { io.disconnect(); if (dwell) clearTimeout(dwell) }
}
