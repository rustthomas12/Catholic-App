import i18n from './i18n'

/**
 * Byzantine liturgical calendar: seasons, fasting periods and the Great Feasts.
 *
 * Uses the Gregorian (civil) calendar for fixed feasts and the Gregorian
 * Pascha, which is what most Byzantine Catholic eparchies in the United
 * States follow (Ruthenian, Melkite, and most Ukrainian parishes). Parishes
 * on the Julian calendar are not handled yet.
 *
 * Every date is a local calendar day; times of day are ignored.
 */

const DAY = 24 * 60 * 60 * 1000

function dayNumber(date) {
  // Days since the epoch for the local calendar date (DST-safe)
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY)
}

function ymd(year, month, day) {
  return Math.round(Date.UTC(year, month, day) / DAY)
}

// Gregorian Pascha (Anonymous Gregorian algorithm), as a day number
export function gregorianPascha(year) {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return ymd(year, month, day)
}

// season id → [English label, background colour, text colour]
const SEASONS = {
  nativity_fast:    ['Nativity Fast',          '#7F1D1D', '#fff'],
  nativity:         ['Nativity of the Lord',   '#C9A84C', '#1B2A4A'],
  theophany:        ['Theophany',              '#7DD3FC', '#1B2A4A'],
  after_theophany:  ['After Theophany',        '#15803D', '#fff'],
  triodion:         ['Pre-Lent (Triodion)',    '#6B21A8', '#fff'],
  great_lent:       ['Great Lent',             '#4C1D95', '#fff'],
  holy_week:        ['Great and Holy Week',    '#1F2937', '#fff'],
  pascha:           ['Paschal Season',         '#B91C1C', '#fff'],
  pentecost_season: ['Ascension to Pentecost', '#15803D', '#fff'],
  apostles_fast:    ["Apostles' Fast",         '#9A3412', '#fff'],
  dormition_fast:   ['Dormition Fast',         '#1E40AF', '#fff'],
  after_pentecost:  ['After Pentecost',        '#15803D', '#fff'],
}

function season(id) {
  const [label, color, textColor] = SEASONS[id]
  return { season: `byz_${id}`, color, textColor, label, fasting: id.endsWith('_fast') || id === 'great_lent' }
}

/**
 * The Byzantine season for a date.
 * @returns {{ season: string, color: string, textColor: string, label: string, fasting: boolean }}
 */
export function getByzantineSeason(date = new Date()) {
  const year = date.getFullYear()
  const d = dayNumber(date)
  const P = gregorianPascha(year)

  // Fixed seasons around Christmas and Theophany (Dec 25 – Jan 14)
  if (d >= ymd(year, 11, 25) || d <= ymd(year, 0, 5)) return season('nativity')
  if (d <= ymd(year, 0, 14)) return season('theophany')
  if (d >= ymd(year, 10, 15)) return season('nativity_fast')        // Nov 15 – Dec 24

  // The Paschal cycle
  if (d >= P - 70 && d < P - 48) return season('triodion')         // Publican & Pharisee → Cheesefare Sunday
  if (d >= P - 48 && d < P - 7) return season('great_lent')        // Clean Monday → Lazarus Saturday
  if (d >= P - 7 && d < P) return season('holy_week')              // Palm Sunday → Holy Saturday
  if (d >= P && d <= P + 38) return season('pascha')               // Pascha → Leave-taking of Pascha
  if (d > P + 38 && d <= P + 56) return season('pentecost_season') // Ascension → Sunday of All Saints
  if (d > P + 56 && d <= ymd(year, 5, 28)) return season('apostles_fast') // → June 28

  if (d >= ymd(year, 7, 1) && d <= ymd(year, 7, 14)) return season('dormition_fast') // Aug 1–14
  if (d < P - 70) return season('after_theophany')
  return season('after_pentecost')
}

// Great Feasts and other major days. [month (0-based), day, id, English name]
const FIXED_FEASTS = [
  [0, 1,   'circumcision',     'Circumcision of the Lord; St. Basil the Great'],
  [0, 6,   'theophany',        'Holy Theophany'],
  [1, 2,   'encounter',        'Encounter of the Lord'],
  [2, 25,  'annunciation',     'Annunciation'],
  [5, 29,  'peter_paul',       'Holy Apostles Peter and Paul'],
  [7, 6,   'transfiguration',  'Holy Transfiguration'],
  [7, 15,  'dormition',        'Dormition of the Theotokos'],
  [8, 8,   'nativity_theotokos','Nativity of the Theotokos'],
  [8, 14,  'exaltation',       'Exaltation of the Holy Cross'],
  [10, 21, 'entrance',         'Entrance of the Theotokos into the Temple'],
  [11, 6,  'nicholas',         'St. Nicholas the Wonderworker'],
  [11, 25, 'nativity',         'Nativity of the Lord'],
]

// [days from Pascha, id, English name]
const MOVEABLE_FEASTS = [
  [-70, 'publican_pharisee', 'Sunday of the Publican and the Pharisee'],
  [-49, 'forgiveness',       'Forgiveness Sunday (Cheesefare)'],
  [-48, 'clean_monday',      'Clean Monday: Great Lent begins'],
  [-42, 'orthodoxy',         'Sunday of Orthodoxy'],
  [-8,  'lazarus',           'Lazarus Saturday'],
  [-7,  'palm_sunday',       'Entrance of the Lord into Jerusalem (Palm Sunday)'],
  [-3,  'holy_thursday',     'Great and Holy Thursday'],
  [-2,  'holy_friday',       'Great and Holy Friday'],
  [-1,  'holy_saturday',     'Great and Holy Saturday'],
  [0,   'pascha',            'Holy Pascha: Christ is risen!'],
  [39,  'ascension',         'Ascension of the Lord'],
  [49,  'pentecost',         'Pentecost'],
  [56,  'all_saints',        'Sunday of All Saints'],
]

/**
 * The feast for a date, if any.
 * @returns {{ isFeast: boolean, feastName?: string, feastId?: string }}
 */
export function getByzantineFeast(date = new Date()) {
  const year = date.getFullYear()
  const d = dayNumber(date)
  const P = gregorianPascha(year)
  const name = (id, en) => i18n.t(`common:byz_feast.${id}`, { defaultValue: en })

  // Moveable feasts first: Palm Sunday or Pascha outrank a fixed day
  for (const [offset, id, en] of MOVEABLE_FEASTS) {
    if (d === P + offset) return { isFeast: true, feastId: id, feastName: name(id, en) }
  }
  for (const [m, day, id, en] of FIXED_FEASTS) {
    if (d === ymd(year, m, day)) return { isFeast: true, feastId: id, feastName: name(id, en) }
  }
  return { isFeast: false }
}
