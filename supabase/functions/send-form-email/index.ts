import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const TO_EMAIL = 'info@getcommunio.app'

serve(async (req) => {
  try {
    const payload = await req.json()
    const { type } = payload

    let subject = ''
    let body = ''

    if (type === 'contact') {
      subject = `[Communio] New contact message${payload.reason ? ` — ${payload.reason}` : ''}`
      body = `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#333">
  <div style="background:#1B2A4A;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:#C9A84C;margin:0">New Contact Message</h2>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888;width:120px">From</td><td style="padding:6px 0"><strong>${payload.name || '(no name)'}</strong> &lt;${payload.email}&gt;</td></tr>
      ${payload.reason ? `<tr><td style="padding:6px 0;color:#888">Subject</td><td style="padding:6px 0">${payload.reason}</td></tr>` : ''}
    </table>
    <hr style="border:none;border-top:1px solid #C9A84C;margin:16px 0"/>
    <p style="white-space:pre-wrap;line-height:1.7">${payload.message}</p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0"/>
    <p style="font-size:12px;color:#888">Reply directly to <a href="mailto:${payload.email}">${payload.email}</a></p>
  </div>
</div>`
    } else if (type === 'parish_application') {
      subject = `[Communio] Parish Application — ${payload.parish_name}`
      body = `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#333">
  <div style="background:#1B2A4A;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:#C9A84C;margin:0">New Parish Application</h2>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888;width:140px">Parish</td><td style="padding:6px 0"><strong>${payload.parish_name}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#888">Diocese</td><td style="padding:6px 0">${payload.diocese || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Location</td><td style="padding:6px 0">${[payload.city, payload.state].filter(Boolean).join(', ') || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Contact</td><td style="padding:6px 0">${payload.contact_name || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0"><a href="mailto:${payload.contact_email}">${payload.contact_email}</a></td></tr>
      <tr><td style="padding:6px 0;color:#888">Phone</td><td style="padding:6px 0">${payload.contact_phone || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Parishioners</td><td style="padding:6px 0">${payload.parishioner_count || '—'}</td></tr>
    </table>
    ${payload.notes ? `<hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0"/><p style="color:#555"><strong>Notes:</strong> ${payload.notes}</p>` : ''}
    <hr style="border:none;border-top:1px solid #C9A84C;margin:20px 0"/>
    <p style="font-size:12px;color:#888">Reply to <a href="mailto:${payload.contact_email}">${payload.contact_email}</a></p>
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
        from: 'Communio <noreply@getcommunio.app>',
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
