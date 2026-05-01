/**
 * Vercel Cron — Daily Readings Reminder
 * Scheduled: 7 AM EST (12:00 UTC) every day via vercel.json
 * Sends a push notification to all users who have daily_readings_reminder enabled.
 */

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export default async function handler(req, res) {
  // Vercel injects Authorization: Bearer {CRON_SECRET} on cron invocations
  const auth = req.headers['authorization']
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Find users who want the daily readings reminder
  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .neq('daily_readings_reminder', false)

  if (prefsError) {
    return res.status(500).json({ error: prefsError.message })
  }

  if (!prefs?.length) {
    return res.status(200).json({ sent: 0, message: 'No subscribers' })
  }

  const userIds = prefs.map(p => p.user_id)

  // Fetch their push subscriptions
  const { data: subs, error: subError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (subError) {
    return res.status(500).json({ error: subError.message })
  }

  if (!subs?.length) {
    return res.status(200).json({ sent: 0, message: 'No push subscriptions found' })
  }

  const today = new Date()
  const tag = `daily-readings-${today.toISOString().slice(0, 10)}`

  const payload = JSON.stringify({
    title: '✝ Daily Readings',
    body: "Today's Mass readings are ready. Take a moment to reflect on God's Word.",
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-72.svg',
    url: '/faith',
    tag,
  })

  let sent = 0
  const expiredEndpoints = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint)
        } else {
          console.error(`Push failed for ${sub.endpoint}:`, err.message)
        }
      }
    })
  )

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }

  console.log(`Daily readings reminder: ${sent} sent, ${expiredEndpoints.length} expired cleaned up`)
  return res.status(200).json({ sent, expired: expiredEndpoints.length })
}
