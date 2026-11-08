import { applyNativeCors } from './_native.js'
/**
 * Vercel serverless function — Catholic Readings API proxy.
 * References:  https://cpbjr.github.io/catholic-readings-api/
 * Bible text:  https://bible-api.com/ — World English Bible (public domain,
 *              modern English, with the deuterocanon), its verse numbers
 *              mapped from the US lectionary's (lectionaryToWEB below);
 *              fallback https://rest.api.bible/ — Douay-Rheims 1899
 * Liturgical:  https://litcal.johnromanodorazio.com/ — US national calendar
 */

const API_BIBLE_KEY    = process.env.API_BIBLE_KEY
const DOUAY_RHEIMS_ID  = '179568874c45066f-01'

// ── Book name → OSIS code ──────────────────────────────────
const BOOK_CODES = {
  // Pentateuch
  'genesis':'GEN','gen':'GEN',
  'exodus':'EXO','ex':'EXO','exo':'EXO',
  'leviticus':'LEV','lev':'LEV',
  'numbers':'NUM','num':'NUM',
  'deuteronomy':'DEU','deut':'DEU','deu':'DEU',
  // History
  'joshua':'JOS','josh':'JOS','jos':'JOS',
  'judges':'JDG','judg':'JDG','jdg':'JDG',
  'ruth':'RUT','rut':'RUT',
  '1 samuel':'1SA','1samuel':'1SA','1 sam':'1SA','1sam':'1SA',
  '2 samuel':'2SA','2samuel':'2SA','2 sam':'2SA','2sam':'2SA',
  '1 kings':'1KI','1kings':'1KI','1 kgs':'1KI','1kgs':'1KI',
  '2 kings':'2KI','2kings':'2KI','2 kgs':'2KI','2kgs':'2KI',
  '1 chronicles':'1CH','1chronicles':'1CH','1 chr':'1CH','1chr':'1CH',
  '2 chronicles':'2CH','2chronicles':'2CH','2 chr':'2CH','2chr':'2CH',
  'ezra':'EZR','ezr':'EZR',
  'nehemiah':'NEH','neh':'NEH',
  // Deuterocanon
  'tobit':'TOB','tob':'TOB',
  'judith':'JDT','jdt':'JDT',
  'esther':'EST','est':'EST',
  '1 maccabees':'1MA','1maccabees':'1MA','1 macc':'1MA','1macc':'1MA',
  '2 maccabees':'2MA','2maccabees':'2MA','2 macc':'2MA','2macc':'2MA',
  // Wisdom
  'job':'JOB',
  'psalm':'PSA','psalms':'PSA','ps':'PSA','pss':'PSA',
  'proverbs':'PRO','prov':'PRO','pro':'PRO',
  'ecclesiastes':'ECC','eccl':'ECC','ecc':'ECC',
  'song of songs':'SNG','song of solomon':'SNG','songs':'SNG','sg':'SNG','cant':'SNG','canticle of canticles':'SNG',
  'wisdom':'WIS','wis':'WIS',
  'sirach':'SIR','sir':'SIR','ecclesiasticus':'SIR',
  // Prophets
  'isaiah':'ISA','isa':'ISA','is':'ISA',
  'jeremiah':'JER','jer':'JER',
  'lamentations':'LAM','lam':'LAM',
  'baruch':'BAR','bar':'BAR',
  'ezekiel':'EZK','ezek':'EZK','ezk':'EZK',
  'daniel':'DAN','dan':'DAN',
  'hosea':'HOS','hos':'HOS',
  'joel':'JOL','jl':'JOL',
  'amos':'AMO','am':'AMO',
  'obadiah':'OBA','ob':'OBA',
  'jonah':'JON','jon':'JON',
  'micah':'MIC','mic':'MIC',
  'nahum':'NAM','nah':'NAM',
  'habakkuk':'HAB','hab':'HAB',
  'zephaniah':'ZEP','zeph':'ZEP',
  'haggai':'HAG','hag':'HAG',
  'zechariah':'ZEC','zech':'ZEC',
  'malachi':'MAL','mal':'MAL',
  // NT
  'matthew':'MAT','matt':'MAT','mt':'MAT',
  'mark':'MRK','mk':'MRK',
  'luke':'LUK','lk':'LUK',
  'john':'JHN','jn':'JHN',
  'acts':'ACT','act':'ACT',
  'romans':'ROM','rom':'ROM',
  '1 corinthians':'1CO','1corinthians':'1CO','1 cor':'1CO','1cor':'1CO',
  '2 corinthians':'2CO','2corinthians':'2CO','2 cor':'2CO','2cor':'2CO',
  'galatians':'GAL','gal':'GAL',
  'ephesians':'EPH','eph':'EPH',
  'philippians':'PHP','phil':'PHP','php':'PHP',
  'colossians':'COL','col':'COL',
  '1 thessalonians':'1TH','1thessalonians':'1TH','1 thess':'1TH','1thess':'1TH',
  '2 thessalonians':'2TH','2thessalonians':'2TH','2 thess':'2TH','2thess':'2TH',
  '1 timothy':'1TI','1timothy':'1TI','1 tim':'1TI','1tim':'1TI',
  '2 timothy':'2TI','2timothy':'2TI','2 tim':'2TI','2tim':'2TI',
  'titus':'TIT','tit':'TIT',
  'philemon':'PHM','phlm':'PHM',
  'hebrews':'HEB','heb':'HEB',
  'james':'JAS','jas':'JAS',
  '1 peter':'1PE','1peter':'1PE','1 pet':'1PE','1pet':'1PE',
  '2 peter':'2PE','2peter':'2PE','2 pet':'2PE','2pet':'2PE',
  '1 john':'1JN','1john':'1JN','1 jn':'1JN','1jn':'1JN',
  '2 john':'2JN','2john':'2JN','2 jn':'2JN','2jn':'2JN',
  '3 john':'3JN','3john':'3JN','3 jn':'3JN','3jn':'3JN',
  'jude':'JUD','jud':'JUD',
  'revelation':'REV','rev':'REV','apocalypse':'REV',
}

