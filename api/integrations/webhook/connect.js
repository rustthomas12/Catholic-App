import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { parish_id, platform, webhook_url, webhook_secret } = req.body

  if (!parish_id || !webhook_url || !['website_webhook', 'email_webhook'].includes(platform)) {
    return res.status(400).json({ error: 'parish_id, platform, and webhook_url are required' })
  }

  // Validate URL format
  try {
    const url = new URL(webhook_url)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
  } catch {
    return res.status(400).json({ error: 'Invalid webhook URL' })
  }

  // Auto-generate a secret if none provided
  const secret = webhook_secret || crypto.randomBytes(32).toString('hex')

  // Test the endpoint with a ping payload
  try {
    const pingRes = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Communio-Event': 'ping' },
      body: JSON.stringify({ event: 'ping', timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
    })
    // Accept any 2xx response
    if (pingRes.status >= 400) {
      return res.status(400).json({
        error: `Webhook returned ${pingRes.status}. Check the URL and try again.`,
      })
    }
  } catch (e) {
    return res.status(400).json({
      error: 'Could not reach that URL. Make sure it is publicly accessible.',
    })
  }

  await supabase.from('parish_integrations').upsert({
    parish_id,
    platform,
    config: { webhook_url, webhook_secret: secret },
    is_enabled: true,
    last_error: null,
    error_count: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'parish_id,platform' })

  res.status(200).json({ success: true, webhook_secret: secret })
}
