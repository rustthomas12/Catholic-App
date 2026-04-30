// ============================================================
// COMMUNIO — Phase 13: Filter Catholic Parishes from IRS EO BMF
// Source: IRS Exempt Organizations Business Master File (EO BMF)
//         https://www.irs.gov/pub/irs-soi/eo1.csv (etc.)
//
// Usage: node scripts/filter-catholic-parishes.js
// Prerequisites:
//   - scripts/data/irs-bmf/eo1.csv  (Northeast)
//   - scripts/data/irs-bmf/eo2.csv  (Mid-Atlantic / Great Lakes)
//   - scripts/data/irs-bmf/eo3.csv  (South / West / Pacific)
//
//   Download commands:
//   mkdir -p scripts/data/irs-bmf
//   curl -o scripts/data/irs-bmf/eo1.csv https://www.irs.gov/pub/irs-soi/eo1.csv
//   curl -o scripts/data/irs-bmf/eo2.csv https://www.irs.gov/pub/irs-soi/eo2.csv
//   curl -o scripts/data/irs-bmf/eo3.csv https://www.irs.gov/pub/irs-soi/eo3.csv
//
// Output: scripts/data/catholic-parishes-filtered.json
// Expected: 12,000–17,000 Catholic parishes
// ============================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── NTEE codes for Catholic organizations ─────────────────
// X21 = Roman Catholic — the most specific code for Catholic parishes
// X22 = Jewish — included accidentally in some IRS datasets; excluded here
// We use X21 as the primary signal and name patterns as secondary
const CATHOLIC_NTEE = new Set(['X21'])

// ── Name patterns indicating a Catholic parish ────────────
// Order: more specific first. Any match = likely Catholic parish.
// Name pattern fallback — ONLY for orgs that lack the X21 NTEE code.
// Intentionally conservative: "Saint/St [name]" is shared by many non-Catholic
// denominations, so we require the word "Catholic" to appear OR use only
// patterns that are uniquely Catholic (Marian titles, sacramental names).
const CATHOLIC_PATTERNS = [
  /\bcatholic\s+church\b/i,
  /\bcatholic\s+parish\b/i,
  /\broman\s+catholic\b/i,
  /\bro\.?\s*cath\.?\b/i,         // "Ro Cath" IRS abbreviation
  /\bour\s+lady\s+of\b/i,         // Marian — uniquely Catholic
  /\bimmaculate\s+conception\b/i,
  /\bimmaculate\s+heart\b/i,
  /\bblessed\s+sacrament\b/i,
  /\bblessed\s+virgin\b/i,
  /\bcorpus\s+christi\b/i,
  /\bsacred\s+heart\b/i,
  /\bassumption\s+of\b/i,
  /\bannunciation\s+(church|parish|of)\b/i,
  /\bnativity\s+(of|church|parish)\b/i,
  /\bpresentation\s+of\b/i,
  /\bholy\s+rosary\b/i,
  /\bholy\s+redeemer\b/i,
]

