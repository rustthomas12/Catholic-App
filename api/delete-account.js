import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify the caller's JWT to get their user ID
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' })

  try {
    // Soft-delete the profile first
    await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', user.id)

    // Hard-delete from Supabase Auth (requires service role)
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) throw error

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('delete-account error:', err)
    res.status(500).json({ error: err.message || 'Could not delete account' })
  }
}
