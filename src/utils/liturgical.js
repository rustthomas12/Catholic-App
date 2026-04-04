/**
 * Liturgical calendar utilities — pure JS, no external libraries.
 */

/**
 * Calculates Easter Sunday for a given year using the Anonymous Gregorian algorithm.
 * Steps:
 *  a = year % 19
 *  b = floor(year / 100), c = year % 100
 *  d = floor(b / 4), e = b % 4
 *  f = floor((b + 8) / 25)
 *  g = floor((b - f + 1) / 3)
 *  h = (19a + b - d - g + 15) % 30
 *  i = floor(c / 4), k = c % 4
 *  l = (32 + 2e + 2i - h - k) % 7
 *  m = floor((a + 11h + 22l) / 451)
 *  month = floor((h + l - 7m + 114) / 31)
 *  day = ((h + l - 7m + 114) % 31) + 1
 *
 * @param {number} year
 * @returns {Date} Easter Sunday
 */
function getEaster(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1 // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

/**
 * Returns the start of Advent (4 Sundays before Dec 25).
 * @param {number} year
 * @returns {Date}
 */
function getAdventStart(year) {
  const christmas = new Date(year, 11, 25)
  const dayOfWeek = christmas.getDay() // 0=Sun
  const daysToSubtract = dayOfWeek === 0 ? 28 : dayOfWeek + 21
  return new Date(year, 11, 25 - daysToSubtract)
}

/**
 * Returns liturgical season information for a given date.
 * @param {Date} [date=new Date()]
 * @returns {{ season: string, color: string, textColor: string, label: string }}
 */
export function getLiturgicalSeason(date = new Date()) {
  const year = date.getFullYear()
  const easter = getEaster(year)

  const ashWednesday = new Date(easter)
  ashWednesday.setDate(easter.getDate() - 46)

  const palmSunday = new Date(easter)
  palmSunday.setDate(easter.getDate() - 7)

  const pentecost = new Date(easter)
  pentecost.setDate(easter.getDate() + 49)

  const adventStart = getAdventStart(year)
  const adventStartPrev = getAdventStart(year - 1)

  const d = date.getTime()

  // Advent (current year)
  if (d >= adventStart.getTime()) {
    return { season: 'advent', color: '#6B21A8', textColor: '#fff', label: 'Advent' }
  }

  // Christmas (Epiphany is Jan 6, season ends following Sunday)
  const epiphany = new Date(year, 0, 6)
  const epiphanyDay = epiphany.getDay()
  const baptismOfLord = new Date(year, 0, 6 + (epiphanyDay === 0 ? 7 : 7 - epiphanyDay))
  if (date >= new Date(year - 1, 11, 25) && date <= baptismOfLord) {
    return { season: 'christmas', color: '#C9A84C', textColor: '#1B2A4A', label: 'Christmas' }
  }
  // Dec 25 of current year onward already caught above by advent check

  // Holy Week (Palm Sunday through Holy Saturday)
  const holySaturday = new Date(easter)
  holySaturday.setDate(easter.getDate() - 1)
  if (d >= palmSunday.getTime() && d <= holySaturday.getTime()) {
    return { season: 'holy_week', color: '#7C2D12', textColor: '#fff', label: 'Holy Week' }
  }

  // Lent (Ash Wednesday through Palm Sunday)
  if (d >= ashWednesday.getTime() && d < palmSunday.getTime()) {
    return { season: 'lent', color: '#6B21A8', textColor: '#fff', label: 'Lent' }
  }

  // Easter (Easter Sunday through Pentecost)
  if (d >= easter.getTime() && d <= pentecost.getTime()) {
    return { season: 'easter', color: '#C9A84C', textColor: '#1B2A4A', label: 'Easter' }
  }

  // Advent previous year (Jan 1 through Baptism of the Lord already handled above)
  // Check if we're in previous year's Advent / Christmas
  const prevAdventStart = getAdventStart(year - 1)
  if (d >= prevAdventStart.getTime() && date < new Date(year, 0, 1)) {
    return { season: 'advent', color: '#6B21A8', textColor: '#fff', label: 'Advent' }
  }

  // Ordinary Time
  return { season: 'ordinary', color: '#15803D', textColor: '#fff', label: 'Ordinary Time' }
}

/**
 * Returns a human-readable liturgical date string.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function formatLiturgicalDate(date = new Date()) {
  const { label } = getLiturgicalSeason(date)
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${days[date.getDay()]}, ${label}`
}

/**
 * Returns whether today is a major feast day.
 * @param {Date} [date=new Date()]
 * @returns {{ isFeast: boolean, feastName?: string }}
 */
export function isMajorFeastDay(date = new Date()) {
  const year = date.getFullYear()
  const easter = getEaster(year)

  const feasts = [
    { date: new Date(year, 0, 6), name: 'Epiphany' },
    { date: new Date(year, 7, 15), name: 'Assumption of Mary' },
    { date: new Date(year, 10, 1), name: 'All Saints Day' },
    { date: new Date(year, 11, 8), name: 'Immaculate Conception' },
    { date: new Date(year, 11, 25), name: 'Christmas' },
  ]

  // Moveable feasts relative to Easter
  const moveable = [
    { offset: -46, name: 'Ash Wednesday' },
    { offset: -7, name: 'Palm Sunday' },
    { offset: -3, name: 'Holy Thursday' },
    { offset: -2, name: 'Good Friday' },
    { offset: 0, name: 'Easter Sunday' },
    { offset: 39, name: 'Ascension Thursday' },
    { offset: 49, name: 'Pentecost' },
  ]

  const normalize = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const today = normalize(date)

  for (const feast of feasts) {
    if (normalize(feast.date) === today) return { isFeast: true, feastName: feast.name }
  }

  for (const m of moveable) {
    const feastDate = new Date(easter)
    feastDate.setDate(easter.getDate() + m.offset)
    if (normalize(feastDate) === today) return { isFeast: true, feastName: m.name }
  }

  return { isFeast: false }
}

/**
 * Returns today's date formatted as MMDDYYYY for the USCCB readings URL.
 * @returns {string}
 */
export function getTodayReadingsDate() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}${dd}${yyyy}`
}
