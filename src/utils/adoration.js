// Adoration schedules (migration 114). Times are the parish's local
// wall-clock times as 'HH:MM' or 'HH:MM:SS' strings; '24:00' means midnight
// at the end of the day.

const toMin = (t) => {
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + (m || 0)
}
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** The slots a schedule is split into: [{ index, start, end }] ('HH:MM'). */
export function adorationSlots({ start_time, end_time, slot_minutes }) {
  const start = toMin(start_time)
  const end = toMin(end_time)
  const step = Number(slot_minutes) || 60
  const out = []
  for (let s = start, i = 0; s < end; s += step, i++) {
    out.push({ index: i, start: toHHMM(s), end: toHHMM(Math.min(s + step, end)) })
  }
  return out
}

/** '13:30' -> '1:30 PM'; '24:00' and '00:00' -> '12:00 AM'. */
export function formatClock(t) {
  const min = toMin(t) % (24 * 60)
  const h = Math.floor(min / 60)
  const m = min % 60
  const suffix = h < 12 ? 'AM' : 'PM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Input from <input type="time">: an end of '00:00' means until midnight. */
export function normalizeEnd(end) {
  return end === '00:00' ? '24:00' : end
}

/** True when the time window is valid for a schedule. */
export function validWindow(start, end) {
  if (!start || !end) return false
  return toMin(normalizeEnd(end)) > toMin(start)
}
