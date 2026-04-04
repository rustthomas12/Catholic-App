/**
 * Notifications hook — stub for Phase 7.
 */
export function useNotifications() {
  return {
    notifications: [],
    unreadCount: 0,
    loading: false,
    markAsRead: (_id) => {},
    markAllAsRead: () => {},
  }
}
