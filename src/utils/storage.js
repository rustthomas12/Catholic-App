import { supabase, supabaseAuth } from '../lib/supabase'
import { shrinkImage } from './imageResize'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const AVATAR_MAX_BYTES = 2 * 1024 * 1024   // 2 MB
const POST_MAX_BYTES = 5 * 1024 * 1024      // 5 MB

function validateImage(file, maxBytes) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, WebP, and GIF images are allowed.'
  }
  if (file.size > maxBytes) {
    return `File must be smaller than ${maxBytes / (1024 * 1024)} MB.`
  }
  return null
}

const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

function getExtension(file) {
  return EXT_BY_TYPE[file.type] || file.name.split('.').pop().toLowerCase()
}

// Ensure Supabase has a fresh token before any storage operation.
// On page refresh the in-memory token may not be initialized yet,
// causing RLS to reject the upload even for valid sessions.
async function ensureSession() {
  await supabaseAuth.auth.getSession()
}

/**
 * Uploads a user avatar.
 * Bucket: avatars   Path: {userId}/avatar.{ext}
 * RLS policy: (storage.foldername(name))[1] = auth.uid()::text
 */
export async function uploadAvatar(userId, original) {
  const file = await shrinkImage(original, { maxDim: 512 })
  const err = validateImage(file, AVATAR_MAX_BYTES)
  if (err) return { url: null, error: err }

  await ensureSession()

  const ext = getExtension(file)
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { url: null, error: uploadError.message }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

/**
 * Uploads an image for a post.
 * Bucket: posts   Path: {userId}/{timestamp}-{random}.{ext}
 * RLS policy: (storage.foldername(name))[1] = auth.uid()::text
 */
export async function uploadPostImage(userId, original) {
  const file = await shrinkImage(original)
  const err = validateImage(file, POST_MAX_BYTES)
  if (err) return { url: null, error: err }

  await ensureSession()

  const ext = getExtension(file)
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('posts')
    .upload(path, file, { contentType: file.type })

  if (uploadError) return { url: null, error: uploadError.message }

  const { data } = supabase.storage.from('posts').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

/**
 * Returns a Supabase Storage public URL with optional transform params.
 */
// Storage path of a post photo from its public URL ("…/object/public/posts/<path>")
export function postImagePath(imageUrl) {
  const marker = '/object/public/posts/'
  const i = imageUrl ? imageUrl.indexOf(marker) : -1
  return i === -1 ? null : decodeURIComponent(imageUrl.slice(i + marker.length).split('?')[0])
}

export function getAvatarUrl(avatarUrl, size = 200) {
  if (!avatarUrl) return null
  // Built-in designs (public/avatars) are SVGs: no resizing needed
  if (avatarUrl.startsWith('/avatars/')) return avatarUrl
  return `${avatarUrl}?width=${size}&height=${size}&resize=cover`
}