// Map a Hebrew (NABRE/lectionary) psalm number to Vulgate/Douay numbering.
// Returns [chapter, versePart] as strings.
function hebrewToVulgatePsalm(n, versePart) {
  const firstVerse = parseInt(versePart, 10) || 1
  if (n <= 8 || n >= 148) return [String(n), versePart]
  if (n === 9 || n === 10) return ['9', versePart]
  if (n === 114 || n === 115) return ['113', versePart]
  if (n === 116) {
    // Hebrew 116:1-9 = Vulgate 114; 116:10-19 = Vulgate 115:1-10
    if (firstVerse <= 9) return ['114', versePart]
    return ['115', versePart.replace(/\d+/g, v => String(Math.max(1, Number(v) - 9)))]
  }
  if (n === 147) {
    // Hebrew 147:1-11 = Vulgate 146; 147:12-20 = Vulgate 147:1-9
    if (firstVerse <= 11) return ['146', versePart]
    return ['147', versePart.replace(/\d+/g, v => String(Math.max(1, Number(v) - 11)))]
  }
  return [String(n - 1), versePart]   // 11–113, 117–146
}

// Convert "Acts 13:26-33" or "Psalm 2:6-7, 8-9" to OSIS passage ID
function referenceToOSIS(reference) {
  if (!reference) return null
  // Strip verse-letter suffixes like "14b" or "11ab" → "14" / "11"
  const clean = reference.replace(/(\d+)[a-z]+(?=[\s,\-:]|$)/gi, '$1').trim()

  // Match book + chapter:verses, e.g. "Acts 13:26-33" or "1 Corinthians 12:3b-7, 12-13"
  const m = clean.match(/^(.+?)\s+(\d+):(.+)$/)
  if (!m) return null

  const bookCode = BOOK_CODES[m[1].toLowerCase().trim()]
  if (!bookCode) return null

  let chapter = m[2]
  let versePart = m[3]

  // Lectionary references use Hebrew psalm numbers; the Douay-Rheims text
  // follows the Vulgate, which is one lower for most psalms. Without this
  // e.g. "Psalm 100" returned the text of Hebrew Psalm 101.
  if (bookCode === 'PSA') {
    ;[chapter, versePart] = hebrewToVulgatePsalm(Number(chapter), versePart)
  }

  // Cross-chapter range: "1:1-2:2" → versepart = "1-2:2"
  const crossChap = versePart.match(/^(\d+)-(\d+):(\d+)$/)
  if (crossChap) {
    return `${bookCode}.${chapter}.${crossChap[1]}-${bookCode}.${crossChap[2]}.${crossChap[3]}`
  }

  // Comma-separated sections: span from first verse to last verse
  const sections = versePart.split(',').map(s => s.trim())
  const firstVerse = sections[0].split('-')[0].trim()
  const lastSection = sections[sections.length - 1].split('-')
  const lastVerse = lastSection[lastSection.length - 1].trim()

  if (firstVerse === lastVerse && sections.length === 1 && !sections[0].includes('-')) {
    return `${bookCode}.${chapter}.${firstVerse}`
  }
  return `${bookCode}.${chapter}.${firstVerse}-${bookCode}.${chapter}.${lastVerse}`
}

