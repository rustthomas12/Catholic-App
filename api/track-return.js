import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  const { data: activation } = await supabase
    .from('sponsored_activations')
    .select('id, activated_at, returned_at, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (!activation || activation.returned_at) {
    return res.status(200).json({ tracked: false })
  }

  const activatedAt = new Date(activation.activated_at)
  const hoursSinceActivation = (Date.now() - activatedAt) / (1000 * 60 * 60)

  if (hoursSinceActivation < 1) {
    return res.status(200).json({ tracked: false, reason: 'too_soon' })
  }

  await supabase.from('sponsored_activations')
    .update({ returned_at: new Date().toISOString() })
    .eq('id', activation.id)

  return res.status(200).json({ tracked: true })
}
