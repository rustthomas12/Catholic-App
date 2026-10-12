/**
 * Firebase Cloud Messaging (HTTP v1) sender for the iOS / Android apps.
 * Node counterpart of supabase/functions/_shared/fcm.ts — keep in sync.
 *
 * Env: FIREBASE_SERVICE_ACCOUNT — the service-account JSON (one line) from
 * Firebase console → Project settings → Service accounts → Generate key.
 * When unset, native sending is skipped and web push continues as before.
 */
import crypto from 'crypto'

let cachedAccount = null
let cachedToken = null // { value, expiresAt }

function serviceAccount() {
  if (cachedAccount) return cachedAccount
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  try {
    cachedAccount = JSON.parse(raw)
    return cachedAccount
  } catch {
    console.error('[fcm] FIREBASE_SERVICE_ACCOUNT is not valid JSON')
    return null
  }
}

export function isFcmConfigured() {
  return !!serviceAccount()
}

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  const sa = serviceAccount()
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claims = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url')
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(`${header}.${claims}`)
    .sign(sa.private_key)
    .toString('base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`FCM auth failed: ${JSON.stringify(data)}`)
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.value
}

/**
 * Builds the FCM v1 message for one device from the same payload the web
 * push senders use: { title, body, url, tag }.
 */
export function buildFcmMessage(token, { title, body, url = '/', tag }) {
  return {
    token,
    notification: { title, body },
    data: { url, ...(tag ? { tag } : {}) },
    android: {
      priority: 'high',
      notification: { ...(tag ? { tag } : {}), sound: 'default', color: '#1B2A4A' },
    },
    apns: {
      payload: { aps: { sound: 'default', ...(tag ? { 'thread-id': tag.replace(/-\d+$/, '') } : {}) } },
    },
  }
}

/**
 * Sends one notification to one device token.
 * @returns {Promise<'sent'|'expired'>} 'expired' when the token is no longer valid
 * @throws on other failures
 */
export async function sendFcm(token, payload) {
  const sa = serviceAccount()
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: buildFcmMessage(token, payload) }),
  })
  if (res.ok) return 'sent'

  const err = await res.json().catch(() => ({}))
  const code = err?.error?.details?.find((d) => d.errorCode)?.errorCode
  // Only treat definite "token is dead" answers as expired; other 400s may be
  // payload problems and must not wipe valid tokens.
  if (res.status === 404 || code === 'UNREGISTERED') return 'expired'
  throw new Error(`FCM ${res.status}: ${err?.error?.message || 'unknown error'}`)
}

/**
 * Sends to every native token for the given users and deletes dead tokens.
 * @returns {Promise<{sent: number, expired: number}>}
 */
export async function sendFcmToUsers(supabase, userIds, payload) {
  if (!isFcmConfigured() || !userIds?.length) return { sent: 0, expired: 0 }

  const { data: tokens, error } = await supabase
    .from('native_push_tokens')
    .select('token')
    .in('user_id', userIds)
  if (error || !tokens?.length) return { sent: 0, expired: 0 }

  let sent = 0
  const expired = []
  await Promise.allSettled(tokens.map(async ({ token }) => {
    try {
      const result = await sendFcm(token, payload)
      if (result === 'sent') sent++
      else expired.push(token)
    } catch (err) {
      console.error('[fcm] send failed:', err.message)
    }
  }))

  if (expired.length) {
    await supabase.from('native_push_tokens').delete().in('token', expired)
  }
  return { sent, expired: expired.length }
}
