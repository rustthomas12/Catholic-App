/**
 * POST /api/check-image  { bucket, path }
 *
 * Runs Google SafeSearch on a photo the caller just uploaded. A clearly
 * explicit or graphically violent photo is deleted from storage and the
 * response says { blocked: true }. Every result is recorded in image_checks;
 * a post can only use a photo whose check isn't "blocked" (migration 110).
 *
 * If Google can't be reached the photo is recorded as "unchecked" and allowed,
 * so an outage never stops people posting. Members can still report it.
 */
import { applyNativeCors } from './_native.js'
import { getSessionUser } from './_auth.js'
import { safeSearch, verdictFor } from './_vision.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MAX_BYTES = 8 * 1024 * 1024

// Which folder each bucket's uploads must be in for the caller to own them
const OWNER_PREFIX = {
  posts: (uid) => `${uid}/`,
  avatars: (uid) => `${uid}/`,
  groups: (uid) => `group-avatars/${uid}/`,
}

export function ownsPath(bucket, path, uid) {
  const prefix = OWNER_PREFIX[bucket]
  if (!prefix || typeof path !== 'string') return false
  if (path.includes('..') || path.includes('//') || path.length > 300) return false
  return path.startsWith(prefix(uid)) && path.length > prefix(uid).length
}

const storageUrl = (bucket, path) =>
  `${SUPABASE_URL}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`
const serviceHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

export default async function handler(req, res) {
  if (applyNativeCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).end()

  const user = await getSessionUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { bucket, path } = req.body || {}
  if (!ownsPath(bucket, path, user.id)) return res.status(400).json({ error: 'Invalid photo' })

  const file = await fetch(storageUrl(bucket, path), { headers: serviceHeaders })
  if (!file.ok) return res.status(404).json({ error: 'Photo not found' })
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length > MAX_BYTES) return res.status(400).json({ error: 'Photo too large' })

  let verdict = 'unchecked'
  let scores = null
  try {
    scores = await safeSearch(req, bytes)
    verdict = verdictFor(scores)
  } catch (e) {
    console.error('check-image: SafeSearch unavailable', e.message)
  }

  if (verdict === 'blocked') {
    await fetch(storageUrl(bucket, path), { method: 'DELETE', headers: serviceHeaders }).catch(() => {})
  }

  await fetch(`${SUPABASE_URL}/rest/v1/image_checks`, {
    method: 'POST',
    headers: {
      ...serviceHeaders,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      bucket, path, user_id: user.id, verdict,
      scores: scores && {
        adult: scores.adult, violence: scores.violence, racy: scores.racy,
        medical: scores.medical, spoof: scores.spoof,
      },
      checked_at: new Date().toISOString(),
    }),
  }).catch((e) => console.error('check-image: record failed', e.message))

  return res.status(200).json({ ok: verdict !== 'blocked', blocked: verdict === 'blocked', verdict })
}
