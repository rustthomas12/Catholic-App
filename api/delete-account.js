const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  // Verify the caller's session
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${token}` },
  })
  if (!userRes.ok) return res.status(401).json({ error: 'Invalid session — please log out and back in' })

  const userId = (await userRes.json())?.id
  if (!userId) return res.status(401).json({ error: 'Could not identify user' })

  try {
    // 1. Soft-delete the profile so the UI shows the account as removed
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    })

    // 2. Ban the auth account and replace the email with a placeholder.
    //    - ban_duration prevents the user logging back in
    //    - Replacing the email frees it up so they can re-register with
    //      the same address if they change their mind
    const banRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `deleted-${userId}@communio.invalid`,
        ban_duration: '876000h',
      }),
    })

    if (!banRes.ok) {
      const err = await banRes.json().catch(() => ({}))
      throw new Error(err.message || `Failed to deactivate account (${banRes.status})`)
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('delete-account error:', err.message)
    return res.status(500).json({ error: err.message || 'Could not delete account' })
  }
}
