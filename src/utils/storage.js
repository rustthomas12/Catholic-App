import { supabase, supabaseAuth, authJsonHeaders } from '../lib/supabase'
import { apiUrl } from '../lib/platform'
import i18n from './i18n'
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
 * Runs the server's photo safety check (Google SafeSearch) on a file the user
 * just uploaded. Returns null when the photo can be used, or an error message.
 * A blocked photo has already been deleted by the server; if the check itself
 * couldn't run, the upload is removed so it isn't left behind unused.
 */
export async function checkUploadedImage(bucket, path) {
  try {
    const res = await fetch(apiUrl('/api/check-image'), {
      method: 'POST',
      headers: await authJsonHeaders(),
      body: JSON.stringify({ bucket, path }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body.ok) return null
    if (body.blocked) {
      return i18n.t('common:photo_check.blocked',
        "This photo can't be posted because it may break the community guidelines. Please choose a different photo.")
    }
  } catch { /* network error: fall through */ }
  supabase.storage.from(bucket).remove([path]).catch(() => {})
  return i18n.t('common:photo_check.failed', "Couldn't upload the photo. Please try again.")
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
  const checkError = await checkUploadedImage('avatars', path)
  if (checkError) return { url: null, error: checkError }

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
  const checkError = await checkUploadedImage('posts', path)
  if (checkError) return { url: null, error: checkError }

  const { data } = supabase.storage.from('posts').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

/**
 * Uploads a group photo.
 * Bucket: groups   Path: group-avatars/{userId}/{timestamp}.{ext}
 * RLS policy: folder[1] = 'group-avatars' and folder[2] = auth.uid()::text
 */
export async function uploadGroupPhoto(userId, original) {
  const file = await shrinkImage(original, { maxDim: 512 })
  const err = validateImage(file, AVATAR_MAX_BYTES)
  if (err) return { url: null, error: err }

  await ensureSession()

  const path = `group-avatars/${userId}/${Date.now()}.${getExtension(file)}`
  const { error: uploadError } = await supabase.storage
    .from('groups')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { url: null, error: uploadError.message }
  const checkError = await checkUploadedImage('groups', path)
  if (checkError) return { url: null, error: checkError }

  const { data } = supabase.storage.from('groups').getPublicUrl(path)
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
