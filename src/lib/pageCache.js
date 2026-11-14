// pageCache — in-memory "last seen" data for pages, so going back to a page
// shows it immediately while it refreshes in the background (stale-while-
// revalidate). Cleared on sign-out with the rest of the session state.

const store = new Map()

export function getCached(key) {
  return key ? store.get(key) : undefined
}

export function setCached(key, data) {
  if (key) store.set(key, data)
}

export function clearPageCache() {
  store.clear()
}
