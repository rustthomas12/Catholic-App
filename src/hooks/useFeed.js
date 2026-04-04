/**
 * Feed data hook — stub for Phase 3.
 * Full implementation comes in Phase 3.
 * @param {string} [filter='all']
 */
export function useFeed(filter = 'all') {
  return {
    posts: [],
    loading: false,
    error: null,
    hasMore: false,
    loadMore: () => {},
    refresh: () => {},
  }
}
