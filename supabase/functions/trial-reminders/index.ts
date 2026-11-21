import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { esc } from '../_shared/html.ts'

// Trial reminder emails (migration 107). Called once a day by the
// trial-reminders cron job. For each no-card trial with 15 days left (the
// "day 75" email) or 5 days left (the "day 85" email), emails the parish's
// verified admins and staff a summary of what inFold did for the parish so
// far, with a link to add a card for autopay.
//
// Public endpoint (no JWT): it takes no input and is idempotent. Each email
// is recorded in trial_reminders_sent before sending, so repeated or forged
// calls can't send anything twice.

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const APP_URL = Deno.env.get('APP_URL') || 'https://app.getinfold.app'

type Due = {
  parish_id: string
  parish_name: string
  trial_ends_at: string
  kind: 'day75' | 'day85'
  days_left: number
  admin_ids: string[] | null
}

function n(v: unknown): number {
  return Number(v ?? 0) || 0
}

function plural(count: number, one: string, many: string) {
  return `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`
}

function emailHtml(due: Due, reach: Record<string, unknown>) {
  const link = `${APP_URL}/parish-admin/${due.parish_id}?tab=billing`
  const when = due.days_left <= 1 ? 'tomorrow' : `in ${due.days_left} days`
  const rows: [string, string][] = [
    ['Parishioners on inFold', n(reach.followers).toLocaleString('en-US')],
    ['New in your trial', n(reach.new_followers).toLocaleString('en-US')],
    ['Announcements sent', n(reach.announcement_count).toLocaleString('en-US')],
    ['People who saw them', n(reach.people_reached).toLocaleString('en-US')],
    ['Community posts', n(reach.community_posts).toLocaleString('en-US')],
    ['Active this week', n(reach.weekly_active).toLocaleString('en-US')],
  ]
  const table = rows.map(([k, v]) =>
    `<tr><td style="padding:6px 0;color:#555">${esc(k)}</td><td style="padding:6px 0;text-align:right;font-weight:bold;color:#1b2a4a">${esc(v)}</td></tr>`
  ).join('')
  return `
<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1b2a4a">
  <h2 style="margin:0 0 8px">Your inFold trial ends ${esc(when)}</h2>
  <p style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.5">
    Here's what inFold has done for ${esc(due.parish_name)} so far:
  </p>
  <table style="width:100%;font-family:Arial,sans-serif;font-size:15px;border-collapse:collapse">${table}</table>
  <p style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.5;margin-top:16px">
    Add a card to keep announcements and notifications running on autopay. You won't be charged before the trial ends,
    and you can cancel any time. Without a card, your parish's plan pauses when the trial ends.
  </p>
  <p style="margin:20px 0">
    <a href="${esc(link)}" style="background:#1b2a4a;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;padding:12px 20px;border-radius:10px;display:inline-block">Add a card</a>
  </p>
  <p style="font-family:Arial,sans-serif;font-size:12px;color:#888">Questions? Just reply to this email.</p>
</div>`
}

serve(async () => {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return new Response('Email not configured', { status: 500 })

  const { data: due, error } = await supabase.rpc('trials_due_for_reminder')
  if (error) {
    console.log(`trials_due_for_reminder failed: ${error.message}`)
    return new Response('Query failed', { status: 500 })
  }

  const results: string[] = []
  for (const d of (due ?? []) as Due[]) {
    // Claim first: a second run (or a forged call) finds the row and skips
    const { error: claimError } = await supabase.from('trial_reminders_sent')
      .insert({ parish_id: d.parish_id, kind: d.kind, trial_ends_at: d.trial_ends_at })
    if (claimError) { results.push(`${d.parish_id} ${d.kind}: already claimed`); continue }

    const trialStart = new Date(new Date(d.trial_ends_at).getTime() - 90 * 86400000).toISOString()
    const { data: reach } = await supabase.rpc('parish_reach_counts', { p_parish_id: d.parish_id, p_since: trialStart })

    const emails: string[] = []
    for (const id of d.admin_ids ?? []) {
      const { data } = await supabase.auth.admin.getUserById(id)
      if (data?.user?.email) emails.push(data.user.email)
    }
    if (!emails.length) { results.push(`${d.parish_id} ${d.kind}: no recipients`); continue }

    const subject = d.kind === 'day85'
      ? `${d.parish_name}: your inFold trial ends in ${plural(d.days_left, 'day', 'days')}`
      : `What inFold did for ${d.parish_name} in your trial`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'inFold <noreply@getinfold.app>',
        to: emails,
        subject,
        html: emailHtml(d, reach ?? {}),
      }),
    })
    if (res.ok) {
      await supabase.from('trial_reminders_sent').update({ recipients: emails.length })
        .eq('parish_id', d.parish_id).eq('kind', d.kind).eq('trial_ends_at', d.trial_ends_at)
      results.push(`${d.parish_id} ${d.kind}: sent to ${emails.length}`)
    } else {
      // Release the claim so tomorrow's run retries
      await supabase.from('trial_reminders_sent').delete()
        .eq('parish_id', d.parish_id).eq('kind', d.kind).eq('trial_ends_at', d.trial_ends_at)
      results.push(`${d.parish_id} ${d.kind}: email failed ${res.status}`)
    }
  }

  console.log(`trial-reminders: ${results.length} due`, results)
  return new Response(JSON.stringify({ due: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
