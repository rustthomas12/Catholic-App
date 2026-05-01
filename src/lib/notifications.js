import { supabase } from './supabase'

// Map notification types to notification_preferences column names
const PREFERENCE_MAP = {
  like:                   'likes',
  comment:                'comments',
  group_invite:           'group_invites',
  group_request:          'group_requests',
  group_request_response: 'group_requests',
  parish_post:            'parish_posts',
  prayer_response:        'prayer_responses',
  confession_reminder:    'confession_reminder',
  direct_message:         'direct_messages',
  event_reminder:         'event_reminders',
  post_flagged:           'post_flagged',
  new_parish_member:      'new_parish_member',
}

/**
 * Creates an in-app notification for a user.
 *
 * Checks notification_preferences before inserting — if the user
 * has disabled this notification type it is silently skipped.
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

  // Check notification preferences before inserting
  const prefColumn = PREFERENCE_MAP[type]
  if (prefColumn) {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select(prefColumn)
      .eq('user_id', userId)
      .single()

    // If prefs record exists and this type is explicitly disabled: skip.
    // If no record exists at all: use defaults (all enabled).
    if (prefs && prefs[prefColumn] === false) return
  }

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
