/**
 * Build a PostgREST ilike pattern for parish-style names that tolerates
 * punctuation between words: "St Joseph" → "%St%Joseph%" matches
 * "St. Joseph Parish", and a leading "Saint" also finds "St." names.
 * Characters that break PostgREST or() syntax are stripped.
 */
export function fuzzyIlike(input) {
  const words = (input || '')
    .replace(/['.,\-()]/g, ' ')
    .trim()
    .replace(/^saint\b/i, 'St')
    .split(/\s+/)
    .filter(Boolean)
  return words.length ? `%${words.join('%')}%` : '%'
}