// ── Name patterns indicating NON-parish organizations ─────
// These are Catholic but not parishes — skip them.
const EXCLUSION_PATTERNS = [
  /\bschool\b/i,
  /\bacadem/i,
  /\bcolleg/i,
  /\buniversit/i,
  /\bseminar/i,
  /\bhigh\s+school\b/i,
  /\belementar/i,
  /\bpreschool\b/i,
  /\bkindergarten\b/i,
  /\bhospital\b/i,
  /\bmedical\s+center\b/i,
  /\bhealth\s+system\b/i,
  /\bclinic\b/i,
  /\bcemetery\b/i,
  /\bmausoleum\b/i,
  /\bfuneral\b/i,
  /\bcharities\b/i,
  /\bcharitable\b/i,
  /\bfoundation\b/i,
  /\bcouncil\b/i,           // Knights of Columbus councils
  /\bknights\s+of\b/i,
  /\bdaughters\s+of\b/i,
  /\blegion\s+of\b/i,
  /\bsociety\s+of\b/i,      // Jesuits, etc. — religious orders, not parishes
  /\border\s+of\b/i,
  /\bmonastery\b/i,
  /\bconvent\b/i,
  /\babbey\b/i,
  /\bfriary\b/i,
  /\bshrines?\b/i,          // usually not a parish
  /\bmedia\b/i,
  /\bpublishing\b/i,
  /\bbroadcasting\b/i,
  /\btelevision\b/i,
  /\bradio\s+station\b/i,
  /\bnewspaper\b/i,
  /\bprint\b/i,
  /\bcredit\s+union\b/i,
  /\binsurance\b/i,
  /\binvestment\b/i,
  /\bretirement\b/i,
  /\bsenior\s+living\b/i,
  /\bnursing\s+home\b/i,
  /\bassisted\s+living\b/i,
  /\borphanage\b/i,
  /\bsoup\s+kitchen\b/i,    // usually a ministry org, not a parish
  /\bfood\s+bank\b/i,
  /\bcamp\b/i,
  /\bcentral\s+office\b/i,
  /\bdiocese\s+of\b/i,      // diocesan offices, not parishes
  /\barchdiocese\b/i,
  /\bcatholic\s+conference\b/i,
  /\bcatholic\s+league\b/i,
  /\bnewman\b/i,            // Newman Centers (campus ministry, not a parish)
  /\bcampus\s+ministry\b/i,
  /\bchaplainc/i,           // chaplaincies
  /\bmilitary\b/i,
  /\bprison\b/i,
  /\bjail\b/i,
  /\bcorrectional\b/i,
  /\bretreat\b/i,
  /\bspirituality\s+center\b/i,
  /\brenewal\s+center\b/i,
  /\bcatholic\s+worker\b/i,
  /\bapostolate\b/i,        // lay apostolates
  /\bguild\b/i,
  /\bcircle\b/i,
  /\bclub\b/i,
  /\bassociation\b/i,
  /\balliance\b/i,
  /\bministry\b/i,
  /\boutreach\b/i,
  /\bmission\s+house\b/i,
  /\bhouse\s+of\b/i,        // "House of Prayer" etc.
  /\bservice\s+center\b/i,
  /\bcommunity\s+center\b/i,
  /\bcare\s+center\b/i,
  /\bcatholic\s+center\b/i,
  /\bbishop\b/i,
  // Non-Catholic denominations miscoded X21 in IRS data (common with Spanish-language churches)
  /\bpentecostal\b/i,
  /\bbaptist\b/i,
  /\bevangelical\b/i,
  /\bevangelico\b/i,
  /\bpresbyteri/i,
  /\bmethodist\b/i,
  /\bapostolico\b/i,    // Apostolic = Pentecostal in Spanish-language context
  /\bministerio\b/i,    // "Ministerio" = non-parish ministry org
  /\bseventh.day\b/i,
  /\badventist\b/i,
  /\blatter.day\b/i,
  /\blds\b/i,
  /\bchurch\s+of\s+christ\b/i,
  /\bchurch\s+of\s+god\b/i,
  /\bassembli/i,        // Assemblies of God
  /\bfullness\b/i,
  /\bfellowship\b/i,    // common in evangelical church names
  /\btabernacle\b/i,    // common in Pentecostal names
]

// Name patterns that indicate a parish-type entity (used to validate X21 orgs)
// For X21 orgs: must look like a physical church, not a lay/ministry org
// Intentionally excludes generic Saint/St prefix — too many non-parish
// Catholic organizations (lay associations, campus ministries, etc.) use those
const PARISH_NAME_PATTERNS = [
  /\bchurch\b/i,
  /\bparish\b/i,
  /\bchapel\b/i,
  /\bcathedral\b/i,
  /\bbasilica\b/i,
  /\bparroquia\b/i,    // Spanish: parish
  /\biglesia\s+cat[oó]lica\b/i,  // Spanish: Catholic church
  /\bcatolica\b/i,
  /\bour\s+lady\b/i,
  /\bimmaculate\b/i,
  /\bblessed\s+sacrament\b/i,
  /\bblessed\s+virgin\b/i,
  /\bcorpus\s+christi\b/i,
  /\bsacred\s+heart\b/i,
  /\bassumption\b/i,
  /\bannunciation\b/i,
  /\bnativity\b/i,
  /\bholy\s+rosary\b/i,
  /\bholy\s+redeemer\b/i,
]

function isCatholicParish(record) {
  const name   = (record.NAME   || '').trim()
  const ntee   = (record.NTEE_CD || '').trim().toUpperCase()
  const status = (record.STATUS  || '').trim()
  const street = (record.STREET  || '').trim()

  // Only active unconditional exemptions
  if (status !== '01') return false

  // Must have name and street address (PO Box only = not a physical parish)
  if (!name || !street) return false

  // Skip PO Box-only addresses
  if (/^p\.?\s*o\.?\s*box\s+\d+$/i.test(street)) return false

  // Apply exclusion patterns first
  if (EXCLUSION_PATTERNS.some(p => p.test(name))) return false

  // X21 NTEE code = Roman Catholic, BUT X21 covers all Catholic orgs (dioceses,
  // lay groups, ministries, etc.) — require the name to also look like a parish.
  if (CATHOLIC_NTEE.has(ntee)) {
    return PARISH_NAME_PATTERNS.some(p => p.test(name))
  }

  // Fallback: no X21 code — require explicit Catholic name signals
  return CATHOLIC_PATTERNS.some(p => p.test(name))
}

