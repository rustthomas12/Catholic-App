// Firebase Cloud Messaging (HTTP v1) sender for the iOS / Android apps.
// Deno counterpart of api/_fcm.js — keep in sync.
//
// Secret: FIREBASE_SERVICE_ACCOUNT — the service-account JSON (one line).
//   supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)"
// When unset, native sending is skipped and web push continues as before.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

type ServiceAccount = { project_id: string; client_email: string; private_key: string }
export type PushPayload = { title: string; body: string; url?: string; tag?: string }

let cachedAccount: ServiceAccount | null = null
let cachedToken: { value: string; expiresAt: number } | null = null

function serviceAccount(): ServiceAccount | null {
  if (cachedAccount) return cachedAccount
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
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

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  const sa = serviceAccount()!
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  )

  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))}`
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${base64url(signature)}`,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`FCM auth failed: ${JSON.stringify(data)}`)
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.value
}

export function buildFcmMessage(token: string, { title, body, url = '/', tag }: PushPayload) {
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

/** Returns 'expired' when the token is no longer valid; throws on other failures. */
export async function sendFcm(token: string, payload: PushPayload): Promise<'sent' | 'expired'> {
  const sa = serviceAccount()!
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
  // deno-lint-ignore no-explicit-any
  const code = err?.error?.details?.find((d: any) => d.errorCode)?.errorCode
  // Only treat definite "token is dead" answers as expired; other 400s may be
  // payload problems and must not wipe valid tokens.
  if (res.status === 404 || code === 'UNREGISTERED') return 'expired'
  throw new Error(`FCM ${res.status}: ${err?.error?.message || 'unknown error'}`)
}

/** Sends to every native token for the given users and deletes dead tokens. */
export async function sendFcmToUsers(
  supabase: SupabaseClient,
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number; expired: number }> {
  if (!isFcmConfigured() || !userIds.length) return { sent: 0, failed: 0, expired: 0 }

  const { data: tokens, error } = await supabase
    .from('native_push_tokens')
    .select('token')
    .in('user_id', userIds)
  if (error || !tokens?.length) return { sent: 0, failed: 0, expired: 0 }

  let sent = 0
  let failed = 0
  const expired: string[] = []
  await Promise.allSettled(tokens.map(async ({ token }: { token: string }) => {
    try {
      const result = await sendFcm(token, payload)
      if (result === 'sent') sent++
      else expired.push(token)
    } catch (err) {
      failed++
      console.error('[fcm] send failed:', (err as Error).message)
    }
  }))

  if (expired.length) {
    await supabase.from('native_push_tokens').delete().in('token', expired)
  }
  return { sent, failed, expired: expired.length }
}
