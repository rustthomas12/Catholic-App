import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { esc } from '../_shared/html.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const TO_EMAIL = 'info@getinfold.app'

serve(async (req) => {
  try {
    const request = await req.json()
    const { type } = request

    // Public endpoint: the trigger sends only { type, id }. Atomically claim
    // the stored row (recent, not yet emailed) and email its contents, so a
    // forged or replayed call can't send anything.
    const table = type === 'contact' ? 'contact_submissions'
      : type === 'parish_application' ? 'parish_applications' : null
    if (!table || !request.id) return new Response('ignored', { status: 200 })
    const { data: payload } = await supabase
      .from(table)
      .update({ emailed_at: new Date().toISOString() })
      .eq('id', request.id)
      .is('emailed_at', null)
      .gt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .select('*')
      .maybeSingle()
    if (!payload) return new Response('ignored', { status: 200 })

    let subject = ''
    let body = ''

    if (type === 'contact') {
      subject = `[inFold] New contact message${payload.reason ? ` — ${payload.reason}` : ''}`
      body = `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#333">
  <div style="background:#1B2A4A;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:#C9A84C;margin:0">New Contact Message</h2>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888;width:120px">From</td><td style="padding:6px 0"><strong>${esc(payload.name || '(no name)')}</strong> &lt;${esc(payload.email)}&gt;</td></tr>
      ${payload.reason ? `<tr><td style="padding:6px 0;color:#888">Subject</td><td style="padding:6px 0">${esc(payload.reason)}</td></tr>` : ''}
    </table>
    <hr style="border:none;border-top:1px solid #C9A84C;margin:16px 0"/>
    <p style="white-space:pre-wrap;line-height:1.7">${esc(payload.message)}</p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0"/>
    <p style="font-size:12px;color:#888">Reply directly to <a href="mailto:${esc(payload.email)}">${esc(payload.email)}</a></p>
  </div>
</div>`
    } else if (type === 'parish_application') {
      subject = `[inFold] Parish Application — ${payload.parish_name}`
      body = `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#333">
  <div style="background:#1B2A4A;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:#C9A84C;margin:0">New Parish Application</h2>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888;width:140px">Parish</td><td style="padding:6px 0"><strong>${esc(payload.parish_name)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#888">Diocese</td><td style="padding:6px 0">${esc(payload.diocese || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Location</td><td style="padding:6px 0">${esc([payload.city, payload.state].filter(Boolean).join(', ') || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Contact</td><td style="padding:6px 0">${esc(payload.contact_name || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0"><a href="mailto:${esc(payload.contact_email)}">${esc(payload.contact_email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#888">Phone</td><td style="padding:6px 0">${esc(payload.contact_phone || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Parishioners</td><td style="padding:6px 0">${esc(payload.parishioner_count || '—')}</td></tr>
    </table>
    ${payload.notes ? `<hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0"/><p style="color:#555"><strong>Notes:</strong> ${esc(payload.notes)}</p>` : ''}
    <hr style="border:none;border-top:1px solid #C9A84C;margin:20px 0"/>
    <p style="font-size:12px;color:#888">Reply to <a href="mailto:${esc(payload.contact_email)}">${esc(payload.contact_email)}</a></p>
  </div>
</div>`
    } else {
      return new Response('Unknown type', { status: 400 })
    }

    // Send via Resend API
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey || resendKey === 're_placeholder') {
      // Fallback: log only (Resend not configured yet)
      console.log('Form submission received (Resend not configured):', subject)
      return new Response('logged', { status: 200 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'inFold <noreply@getinfold.app>',
        to: [TO_EMAIL],
        subject,
        html: body,
        reply_to: payload.email || payload.contact_email,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return new Response('email failed', { status: 500 })
    }

    return new Response('sent', { status: 200 })
  } catch (err) {
    console.error('send-form-email error:', err)
    return new Response(String(err), { status: 500 })
  }
})
