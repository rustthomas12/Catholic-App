/**
 * Vercel Cron — Morning Offering Reminder
 * Scheduled: 6 AM EST (11:00 UTC) every day via vercel.json
 * Sends a push notification to all users who have morning_offering_reminder enabled.
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
  const auth = req.headers['authorization']
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Users who have NOT explicitly disabled the morning offering reminder
  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .neq('morning_offering_reminder', false)

  if (prefsError) {
    return res.status(500).json({ error: prefsError.message })
  }

  if (!prefs?.length) {
    return res.status(200).json({ sent: 0, message: 'No subscribers' })
  }

  const userIds = prefs.map(p => p.user_id)

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
  const tag = `morning-offering-${today.toISOString().slice(0, 10)}`

  const payload = JSON.stringify({
    title: '☀️ Morning Offering',
    body: 'Offer your day to God before it begins.',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-72.svg',
    url: '/faith/morning-offering',
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

  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }

  console.log(`Morning offering reminder: ${sent} sent, ${expiredEndpoints.length} expired cleaned up`)
  return res.status(200).json({ sent, expired: expiredEndpoints.length })
}
