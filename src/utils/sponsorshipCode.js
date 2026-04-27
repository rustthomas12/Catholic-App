/**
 * Generates a 6-character parish sponsorship code.
 * No ambiguous chars (0, O, I, 1). First 4 = consonants from parish name, last 2 = random.
 */
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateSponsorshipCode(parishName = '') {
  const clean = parishName
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .replace(/[AEIOU]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X')

  const rand = Array.from({ length: 2 }, () =>
    SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
  ).join('')

  return clean + rand
}

export function isValidCodeFormat(code) {
  return /^[A-Z0-9]{6}$/.test(code?.toUpperCase())
}