// Fetch passage text from api.bible (Douay-Rheims)
async function fetchPassage(reference) {
  if (!reference || !API_BIBLE_KEY) return null
  const osisId = referenceToOSIS(reference)
  if (!osisId) return null

  try {
    const url = `https://rest.api.bible/v1/bibles/${DOUAY_RHEIMS_ID}/passages/${encodeURIComponent(osisId)}` +
      `?content-type=text&include-verse-numbers=false&include-titles=false&include-chapter-numbers=false`
    const res = await fetch(url, {
      headers: { 'api-key': API_BIBLE_KEY },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.data?.content?.trim() || null
  } catch {
    return null
  }
}

// ── World English Bible text (bible-api.com) ────────────────
// bible-api book names, keyed by our OSIS codes
const WEB_BOOKS = {
  GEN:'genesis', EXO:'exodus', LEV:'leviticus', NUM:'numbers', DEU:'deuteronomy',
  JOS:'joshua', JDG:'judges', RUT:'ruth', '1SA':'1 samuel', '2SA':'2 samuel',
  '1KI':'1 kings', '2KI':'2 kings', '1CH':'1 chronicles', '2CH':'2 chronicles',
  EZR:'ezra', NEH:'nehemiah', TOB:'tobit', JDT:'judith', EST:'esther',
  '1MA':'1 maccabees', '2MA':'2 maccabees', JOB:'job', PSA:'psalms', PRO:'proverbs',
  ECC:'ecclesiastes', SNG:'song of solomon', WIS:'wisdom', SIR:'sirach',
  ISA:'isaiah', JER:'jeremiah', LAM:'lamentations', BAR:'baruch', EZK:'ezekiel',
  DAN:'daniel', HOS:'hosea', JOL:'joel', AMO:'amos', OBA:'obadiah', JON:'jonah',
  MIC:'micah', NAM:'nahum', HAB:'habakkuk', ZEP:'zephaniah', HAG:'haggai',
  ZEC:'zechariah', MAL:'malachi', MAT:'matthew', MRK:'mark', LUK:'luke', JHN:'john',
  ACT:'acts', ROM:'romans', '1CO':'1 corinthians', '2CO':'2 corinthians',
  GAL:'galatians', EPH:'ephesians', PHP:'philippians', COL:'colossians',
  '1TH':'1 thessalonians', '2TH':'2 thessalonians', '1TI':'1 timothy', '2TI':'2 timothy',
  TIT:'titus', PHM:'philemon', HEB:'hebrews', JAS:'james', '1PE':'1 peter', '2PE':'2 peter',
  '1JN':'1 john', '2JN':'2 john', '3JN':'3 john', JUD:'jude', REV:'revelation',
}

// The lectionary counts a psalm's title as its first verse(s) (Hebrew
// numbering); English Bibles like the WEB don't. Verses to subtract, per
// psalm (unlisted = 0): the standard Hebrew-vs-English psalm table.
const PSALM_TITLE_VERSES = {
  51: 2, 52: 2, 54: 2, 60: 2,
  3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 12: 1, 13: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 30: 1,
  31: 1, 34: 1, 36: 1, 38: 1, 39: 1, 40: 1, 41: 1, 42: 1, 44: 1, 45: 1, 46: 1, 47: 1, 48: 1, 49: 1, 53: 1,
  55: 1, 56: 1, 57: 1, 58: 1, 59: 1, 61: 1, 62: 1, 63: 1, 64: 1, 65: 1, 67: 1, 68: 1, 69: 1, 70: 1, 75: 1,
  76: 1, 77: 1, 80: 1, 81: 1, 83: 1, 84: 1, 85: 1, 88: 1, 89: 1, 92: 1, 102: 1, 108: 1, 140: 1, 142: 1,
}

// Lectionary (NAB) chapter:verse → WEB chapter:verse where they differ.
// Returns [chapter, verse], or null to use the Douay-Rheims instead (its
// Daniel 3 and 13–14 already match the lectionary; the WEB splits them off).
function lectionaryToWEB(book, c, v, isEnd) {
  switch (book) {
    case 'PSA': return [c, Math.max(1, v - (PSALM_TITLE_VERSES[c] ?? 0))]
    case 'MAL': return c === 3 && v >= 19 ? [4, v - 18] : [c, v]
    case 'JOL': return c === 3 ? [2, v + 27] : c === 4 ? [3, v] : [c, v]
    case 'HOS':
      if (c === 2) return v <= 2 ? [1, v + 9] : [2, v - 2]
      if (c === 12) return v === 1 ? [11, 12] : [12, v - 1]
      if (c === 14) return v === 1 ? [13, 16] : [14, v - 1]
      return [c, v]
    case 'ISA':
      if (c === 8 && v === 23) return [9, 1]
      if (c === 9 || c === 64) return [c, v + 1]
      return [c, v]
    case 'MIC':
      if (c === 4 && v === 14) return [5, 1]
      return c === 5 ? [5, v + 1] : [c, v]
    case 'ZEC': return c === 2 ? (v <= 4 ? [1, v + 17] : [2, v - 4]) : [c, v]
    case 'EXO':
      if (c === 7 && v >= 26) return [8, v - 25]
      if (c === 8) return [8, v + 4]
      if (c === 21 && v === 37) return [22, 1]
      return c === 22 ? [22, v + 1] : [c, v]
    case '1KI': return c === 5 ? (v <= 14 ? [4, v + 20] : [5, v - 14]) : [c, v]
    case '2KI': return c === 12 ? (v === 1 ? [11, 21] : [12, v - 1]) : [c, v]
    case 'NUM': return c === 17 ? (v <= 15 ? [16, v + 35] : [17, v - 15]) : [c, v]
    case 'NEH':
      if (c === 3 && v >= 33) return [4, v - 32]
      return c === 4 ? [4, v + 6] : [c, v]
    case 'JOB':
      if (c === 40 && v >= 25) return [41, v - 24]
      return c === 41 ? [41, v + 8] : [c, v]
    case '2CO': // NAB 13:12 = WEB 13:12–13
      return c === 13 && (v >= 13 || (v === 12 && isEnd)) ? [13, v + 1] : [c, v]
    case 'DAN': return (c === 3 && v >= 24) || c >= 13 ? null : [c, v]
    default: return [c, v]
  }
}

// "1 Corinthians 12:3b-7, 12-13", "Isaiah 63:16b-17, 19b; 64:2-7",
// "Isaiah 52:13—53:12", "Matthew 26:14—27:66 or 27:11-54" → bible-api query
export function referenceToWEB(reference) {
  if (!reference) return null
  const ref = reference.split(/\s+or\s+/i)[0]           // the longer form
    .replace(/[‐-―]/g, '-')                    // dashes
    .replace(/\s+and\s+/gi, ', ')                        // "118:1 and 8-9"
    .replace(/(\d+)[a-z]+(?=[\s,;\-:]|$)/gi, '$1')       // 3b → 3
    .trim()
  // One-chapter books are cited without the chapter: "2 John 4-9"
  const single = ref.match(/^(obadiah|philemon|2 john|3 john|jude)\s+(\d[\d\s,-]*)$/i)
  const m = single ? [ref, single[1], `1:${single[2]}`] : ref.match(/^(.+?)\s+(\d+:.+)$/)
  if (!m) return null
  const book = BOOK_CODES[m[1].toLowerCase().trim()]
  if (!book || !WEB_BOOKS[book]) return null

  const parts = []
  let chapter = null
  for (const group of m[2].split(';')) {
    for (let piece of group.split(',')) {
      piece = piece.trim()
      if (!piece) continue
      const cm = piece.match(/^(\d+):(.+)$/)
      if (cm) { chapter = Number(cm[1]); piece = cm[2] }
      if (chapter == null) return null
      const [a, b] = piece.split('-').map(s => s.trim())
      const start = [chapter, Number(a)]
      let end = start
      if (b) {
        const em = b.match(/^(\d+):(\d+)$/)
        end = em ? [Number(em[1]), Number(em[2])] : [chapter, Number(b)]
        if (em) chapter = end[0]
      }
      if (![...start, ...end].every(Number.isFinite)) return null
      const s = lectionaryToWEB(book, start[0], start[1], false)
      const e = lectionaryToWEB(book, end[0], end[1], true)
      if (!s || !e) return null
      parts.push(s[0] === e[0] && s[1] === e[1] ? `${s[0]}:${s[1]}` : `${s[0]}:${s[1]}-${e[0] === s[0] ? '' : e[0] + ':'}${e[1]}`)
    }
  }
  return parts.length ? `${WEB_BOOKS[book]} ${parts.join(',')}` : null
}

// The WEB writes God's name as "Yahweh"; Catholic liturgy doesn't use it
// (CDW, 2008) and US texts say "the LORD" ("Lord GOD" for "Lord Yahweh")
export function withoutDivineName(text) {
  return text
    .replace(/\bLord Yahweh\b/g, 'Lord GOD')
    .replace(/\bO Yahweh\b/g, 'O LORD')
    .replace(/(^|[.!?]\s+|[“"‘(]\s*)Yahweh(?=,)/g, '$1LORD') // addressed: "LORD, hear my prayer"
    .replace(/(^|[.!?]\s+|[“"‘(]\s*)Yahweh\b/g, '$1The LORD')
    .replace(/(^|[.!?]\s+|[“"‘(]\s*)Yah\b/g, '$1The LORD')
    .replace(/\bYahweh\b/g, 'the LORD')
    .replace(/\bYah\b/g, 'the LORD')
}

async function fetchWEB(reference) {
  const query = referenceToWEB(reference)
  if (!query) return null
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(query)}?translation=web`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = (data.verses ?? []).map(v => v.text.replace(/\s+/g, ' ').trim()).join(' ').trim()
    return text ? withoutDivineName(text) : null
  } catch {
    return null
  }
}

// WEB first; the Douay-Rheims when the WEB can't serve the passage
async function fetchReading(reference) {
  return (await fetchWEB(reference)) ?? (await fetchPassage(reference))
}

// ── Liturgical colour → display values ──────────────────────
const COLOUR_MAP = {
  green:  { color: '#15803D', textColor: '#ffffff' },
  violet: { color: '#6B21A8', textColor: '#ffffff' },
  white:  { color: '#F5F0E8', textColor: '#1B2A4A' },
  red:    { color: '#DC2626', textColor: '#ffffff' },
  rose:   { color: '#DB2777', textColor: '#ffffff' },
}
// LitCal season code → our season key and label
const SEASONS = {
  ADVENT:         ['advent',    'Advent'],
  CHRISTMAS:      ['christmas', 'Christmas'],
  LENT:           ['lent',      'Lent'],
  EASTER_TRIDUUM: ['triduum',   'Easter Triduum'],
  EASTER:         ['easter',    'Easter'],
  ORDINARY_TIME:  ['ordinary',  'Ordinary Time'],
}

// The US calendar for a civil year from the Liturgical Calendar API
// (litcal.johnromanodorazio.com): US transfers (Epiphany and Ascension on
// Sunday) and US saints, which the general calendar used before got wrong.
// One request per year per warm instance.
const _calendars = new Map() // year → { at, days: Map('YYYY-MM-DD' → events) }
async function fetchUSCalendar(yyyy) {
  const cached = _calendars.get(yyyy)
  if (cached && Date.now() - cached.at < 12 * 3600_000) return cached.days
  try {
    const res = await fetch(`https://litcal.johnromanodorazio.com/api/v5/calendar/nation/US/${yyyy}?year_type=CIVIL`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const days = new Map()
    for (const e of (await res.json()).litcal ?? []) {
      if (e.is_vigil_mass) continue // the evening-before Mass, not the day
      const key = e.date.slice(0, 10)
      days.set(key, [...(days.get(key) ?? []), e])
    }
    _calendars.set(yyyy, { at: Date.now(), days })
    return days
  } catch {
    return null
  }
}

// The day's celebration: the highest-ranked event. Named on Sundays and for
// memorials and above; plain weekdays and optional memorials aren't.
export function describeDay(events) {
  if (!events?.length) return { liturgicalInfo: null, feastInfo: { isFeast: false, feastName: null } }
  const primary = events.reduce((a, b) => (b.grade > a.grade ? b : a))
  const [season, label] = SEASONS[primary.liturgical_season] ?? ['ordinary', 'Ordinary Time']
  const raw = primary.color?.[0] ?? 'green'
  const colour = raw === 'purple' ? 'violet' : raw
  const name = primary.name
    .replace(/^\[\s*\w+\s*\]\s*/, '')     // "[ US ] Saint …" → "Saint …"
    .replace(/,\s*Patronal feast.*$/i, '') // Dec 8: "…, Patronal feastday of the United States of America"
  const named = primary.grade >= 3 || primary.day_of_the_week_iso8601 === 7
  return {
    liturgicalInfo: { season, label, colour, ...(COLOUR_MAP[colour] ?? COLOUR_MAP.green) },
    feastInfo: named ? { isFeast: true, feastName: name } : { isFeast: false, feastName: null },
  }
}

// YYYYMMDD or YYYY-MM-DD for a date that exists (not 2026-13-99), within a
// sane range; returns the ISO form or null. Bad dates used to be passed on
// to the upstream sites before failing.
function parseDate(date) {
  let iso
  if (/^\d{8}$/.test(date ?? '')) iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
  else if (/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) iso = date
  else return null
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null
  const year = d.getUTCFullYear()
  return year >= 1900 && year <= 2200 ? iso : null
}

// ── Handler ────────────────────────────────────────────────
export default async function handler(req, res) {
  if (applyNativeCors(req, res, { publicData: true })) return
  const { date, lang, rite } = req.query

  // Route to sub-handlers based on query params
  if (lang === 'es') return handleSpanish(req, res)
  if (rite === 'tlm') return handleTLM(req, res)

  const isoDate = parseDate(date)
  if (!isoDate) return res.status(400).json({ success: false, error: 'Invalid date format' })

  const [yyyy, mm, dd] = isoDate.split('-')
  const cpbjrUrl = `https://cpbjr.github.io/catholic-readings-api/readings/${yyyy}/${mm}-${dd}.json`

  // Fetch references + the US calendar in parallel
  const [cpbjrRes, calendar] = await Promise.all([
    fetch(cpbjrUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
      .then(r => r.ok ? r.json() : null).catch(() => null),
    fetchUSCalendar(yyyy),
  ])
  const { liturgicalInfo, feastInfo } = describeDay(calendar?.get(isoDate))

  if (!cpbjrRes) {
    return res.status(200).json({ success: false, readings: null, liturgicalInfo, feastInfo })
  }

  const raw = cpbjrRes.readings ?? cpbjrRes

  function getRef(r) {
    if (!r) return null
    if (typeof r === 'string') return r
    return r.reference ?? r.ref ?? null
  }

  const refs = {
    firstReading:      getRef(raw.firstReading),
    psalm:             getRef(raw.psalm),
    secondReading:     getRef(raw.secondReading),
    gospelAcclamation: getRef(raw.gospelAcclamation),
    gospel:            getRef(raw.gospel),
  }

  // Fetch all texts in parallel
  const [firstText, psalmText, secondText, gospelText] = await Promise.all([
    fetchReading(refs.firstReading),
    fetchReading(refs.psalm),
    fetchReading(refs.secondReading),
    fetchReading(refs.gospel),
  ])

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600')
  return res.status(200).json({
    success: true,
    readings: {
      firstReading:      refs.firstReading      ? { reference: refs.firstReading,      text: firstText }  : null,
      psalm:             refs.psalm             ? { reference: refs.psalm,             text: psalmText }  : null,
      secondReading:     refs.secondReading     ? { reference: refs.secondReading,     text: secondText } : null,
      gospelAcclamation: refs.gospelAcclamation ? { reference: refs.gospelAcclamation, text: null }       : null,
      gospel:            refs.gospel            ? { reference: refs.gospel,            text: gospelText } : null,
    },
    liturgicalInfo,
    feastInfo,
    date: isoDate,
    usccbLink: cpbjrRes.usccbLink ?? `https://bible.usccb.org/bible/readings/${mm}${dd}${yyyy.slice(2)}.cfm`,
  })
}

// ── Spanish readings (Universalis) ─────────────────────────
async function handleSpanish(req, res) {
  const { date } = req.query
  if (!/^\d{8}$/.test(date ?? '') || !parseDate(date)) {
    return res.status(400).json({ success: false, error: 'Invalid date format, expected YYYYMMDD' })
  }
  try {
    const response = await fetch('https://universalis.com/es/' + date + '/mass.htm', {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return res.status(200).json({ success: false, html: null })
    const html = await response.text()
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600')
    return res.status(200).json({ success: true, html })
  } catch {
    return res.status(200).json({ success: false, html: null })
  }
}

// ── TLM readings (Missale Meum) ─────────────────────────────
async function handleTLM(req, res) {
  const { date } = req.query
  const isoDate = parseDate(date)
  if (!isoDate) return res.status(400).json({ success: false, error: 'Invalid date format' })
  try {
    const response = await fetch('https://www.missalemeum.com/en/api/v5/proper/' + isoDate, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return res.status(200).json({ success: false, readings: null })
    const data = await response.json()
    const observance = Array.isArray(data) ? data[0] : data
    if (!observance) return res.status(200).json({ success: false, readings: null })
    const sectionList = observance.sections ?? []
    const sections = {}
    for (const section of sectionList) { if (section.id) sections[section.id] = section }
    function extractText(section) {
      if (!section?.body) return null
      return section.body.map(pair => Array.isArray(pair) ? pair[0] : pair).filter(Boolean).join('\n\n').trim() || null
    }
    function extractSection(...ids) {
      for (const id of ids) { const s = sections[id]; if (s) return { reference: null, text: extractText(s) } }
      return null
    }
    const readings = {
      epistle: extractSection('Lectio', 'Epistola'),
      gradual: extractSection('GradualeP', 'Graduale', 'Tractus', 'Alleluia', 'Sequentia'),
      gospel:  extractSection('Evangelium'),
    }
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600')
    return res.status(200).json({
      success: true, readings,
      massName: observance.info?.title ?? null,
      liturgicalColor: observance.info?.colors?.[0] ?? null,
      sourceUrl: 'https://www.missalemeum.com/en/' + isoDate,
    })
  } catch {
    return res.status(200).json({ success: false, readings: null })
  }
}
