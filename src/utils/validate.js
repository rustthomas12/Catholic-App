/**
 * Light validation for contact fields entered by admins.
 * Returns { value, error } — value is normalised (trimmed, https:// added).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function checkEmail(raw) {
  const value = (raw || '').trim()
  if (!value) return { value: null, error: null }
  return EMAIL_RE.test(value) ? { value, error: null } : { value, error: 'Enter a valid email address.' }
}

/** http(s) only; bare domains get https:// */
export function checkUrl(raw, label = 'link') {
  let value = (raw || '').trim()
  if (!value) return { value: null, error: null }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = `https://${value}`
  try {
    const u = new URL(value)
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) throw new Error()
    return { value: u.toString(), error: null }
  } catch {
    return { value, error: `Enter a valid web address for the ${label}.` }
  }
}

/** Only https images may be shown (no javascript:, data:, http mixed content). */
export function safeImageUrl(raw) {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' ? u.toString() : null
  } catch { return null }
}
