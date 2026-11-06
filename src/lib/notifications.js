import { supabase } from './supabase'

// Map notification types to notification_preferences column names.
// Enforced server-side by apply_notification_preferences() (migration 040)
// — keep the two in sync. The recipient's prefs aren't readable from the
// actor's browser, so the check can't live here.
/**
 * Creates an in-app notification for a user.
 *
 * The database drops it if the recipient has turned this type off.
 *
 * Never notifies users of their own actions.
 *
 * @param {object} params
 * @param {string}      params.userId      — recipient user ID
 * @param {string}      params.type        — notification_type enum value
 * @param {string}      [params.referenceId] — post / group / parish ID
 * @param {string}      params.message     — human-readable message string
 * @param {string|null} [params.actorId]   — who triggered the notification
 */
export async function createNotification({
  userId,
  type,
  referenceId,
  message,
  actorId = null,
}) {
  if (!userId) return
  // Never notify users of their own actions
  if (actorId && userId === actorId) return

  const { error } = await supabase.from('notifications').insert({
    user_id:      userId,
    type,
    reference_id: referenceId || null,
    message,
    actor_id:     actorId || null,
    is_read:      false,
  })

  if (error) {
    // Fail silently — notifications are non-critical
    console.error('Failed to create notification:', error.message)
  }

  // TODO Phase 9: Send email via Resend
  // Email types that warrant an email notification:
  //   parish_post            → "New post from [Parish Name]"
  //   group_request          → "[Name] requested to join [Group]"
  //   group_request_response → "Your request was approved / denied"
  //   event_reminder         → "Reminder: [Event] is tomorrow"
  //   confession_reminder    → "It has been X days since your last confession"
  // Check user's email preferences (separate column) before sending.
}

/**
 * Screen a notification opens when tapped (in-app list and push taps).
 * Keep in sync with notificationPath() in supabase/functions/send-push.
 *
 * reference_id holds a post ID for post-related types, otherwise the
 * group / parish / organization the notification is about.
 *
 * @param {string} type
 * @param {string|null} referenceId
 * @returns {string}
 */
export function notificationPath(type, referenceId) {
  const ref = referenceId || null
  switch (type) {
    case 'like':
    case 'comment':
    case 'parish_post':
    case 'group_post':
      return ref ? `/post/${ref}` : '/'
    case 'group_invite':
    case 'group_request':
    case 'group_request_response':
    case 'new_group_member':
      return ref ? `/group/${ref}` : '/groups'
    case 'new_parish_member':
    case 'pastor_verified':
      return ref ? `/parish-admin/${ref}` : '/'
    case 'parish_message':
      return ref ? `/parish-admin/${ref}?tab=messages` : '/'
    case 'new_org_member':
      return ref ? `/org-admin/${ref}` : '/organizations'
    case 'org_announcement':
      return ref ? `/organization/${ref}` : '/organizations'
    case 'chapter_request_resolved':
      return ref ? `/organization/${ref}` : '/organizations'
    case 'chapter_request':
      return '/organizations'
    case 'post_flagged':
      return '/admin'
    case 'prayer_response':
      return '/faith/prayer'
    case 'confession_reminder':
      return '/premium/confession-tracker'
    case 'direct_message':
      // reference_id is the sender — open that conversation
      return ref ? `/messages?to=${ref}` : '/messages'
    case 'morning_offering_reminder':
      return '/faith/morning-offering'
    case 'daily_readings_reminder':
      return '/faith'
    case 'event_reminder':
      return ref ? `/event/${ref}` : '/notifications'
    default:
      return '/'
  }
}
