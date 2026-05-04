import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  try {
    const payload = await req.json()
    const post = payload.record

    // Only distribute parish announcements
    if (!post?.parish_id || !post?.is_announcement) {
      return ok('Not a parish announcement — skipping')
    }

    const { data: integrations, error } = await supabase
      .from('parish_integrations')
      .select('*')
      .eq('parish_id', post.parish_id)
      .eq('is_enabled', true)

    if (error || !integrations?.length) {
      return ok('No enabled integrations')
    }

    const results = await Promise.allSettled(
      integrations.map(integration => distribute(post, integration))
    )

    // Log all results
    const logs = results.map((result, i) => ({
      parish_id:      post.parish_id,
      integration_id: integrations[i].id,
      platform:       integrations[i].platform,
      post_id:        post.id,
      status:         result.status === 'fulfilled' ? 'success' : 'failed',
      error_message:  result.status === 'rejected' ? String(result.reason) : null,
    }))

    await supabase.from('integration_logs').insert(logs)

    // Update each integration's status
    for (let i = 0; i < integrations.length; i++) {
      if (results[i].status === 'fulfilled') {
        await supabase
          .from('parish_integrations')
          .update({ last_sync_at: new Date().toISOString(), last_error: null, error_count: 0, updated_at: new Date().toISOString() })
          .eq('id', integrations[i].id)
      } else {
        await supabase
          .from('parish_integrations')
          .update({ last_error: String((results[i] as PromiseRejectedResult).reason), error_count: (integrations[i].error_count || 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', integrations[i].id)
      }
    }

    return new Response(
      JSON.stringify({ distributed: integrations.length, logs: logs.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('distribute-post error:', err)
    return new Response(String(err), { status: 500 })
  }
})

function ok(msg: string) {
  return new Response(msg, { status: 200 })
}

async function distribute(post: any, integration: any): Promise<void> {
  switch (integration.platform) {
    case 'facebook':       return distributeToFacebook(post, integration)
    case 'flocknote':      return distributeToFlocknote(post, integration)
    case 'instagram':      return distributeToInstagram(post, integration)
    case 'google_business': return distributeToGoogleBusiness(post, integration)
    case 'website_webhook':
    case 'email_webhook':  return distributeToWebhook(post, integration)
    default:
      throw new Error(`Unknown platform: ${integration.platform}`)
  }
}

// ── Facebook ────────────────────────────────────────────────

async function distributeToFacebook(post: any, integration: any): Promise<void> {
  const { page_id, awaiting_page_selection } = integration.config

  if (awaiting_page_selection || !page_id) {
    throw new Error('Facebook page not selected — please complete setup in the Integrations tab')
  }

  // Refresh token if expiring within 7 days
  await maybeRefreshFacebookToken(integration)

  const message = buildMessage(post)

  const res = await fetch(`https://graph.facebook.com/v18.0/${page_id}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      access_token: integration.access_token,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Facebook: ${err.error?.message || res.status}`)
  }
}

async function maybeRefreshFacebookToken(integration: any): Promise<void> {
  if (!integration.token_expires_at) return
  const expiresAt = new Date(integration.token_expires_at).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (Date.now() < expiresAt - sevenDays) return

  // Attempt refresh — Facebook long-lived tokens can be refreshed by re-exchanging
  const appId     = Deno.env.get('FACEBOOK_APP_ID')
  const appSecret = Deno.env.get('FACEBOOK_APP_SECRET')
  if (!appId || !appSecret) return

  const res = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token` +
    `?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}` +
    `&fb_exchange_token=${integration.access_token}`
  )
  const data = await res.json()
  if (data.access_token) {
    await supabase.from('parish_integrations').update({
      access_token: data.access_token,
      token_expires_at: new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', integration.id)
    integration.access_token = data.access_token
  }
}

// ── Flocknote ───────────────────────────────────────────────

async function distributeToFlocknote(post: any, integration: any): Promise<void> {
  const { network_id, group_id } = integration.config

  const { data: parish } = await supabase
    .from('parishes')
    .select('name')
    .eq('id', post.parish_id)
    .single()

  const parishName = parish?.name || 'Parish Update'
  const subject = `${parishName}: ${truncate(post.content, 60)}`

  const endpoint = group_id
    ? `https://flocknote.com/api/v2/groups/${group_id}/messages`
    : `https://flocknote.com/api/v2/networks/${network_id}/messages`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${integration.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject,
      body: buildEmailBody(post, parishName),
      send_now: true,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Flocknote: ${err.message || res.status}`)
  }
}

// ── Website / Email Webhook ─────────────────────────────────

async function distributeToWebhook(post: any, integration: any): Promise<void> {
  const { webhook_url, webhook_secret } = integration.config

  const payload = {
    event: 'post.published',
    parish_id:  post.parish_id,
    post: {
      id:              post.id,
      content:         post.content,
      image_url:       post.image_url || null,
      is_announcement: post.is_announcement,
      created_at:      post.created_at,
    },
    timestamp: new Date().toISOString(),
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (webhook_secret) {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(webhook_secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(payload)))
    headers['X-Communio-Signature'] = btoa(String.fromCharCode(...new Uint8Array(sig)))
  }

  const res = await fetch(webhook_url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    throw new Error(`Webhook: ${res.status} ${res.statusText}`)
  }
}

// ── Google Business ─────────────────────────────────────────

async function distributeToGoogleBusiness(post: any, integration: any): Promise<void> {
  const { account_id, location_id } = integration.config

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${account_id}/locations/${location_id}/localPosts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        languageCode: 'en',
        summary: truncate(post.content, 1500),
        topicType: 'STANDARD',
      }),
    }
  )

  if (!res.ok) throw new Error(`Google Business: ${res.status}`)
}

// ── Instagram ───────────────────────────────────────────────

async function distributeToInstagram(post: any, integration: any): Promise<void> {
  if (!post.image_url) return  // Instagram requires an image — skip silently

  const { instagram_account_id } = integration.config

  const mediaRes = await fetch(
    `https://graph.facebook.com/v18.0/${instagram_account_id}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url:    post.image_url,
        caption:      truncate(post.content, 2200),
        access_token: integration.access_token,
      }),
    }
  )
  if (!mediaRes.ok) throw new Error('Instagram: media creation failed')
  const { id: creationId } = await mediaRes.json()

  const publishRes = await fetch(
    `https://graph.facebook.com/v18.0/${instagram_account_id}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: integration.access_token }),
    }
  )
  if (!publishRes.ok) throw new Error('Instagram: publish failed')
}

// ── Helpers ─────────────────────────────────────────────────

function buildMessage(post: any): string {
  return truncate(post.content || '', 63000)
}

function buildEmailBody(post: any, parishName: string): string {
  return `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#333">
  <div style="background:#1B2A4A;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:#C9A84C;margin:0">${parishName}</h2>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px">
    <p style="line-height:1.75;font-size:15px">${(post.content || '').replace(/\n/g, '<br>')}</p>
    ${post.image_url ? `<img src="${post.image_url}" style="max-width:100%;border-radius:8px;margin-top:16px" alt=""/>` : ''}
    <hr style="border:none;border-top:1px solid #C9A84C;margin:24px 0"/>
    <p style="font-size:12px;color:#888">
      Sent via <a href="https://getcommunio.app" style="color:#1B2A4A">Communio</a> · The Digital Parish Hall
    </p>
  </div>
</div>`
}

function truncate(str: string, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 3) + '...' : str
}
