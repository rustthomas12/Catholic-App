import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  // Verify the user's token via the Auth REST API
  // (more reliable than JS client auth.getUser when using service role)
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!userRes.ok) {
    return res.status(401).json({ error: 'Invalid session — please log out and back in' })
  }

  const userData = await userRes.json()
  const userId = userData?.id
  if (!userId) return res.status(401).json({ error: 'Could not identify user' })

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    // Soft-delete the profile
    await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId)

    // Hard-delete from Supabase Auth via Admin REST API
    const deleteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    })

    if (!deleteRes.ok) {
      const errBody = await deleteRes.json().catch(() => ({}))
      throw new Error(errBody.message || `Auth deletion failed (${deleteRes.status})`)
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('delete-account error:', err.message)
    return res.status(500).json({ error: err.message || 'Could not delete account' })
  }
}