function normalizeRecord(record) {
  // Clean EIN — IRS sometimes formats as XX-XXXXXXX
  const ein = (record.EIN || '').replace(/[^0-9]/g, '').trim()

  // Normalize zip — keep only digits and hyphen, max 10 chars
  const zip = (record.ZIP || '').replace(/[^0-9-]/g, '').slice(0, 10).trim()

  return {
    irs_ein:      ein || null,
    name:         (record.NAME   || '').trim(),
    address:      (record.STREET || '').trim() || null,
    city:         (record.CITY   || '').trim() || null,
    state:        (record.STATE  || '').trim().toUpperCase() || null,
    zip:          zip || null,
    country:      'US',
    latitude:     null,   // filled in by geocode-parishes.js
    longitude:    null,
    diocese:      null,   // filled in by assign-dioceses-from-zip.js
    is_official:  false,
    data_source:  'irs_bmf',
    data_quality: 1,      // updated to 2 after successful geocoding
  }
}

async function main() {
  const dataDir  = path.join(__dirname, 'data', 'irs-bmf')
  const outDir   = path.join(__dirname, 'data')
  const files    = ['eo1.csv', 'eo2.csv', 'eo3.csv']
  // eo4.csv = international + territories — skipped

  // Verify files exist
  for (const filename of files) {
    const fp = path.join(dataDir, filename)
    if (!fs.existsSync(fp)) {
      console.error(`\n❌ Missing: ${fp}`)
      console.error(`   Download with:\n   curl -o ${fp} https://www.irs.gov/pub/irs-soi/${filename}`)
      process.exit(1)
    }
  }

  const allParishes = []
  let totalRecords = 0

  for (const filename of files) {
    const filepath = path.join(dataDir, filename)
    console.log(`\nProcessing ${filename}...`)

    const content = fs.readFileSync(filepath, 'utf8')
    const records = parse(content, {
      columns:           true,
      skip_empty_lines:  true,
      trim:              true,
      relax_column_count: true,  // IRS CSVs can have inconsistent column counts
    })

    console.log(`  Records in file:        ${records.length.toLocaleString()}`)
    totalRecords += records.length

    const parishes = records.filter(isCatholicParish).map(normalizeRecord)
    console.log(`  Catholic parishes found: ${parishes.length.toLocaleString()}`)
    allParishes.push(...parishes)
  }

  // Deduplicate by EIN
  const seenEINs = new Set()
  let dupeCount = 0
  const deduped = allParishes.filter(p => {
    if (!p.irs_ein) return true   // keep records with no EIN (edge case)
    if (seenEINs.has(p.irs_ein)) { dupeCount++; return false }
    seenEINs.add(p.irs_ein)
    return true
  })

  // Exclude MA parishes — already seeded from MassGIS (higher quality data)
  const maParishes  = deduped.filter(p => p.state === 'MA')
  const nonMA       = deduped.filter(p => p.state !== 'MA')

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Total IRS records processed:  ${totalRecords.toLocaleString()}`)
  console.log(`Catholic parishes found:      ${allParishes.length.toLocaleString()}`)
  console.log(`After deduplication:          ${deduped.length.toLocaleString()}`)
  console.log(`Duplicate EINs removed:       ${dupeCount}`)
  console.log(`MA parishes excluded:         ${maParishes.length} (use MassGIS data instead)`)
  console.log(`Final parishes to geocode:    ${nonMA.length.toLocaleString()}`)

  // State breakdown
  const byState = {}
  nonMA.forEach(p => { byState[p.state] = (byState[p.state] || 0) + 1 })
  const topStates = Object.entries(byState).sort((a, b) => b[1] - a[1]).slice(0, 10)
  console.log(`\nTop 10 states:`)
  topStates.forEach(([state, count]) => console.log(`  ${state}: ${count.toLocaleString()}`))

  const outputPath = path.join(outDir, 'catholic-parishes-filtered.json')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(nonMA, null, 2))
  console.log(`\n✅ Output: ${outputPath}`)
  console.log(`   Next step: node scripts/geocode-parishes.js`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
