/**
 * Truncates text to a maximum length, appending "..." if needed.
 * @param {string} text
 * @param {number} [maxLength=500]
 * @returns {string}
 */
export function truncate(text, maxLength = 500) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

/**
 * Returns initials from a full name (e.g. "Thomas Rust" → "TR").
 * @param {string} fullName
 * @returns {string}
 */
export function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Formats a distance in meters to a human-readable miles string.
 * @param {number} meters
 * @returns {string}
 */
export function formatDistance(meters) {
  const miles = meters / 1609.344
  return `${miles.toFixed(1)} miles`
}

/**
 * Strips HTML tags from user input to prevent XSS in displayed content.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeInput(text) {
  if (!text) return ''
  return text.replace(/<[^>]*>/g, '')
}

/**
 * Generates a URL-safe slug from text.
 * e.g. "St. Patrick's Parish" → "st-patricks-parish"
 * @param {string} text
 * @returns {string}
 */
export function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/['']/g, '')       // remove apostrophes
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .trim()
    .replace(/\s+/g, '-')       // spaces to hyphens
    .replace(/-+/g, '-')        // collapse multiple hyphens
}
