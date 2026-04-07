import { supabase } from '../lib/supabase'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const AVATAR_MAX_BYTES = 2 * 1024 * 1024   // 2 MB
const POST_MAX_BYTES = 5 * 1024 * 1024      // 5 MB

function validateImage(file, maxBytes) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, and WebP images are allowed.'
  }
  if (file.size > maxBytes) {
    return `File must be smaller than ${maxBytes / (1024 * 1024)} MB.`
  }
  return null
}

function getExtension(file) {
  return file.name.split('.').pop().toLowerCase()
}

// Ensure Supabase has a fresh token before any storage operation.
// On page refresh the in-memory token may not be initialized yet,
// causing RLS to reject the upload even for valid sessions.
async function ensureSession() {
  await supabase.auth.getSession()
}

/**
 * Uploads a user avatar.
 * Bucket: avatars   Path: {userId}/avatar.{ext}
 * RLS policy: (storage.foldername(name))[1] = auth.uid()::text
 */
export async function uploadAvatar(userId, file) {
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
export async function uploadPostImage(userId, file) {
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
 * Uploads a group avatar.
 * Bucket: groups   Path: {groupId}/avatar.{ext}
 * RLS policy: authenticated users can insert (group membership check
 * is enforced at the application layer)
 */
export async function uploadGroupAvatar(groupId, file) {
  const err = validateImage(file, AVATAR_MAX_BYTES)
  if (err) return { url: null, error: err }

  await ensureSession()

  const ext = getExtension(file)
  const path = `${groupId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('groups')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { url: null, error: uploadError.message }

  const { data } = supabase.storage.from('groups').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

/**
 * Returns a Supabase Storage public URL with optional transform params.
 */
export function getAvatarUrl(avatarUrl, size = 200) {
  if (!avatarUrl) return null
  return `${avatarUrl}?width=${size}&height=${size}&resize=cover`
}
