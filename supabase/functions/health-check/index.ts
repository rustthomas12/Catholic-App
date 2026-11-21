import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { esc } from '../_shared/html.ts'

// Health alerts (migration 109). Called every 15 minutes by the health-check
// cron job. Collects problems from health_snapshot() (failed or stalled
// scheduled jobs, failing edge function calls, stuck pushes, new app
// crashes), checks that the website, app and API answer over HTTP, and
// emails the owner. Each problem is emailed at most once every 6 hours
// (health_claim_alert).
//
// Public endpoint (no JWT): it takes no input, reveals nothing in its
// response beyond counts, and the 6-hour claim stops forged calls from
// sending repeat emails.

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
// The getinfold.app catch-all forwards to the owner
const ALERT_EMAIL = Deno.env.get('ALERT_EMAIL') || 'info@getinfold.app'

type Problem = { key: string; title: string; detail: string }

const today = () => new Date().toISOString().slice(0, 10)
const HTTP_CHECKS: { key: string; name: string; url: () => string; expect?: (body: string) => boolean }[] = [
  { key: 'http:app', name: 'The app (app.getinfold.app)', url: () => 'https://app.getinfold.app/' },
  { key: 'http:site', name: 'The website (getinfold.app)', url: () => 'https://getinfold.app/' },
  {
    key: 'http:api', name: 'The API (Vercel functions)',
    url: () => `https://app.getinfold.app/api/readings?date=${today()}`,
    expect: (body) => body.includes('"success":true'),
  },
]

async function httpProblems(): Promise<Problem[]> {
  const out: Problem[] = []
  await Promise.all(HTTP_CHECKS.map(async (c) => {
    let why = ''
    // Retry once so a single slow response doesn't page anyone
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(c.url(), { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'inFold-health-check' } })
        const body = await res.text()
        if (!res.ok) why = `answered ${res.status}`
        else if (c.expect && !c.expect(body)) why = 'answered, but without the expected content'
        else { why = ''; break }
      } catch (err) {
        why = `did not answer (${(err as Error).name === 'TimeoutError' ? 'timed out after 15 seconds' : (err as Error).message})`
      }
    }
    if (why) out.push({ key: c.key, title: `${c.name} is down`, detail: `${c.url()} ${why}, twice in a row.` })
  }))
  return out
}

async function sendAlert(p: Problem): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'inFold Alerts <noreply@getinfold.app>',
      to: [ALERT_EMAIL],
      subject: `inFold alert: ${p.title}`.slice(0, 180),
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;color:#1b2a4a">
  <h2 style="margin:0 0 8px;font-size:18px">${esc(p.title)}</h2>
  <p style="font-size:14px;line-height:1.5;color:#333">${esc(p.detail)}</p>
  <p style="font-size:12px;color:#888;margin-top:16px">From the inFold health check (every 15 minutes). You'll get at most one email about this every 6 hours while it continues.</p>
</div>`,
    }),
  })
  if (!res.ok) console.error('Alert email failed:', res.status, await res.text())
  return res.ok
}

serve(async () => {
  const problems: Problem[] = []
  const { data, error } = await supabase.rpc('health_snapshot')
  if (error) {
    problems.push({ key: 'snapshot_failed', title: 'The health check could not read the database', detail: error.message })
  } else {
    problems.push(...((data ?? []) as Problem[]))
  }
  problems.push(...await httpProblems())

  let sent = 0
  for (const p of problems) {
    const { data: claimed, error: claimErr } = await supabase.rpc('health_claim_alert', { p_key: p.key, p_detail: p.detail })
    if (claimErr) { console.error('Claim failed:', claimErr.message); continue }
    if (!claimed) continue
    if (await sendAlert(p)) sent++
    else await supabase.rpc('health_release_alert', { p_key: p.key })
  }

  if (problems.length) console.log('Health problems:', problems.map((p) => p.key).join(', '))
  return new Response(JSON.stringify({ problems: problems.length, emailed: sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
