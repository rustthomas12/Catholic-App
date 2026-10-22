import { useSyncExternalStore } from 'react'

// Unread direct-message count, kept by Navigation (which owns the query and
// realtime channel) and read anywhere else that shows the badge.
let count = 0
const listeners = new Set()

export function setUnreadDMCount(n) {
  if (n === count) return
  count = n
  listeners.forEach((l) => l())
}

export function useUnreadDMCount() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => count,
  )
}
