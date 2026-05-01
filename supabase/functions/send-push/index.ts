import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,      // e.g. mailto:hello@communio.app
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

// Map notification_type enum values to notification_preferences column names
const TYPE_TO_PREF: Record<string, string> = {
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
  post_flagged:              'post_flagged',
  new_parish_member:         'new_parish_member',
  group_post:                'group_posts',
  new_group_member:          'new_group_member',
  new_org_member:            'new_org_member',
  chapter_request:           'chapter_requests',
  chapter_request_resolved:  'chapter_requests',
}

// Map notification types to push-friendly titles and deep-link URLs
function formatNotification(type: string, message: string | null, actorName?: string): {
  title: string
  body: string
  url: string
  tag: string
} {
  const actor = actorName || 'Someone'
  const body = message || ''

  const formats: Record<string, { title: string; body: string; url: string }> = {
    like:                   { title: 'New like',              body: `${actor} liked your post`,                url: '/notifications' },
    comment:                { title: 'New comment',           body: `${actor} commented on your post`,        url: '/notifications' },
    group_invite:           { title: 'Group invitation',      body: `${actor} invited you to a group`,        url: '/groups' },
    group_request:          { title: 'Join request',          body: `${actor} wants to join your group`,      url: '/groups' },
    group_request_response: { title: 'Group update',          body: body || `Your group request was reviewed`, url: '/groups' },
    parish_post:            { title: '📢 Parish announcement', body: body || `New announcement from your parish`, url: '/' },
    prayer_response:        { title: '🙏 Prayer response',     body: `${actor} prayed for your intention`,     url: '/faith/prayer' },
    confession_reminder:    { title: '✝ Confession reminder',  body: body || `Time to prepare for confession`, url: '/premium/confession-tracker' },
    direct_message:         { title: '💬 New message',         body: `${actor} sent you a message`,            url: '/messages' },
    event_reminder:         { title: '📅 Event reminder',      body: body || `You have an upcoming event`,     url: '/notifications' },
    post_flagged:             { title: '🚩 Post reported',          body: body || `A post was flagged for review`,              url: '/admin' },
    new_parish_member:        { title: '⛪ New parish follower',     body: `${actor} is following your parish`,                  url: '/parish-admin' },
    group_post:               { title: '📝 New group post',          body: body || `${actor} posted in your group`,              url: '/groups' },
    new_group_member:         { title: '👥 New group member',        body: body || `${actor} joined your group`,                 url: '/groups' },
    new_org_member:           { title: '🏛 New org member',          body: body || `${actor} joined your organization`,          url: '/organizations' },
    chapter_request:          { title: '📋 Chapter request',         body: body || `${actor} requested a chapter`,               url: '/organizations' },
    chapter_request_resolved: { title: '📋 Chapter request update',  body: body || `Your chapter request was reviewed`,          url: '/organizations' },
  }

  const format = formats[type] ?? { title: 'Communio', body: body, url: '/' }

  return {
    title: format.title,
    body: format.body,
    url: format.url,
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
  const record = payload?.record
  if (!record) {
    return new Response('No record in payload', { status: 400 })
  }

  const { user_id, type, message, actor_id } = record

  if (!user_id) {
    return new Response('No user_id in notification record', { status: 400 })
  }

  // Check user's notification preference for this type
  const prefColumn = TYPE_TO_PREF[type]
  if (prefColumn) {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select(prefColumn)
      .eq('user_id', user_id)
      .single()

    if (prefs && prefs[prefColumn] === false) {
      console.log(`Push skipped: user ${user_id} has disabled ${type}`)
      return new Response('Notification type disabled by user', { status: 200 })
    }
  }

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

  // Fetch all push subscriptions for this user
  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user_id)

  if (subError || !subscriptions || subscriptions.length === 0) {
    return new Response('No push subscriptions for user', { status: 200 })
  }

  const notification = formatNotification(type, message, actorName)

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

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  console.log(`Push for user ${user_id}: ${sent} sent, ${failed} failed (type: ${type})`)

  return new Response(
    JSON.stringify({ sent, failed }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  )
})
