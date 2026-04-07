import { supabase } from './supabase'

/**
 * Creates a notification for a user.
 *
 * Never notifies users of their own actions.
 * Requires migration 005_notifications_rls.sql to be applied
 * (adds INSERT policy for authenticated users).
 *
 * @param {object} params
 * @param {string} params.userId      — recipient user ID
 * @param {string} params.type        — notification_type enum value
 * @param {string} params.referenceId — post / comment ID
 * @param {string} params.message     — human-readable message string
 * @param {string} params.actorId     — who triggered the notification
 */
export async function createNotification({ userId, type, referenceId, message, actorId }) {
  // Never notify users of their own actions
  if (!userId || userId === actorId) return

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    reference_id: referenceId,
    message,
    actor_id: actorId,
    is_read: false,
  })

  if (error) {
    // Fail silently — notifications are non-critical
    console.error('Failed to create notification:', error.message)
  }
}
