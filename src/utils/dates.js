import {
  formatDistanceToNow,
  format,
  differenceInDays,
  isToday,
  isTomorrow,
  isThisWeek,
} from 'date-fns'

/**
 * Returns a human-readable relative time string.
 * @param {Date|string} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  const d = new Date(date)
  const diffMs = Date.now() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 14) return `${diffDays} days ago`
  if (diffWeeks < 8) return `${diffWeeks} weeks ago`
  return format(d, 'MMMM d')
}

/**
 * Returns a formatted event date string.
 * @param {Date|string} startTime
 * @param {Date|string} [endTime]
 * @returns {string}
 */
export function formatEventDate(startTime, endTime) {
  const start = new Date(startTime)
  const dateStr = format(start, 'EEEE, MMMM d')
  const startTimeStr = format(start, 'h:mm a')

  if (!endTime) return `${dateStr} at ${startTimeStr}`

  const end = new Date(endTime)
  const endTimeStr = format(end, 'h:mm a')
  return `${dateStr} at ${startTimeStr} – ${endTimeStr}`
}

/**
 * Returns a full readable date for a confession record.
 * @param {Date|string} date
 * @returns {string}
 */
export function formatConfessionDate(date) {
  return format(new Date(date), 'MMMM d, yyyy')
}

/**
 * Returns the number of days since a given date.
 * @param {Date|string} date
 * @returns {number}
 */
export function getDaysAgo(date) {
  return differenceInDays(new Date(), new Date(date))
}

/**
 * Returns a human-readable scheduled post time.
 * @param {Date|string} scheduledFor
 * @returns {string}
 */
export function formatScheduledPost(scheduledFor) {
  const d = new Date(scheduledFor)
  const timeStr = format(d, 'h:mm a')
  if (isToday(d)) return `Today at ${timeStr}`
  if (isTomorrow(d)) return `Tomorrow at ${timeStr}`
  if (isThisWeek(d)) return `${format(d, 'EEEE')} at ${timeStr}`
  return `${format(d, 'MMMM d')} at ${timeStr}`
}
