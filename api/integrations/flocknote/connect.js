import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { parish_id, api_key, network_id, group_id } = req.body

  if (!parish_id || !api_key || !network_id) {
    return res.status(400).json({ error: 'parish_id, api_key, and network_id are required' })
  }

  // Verify credentials against Flocknote API before saving
  let networkName
  try {
    const testRes = await fetch(
      `https://flocknote.com/api/v2/networks/${network_id}`,
      {
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!testRes.ok) {
      return res.status(400).json({
        error: 'Invalid credentials. Check your API key and Network ID.',
      })
    }

    const data = await testRes.json()
    networkName = data.name
  } catch {
    return res.status(500).json({ error: 'Could not reach Flocknote. Try again.' })
  }

  await supabase.from('parish_integrations').upsert({
    parish_id,
    platform: 'flocknote',
    access_token: api_key,
    config: {
      network_id,
      group_id: group_id || null,
      network_name: networkName,
    },
    is_enabled: true,
    last_error: null,
    error_count: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'parish_id,platform' })

  res.status(200).json({ success: true, network_name: networkName })
}
