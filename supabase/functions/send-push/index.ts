import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendFcmToUsers } from '../_shared/fcm.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,      // e.g. mailto:hello@getinfold.app
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

// Map notification types to push-friendly titles and deep-link URLs
// Screen a notification opens when tapped — mirror of notificationPath() in
// src/lib/notifications.js (keep in sync). reference_id is a post ID for
// post-related types, otherwise the group / parish / organization ID.
function notificationPath(type: string, ref: string | null): string {
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
      return '/messages'
    case 'event_reminder':
      return '/notifications'
    default:
      return '/'
  }
}

function formatNotification(type: string, message: string | null, actorName: string | undefined, referenceId: string | null): {
  title: string
  body: string
  url: string
  tag: string
} {
  const actor = actorName || 'Someone'
  const body = message || ''

  const formats: Record<string, { title: string; body: string }> = {
    like:                   { title: 'New like',              body: `${actor} liked your post` },
    comment:                { title: 'New comment',           body: `${actor} commented on your post` },
    group_invite:           { title: 'Group invitation',      body: `${actor} invited you to a group` },
    group_request:          { title: 'Join request',          body: `${actor} wants to join your group` },
    group_request_response: { title: 'Group update',          body: body || `Your group request was reviewed` },
    parish_post:            { title: '📢 Parish announcement', body: body || `New announcement from your parish` },
    prayer_response:        { title: '🙏 Prayer response',     body: `${actor} prayed for your intention` },
    confession_reminder:    { title: '✝ Confession reminder',  body: body || `Time to prepare for confession` },
    direct_message:         { title: '💬 New message',         body: `${actor} sent you a message` },
    event_reminder:         { title: '📅 Event reminder',      body: body || `You have an upcoming event` },
    post_flagged:             { title: '🚩 Post reported',          body: body || `A post was flagged for review` },
    new_parish_member:        { title: '⛪ New parish follower',     body: `${actor} is following your parish` },
    parish_message:           { title: '✉️ New parish message',      body: body || `${actor} sent your parish a message` },
    pastor_verified:          { title: "✅ You're verified",          body: body || 'Your parish dashboard is ready' },
    group_post:               { title: '📝 New group post',          body: body || `${actor} posted in your group` },
    new_group_member:         { title: '👥 New group member',        body: body || `${actor} joined your group` },
    new_org_member:           { title: '🏛 New org member',          body: body || `${actor} joined your organization` },
    org_announcement:         { title: '📢 Announcement',            body: body || 'New announcement from your organization' },
    chapter_request:          { title: '📋 Chapter request',         body: body || `${actor} requested a chapter` },
    chapter_request_resolved: { title: '📋 Chapter request update',  body: body || `Your chapter request was reviewed` },
  }

  const format = formats[type] ?? { title: 'inFold', body: body }

  return {
    title: format.title,
    body: format.body,
    url: notificationPath(type, referenceId),
    // Use type as tag base so same-type events can stack; add random suffix for uniqueness
    tag: `${type}-${Date.now()}`,
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Supabase Database Webhook payload:
  // { type: 'INSERT', table: 'notifications', record: { ... }, old_record: null }
  // This endpoint is public (the database webhook sends no credentials), so
  // the payload is only a pointer: atomically claim the stored notification —
  // recent and not yet pushed — and send what the database says, never what
  // the request says. Forged / replayed calls get nothing.
  const id = payload?.record?.id
  if (!id) {
    return new Response('No record in payload', { status: 400 })
  }
  const { data: record } = await supabase
    .from('notifications')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', id)
    .is('pushed_at', null)
    .gt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .select('user_id, type, message, actor_id, reference_id')
    .maybeSingle()
  if (!record) {
    return new Response('Unknown, stale or already-sent notification', { status: 200 })
  }

  const { user_id, type, message, actor_id, reference_id } = record

  if (!user_id) {
    return new Response('No user_id in notification record', { status: 400 })
  }

  // Notification preferences are enforced when the notification is inserted
  // (apply_notification_preferences, migration 040) — a disabled type never
  // reaches this function.

  // Resolve actor name if present
  let actorName: string | undefined
  if (actor_id) {
    const { data: actor } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', actor_id)
      .single()
    actorName = actor?.full_name ?? undefined
  }

  // Fetch all web push subscriptions for this user
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user_id)

  const notification = formatNotification(type, message, actorName, reference_id ?? null)

  // iOS / Android app devices (Firebase Cloud Messaging)
  const native = await sendFcmToUsers(supabase, [user_id], notification)

  if (!subscriptions || subscriptions.length === 0) {
    if (native.sent + native.failed + native.expired === 0) {
      return new Response('No push subscriptions for user', { status: 200 })
    }
    return new Response(
      JSON.stringify({ sent: native.sent, failed: native.failed }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  }

  const pushPayload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-72.svg',
    url: notification.url,
    tag: notification.tag,
  })

  // Send to all subscribed devices, cleaning up expired ones
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload
        )
      } catch (err: any) {
        // 410 Gone / 404 Not Found = subscription expired or revoked — remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
          console.log(`Cleaned up expired subscription: ${sub.endpoint}`)
        } else {
          throw err
        }
      }
    })
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length + native.sent
  const failed = results.filter((r) => r.status === 'rejected').length + native.failed

  console.log(`Push for user ${user_id}: ${sent} sent, ${failed} failed (type: ${type})`)

  return new Response(
    JSON.stringify({ sent, failed }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  )
})
