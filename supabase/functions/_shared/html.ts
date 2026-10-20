/** Escape user-supplied text before interpolating it into email HTML. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Only allow http(s) URLs in src/href attributes. */
export function safeUrl(value: unknown): string {
  const s = String(value ?? '')
  return /^https?:\/\//i.test(s) ? esc(s) : ''
}
