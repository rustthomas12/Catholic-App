import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, userId } = req.body

  if (!code || !userId) {
    return res.status(400).json({ error: 'Missing code or userId' })
  }

  const upperCode = code.trim().toUpperCase()

  if (!/^[A-Z0-9]{6}$/.test(upperCode)) {
    return res.status(400).json({ error: 'Invalid code format' })
  }

  // Look up the code
  const { data: codeRow, error: codeErr } = await supabase
    .from('parish_sponsorship_codes')
    .select('id, parish_id, is_active, parishes(name)')
    .eq('code', upperCode)
    .single()

  if (codeErr || !codeRow) {
    return res.status(404).json({ error: 'Code not found. Check with your parish.' })
  }

  if (!codeRow.is_active) {
    return res.status(400).json({ error: 'This code has expired. Ask your parish for the current code.' })
  }

  // Check parish has active subscription
  const { data: parishSub } = await supabase
    .from('parish_subscriptions')
    .select('status')
    .eq('parish_id', codeRow.parish_id)
    .single()

  if (!parishSub || !['trialing', 'active'].includes(parishSub.status)) {
    return res.status(400).json({ error: 'This parish does not have an active Communio subscription.' })
  }

  // Check if user already has an activation
  const { data: existing } = await supabase
    .from('sponsored_activations')
    .select('id, parish_id, is_active')
    .eq('user_id', userId)
    .single()

  if (existing?.is_active) {
    return res.status(400).json({ error: 'You already have an active parish sponsorship.' })
  }

  // Check if user already has individual premium
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium, premium_source')
    .eq('id', userId)
    .single()

  if (profile?.is_premium && profile?.premium_source === 'individual') {
    return res.status(400).json({
      error: 'You already have an individual premium subscription. Manage it from the premium page.',
      already_premium: true,
    })
  }

  const activationData = {
    user_id: userId,
    parish_id: codeRow.parish_id,
    code_id: codeRow.id,
    activated_at: new Date().toISOString(),
    returned_at: null,
    is_active: true,
    deactivated_at: null,
  }

  if (existing) {
    await supabase.from('sponsored_activations').update(activationData).eq('user_id', userId)
  } else {
    await supabase.from('sponsored_activations').insert(activationData)
  }

  await supabase.from('profiles').update({
    is_premium: true,
    premium_source: 'parish_sponsored',
    sponsored_by_parish_id: codeRow.parish_id,
    sponsorship_activated_at: new Date().toISOString(),
  }).eq('id', userId)

  return res.status(200).json({
    success: true,
    parishName: codeRow.parishes?.name || 'Your parish',
    message: 'Premium activated! Welcome to the full Communio experience.',
  })
}
