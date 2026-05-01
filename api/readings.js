/**
 * Vercel serverless function — Catholic Readings API proxy.
 * References:  https://cpbjr.github.io/catholic-readings-api/
 * Bible text:  https://rest.api.bible/ — Douay-Rheims 1899 (Catholic, full deuterocanon)
 * Liturgical:  http://calapi.inadiutorium.cz/ — Church Calendar API
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

// Convert "Acts 13:26-33" or "Psalm 2:6-7, 8-9" to OSIS passage ID
function referenceToOSIS(reference) {
  if (!reference) return null
  // Strip verse-letter suffixes like "14b" → "14"
  const clean = reference.replace(/(\d+)[a-z](?=[\s,\-:]|$)/gi, '$1').trim()

  // Match book + chapter:verses, e.g. "Acts 13:26-33" or "1 Corinthians 12:3b-7, 12-13"
  const m = clean.match(/^(.+?)\s+(\d+):(.+)$/)
  if (!m) return null

  const bookCode = BOOK_CODES[m[1].toLowerCase().trim()]
  if (!bookCode) return null

  const chapter = m[2]
  const versePart = m[3]

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

// ── Liturgical colour → display values ──────────────────────
const COLOUR_MAP = {
  green:  { color: '#15803D', textColor: '#ffffff' },
  violet: { color: '#6B21A8', textColor: '#ffffff' },
  white:  { color: '#F5F0E8', textColor: '#1B2A4A' },
  red:    { color: '#DC2626', textColor: '#ffffff' },
  rose:   { color: '#DB2777', textColor: '#ffffff' },
}
const SEASON_LABEL = {
  ordinary: 'Ordinary Time', advent: 'Advent',
  christmas: 'Christmas',    lent: 'Lent', easter: 'Easter',
}

async function fetchLiturgicalDay(yyyy, mm, dd) {
  const url = `http://calapi.inadiutorium.cz/api/v0/en/calendars/general-en/${yyyy}/${parseInt(mm)}/${parseInt(dd)}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ── Handler ────────────────────────────────────────────────
export default async function handler(req, res) {
  const { date } = req.query

  let isoDate
  if (/^\d{8}$/.test(date)) {
    isoDate = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    isoDate = date
  } else {
    return res.status(400).json({ success: false, error: 'Invalid date format' })
  }

  const [yyyy, mm, dd] = isoDate.split('-')
  const cpbjrUrl = `https://cpbjr.github.io/catholic-readings-api/readings/${yyyy}/${mm}-${dd}.json`

  // Fetch references + liturgical day in parallel
  const [cpbjrRes, litDay] = await Promise.all([
    fetch(cpbjrUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
      .then(r => r.ok ? r.json() : null).catch(() => null),
    fetchLiturgicalDay(yyyy, mm, dd),
  ])

  // Build liturgical info
  let liturgicalInfo = null
  let feastInfo = { isFeast: false, feastName: null }
  if (litDay) {
    const primary = litDay.celebrations?.[0] ?? null
    const colour = primary?.colour ?? 'green'
    liturgicalInfo = {
      season: litDay.season,
      label:  SEASON_LABEL[litDay.season] ?? litDay.season,
      weekNum: litDay.season_week,
      colour,
      ...(COLOUR_MAP[colour] ?? COLOUR_MAP.green),
    }
    if (primary?.title && primary.rank !== 'ferial') {
      feastInfo = { isFeast: true, feastName: primary.title }
    }
  }

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
    fetchPassage(refs.firstReading),
    fetchPassage(refs.psalm),
    fetchPassage(refs.secondReading),
    fetchPassage(refs.gospel),
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
