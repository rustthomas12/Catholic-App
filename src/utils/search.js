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

/**
 * Plain "contains" pattern for user text inside a PostgREST or() filter.
 * Commas, parentheses, quotes and wildcards would otherwise end the
 * condition early or add new ones — strip them.
 */
export function containsIlike(input) {
  const cleaned = (input || '').replace(/[,()"'%*\:]/g, ' ').replace(/\s+/g, ' ').trim()
  return `%${cleaned}%`
}
