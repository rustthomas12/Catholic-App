// ============================================================
// COMMUNIO — Phase 13: Seed National Parish Data
// Source: IRS EO BMF (filtered → geocoded → diocese-assigned)
//
// Usage: node scripts/seed-national-parishes.js
// Prerequisites:
//   - Run filter-catholic-parishes.js
//   - Run geocode-parishes.js
//   - Run assign-dioceses-from-zip.js
//   - scripts/data/catholic-parishes-ready.json must exist
//
// Features:
//   - Upserts on IRS EIN (safe to re-run)
//   - Skips MA parishes (already seeded from MassGIS)
//   - Batches of 100 with progress logging every 10 batches
//   - Verifies MA parish count is intact after import
//
// Expected: ~12,000–17,000 new non-MA parishes
// ============================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Supabase setup ──────────────────────────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error('❌ Missing VITE_SUPABASE_URL in environment')
  process.exit(1)
}
if (!supabaseKey || supabaseKey.includes('placeholder')) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const BATCH_SIZE = 100

async function main() {
  const inputPath = path.join(__dirname, 'data', 'catholic-parishes-ready.json')

  if (!fs.existsSync(inputPath)) {
    console.error('❌ Missing input file. Run: node scripts/assign-dioceses-from-zip.js')
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  console.log(`\n🕊️  Communio National Parish Seeder`)
  console.log(`   Input file: ${raw.length.toLocaleString()} total parishes`)

  // Safety check — verify MA parishes are NOT in the import file
  // (filter-catholic-parishes.js excludes MA, but double-check)
  const maInFile = raw.filter(p => p.state === 'MA')
  if (maInFile.length > 0) {
    console.warn(`\n⚠️  Warning: ${maInFile.length} MA parishes found in input — excluding them.`)
    console.warn(`   (MA parishes should come from MassGIS seed, not IRS BMF)`)
  }

  const parishes = raw.filter(p => p.state !== 'MA')
  console.log(`   Non-MA parishes to import: ${parishes.length.toLocaleString()}`)

  // Verify existing MA parish count is intact
  const { count: maCount, error: maError } = await supabase
    .from('parishes')
    .select('id', { count: 'exact', head: true })
    .eq('state', 'MA')

  if (maError) {
    console.error(`❌ Could not verify MA parishes: ${maError.message}`)
    process.exit(1)
  }

  console.log(`\n   Existing MA parishes in DB: ${maCount}`)
  if (maCount < 400) {
    console.error(`❌ Expected ~559 MA parishes in DB, found only ${maCount}.`)
    console.error(`   Run scripts/seed-parishes.js first to seed MA data.`)
    process.exit(1)
  }
  console.log(`   ✓ MA parishes verified (${maCount} intact)\n`)

  // Map to parishes table schema
  const rows = parishes.map(p => ({
    name:         p.name,
    address:      p.address     || null,
    city:         p.city        || null,
    state:        p.state       || null,
    zip:          p.zip         || null,
    country:      p.country     || 'US',
    latitude:     p.latitude    || null,
    longitude:    p.longitude   || null,
    diocese:      p.diocese     || null,
    phone:        null,
    website:      null,
    email:        null,
    is_official:  false,
    mass_times:   null,
    irs_ein:      p.irs_ein     || null,
    data_source:  'irs_bmf',
    data_quality: (p.latitude && p.longitude) ? 2 : 1,
  }))

  // ── Batch upsert ──────────────────────────────────────────
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE)
  let inserted = 0, updated = 0, errors = 0

  console.log(`   Starting upsert — ${totalBatches} batches of ${BATCH_SIZE}...`)

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch    = rows.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1

    const { error } = await supabase
      .from('parishes')
      .upsert(batch, {
        onConflict:        'irs_ein',
        ignoreDuplicates:  false,   // update existing records on conflict
      })

    if (error) {
      console.error(`  ❌ Batch ${batchNum}/${totalBatches}: ${error.message}`)
      errors += batch.length
    } else {
      inserted += batch.length
    }

    // Progress every 10 batches
    if (batchNum % 10 === 0 || batchNum === totalBatches) {
      const pct = Math.round(batchNum / totalBatches * 100)
      console.log(`  Batch ${batchNum}/${totalBatches} (${pct}%) — ${inserted.toLocaleString()} processed, ${errors} errors`)
    }
  }

  // ── Final verification ────────────────────────────────────
  const { count: totalCount } = await supabase
    .from('parishes')
    .select('id', { count: 'exact', head: true })

  const { count: irsCount } = await supabase
    .from('parishes')
    .select('id', { count: 'exact', head: true })
    .eq('data_source', 'irs_bmf')

  const { count: geocodedCount } = await supabase
    .from('parishes')
    .select('id', { count: 'exact', head: true })
    .eq('data_source', 'irs_bmf')
    .eq('data_quality', 2)

  const { count: maFinal } = await supabase
    .from('parishes')
    .select('id', { count: 'exact', head: true })
    .eq('state', 'MA')

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ Import complete!`)
  console.log(``)
  console.log(`   Parishes processed:  ${inserted.toLocaleString()}`)
  console.log(`   Errors:              ${errors}`)
  console.log(``)
  console.log(`   Total in DB:         ${totalCount?.toLocaleString() ?? '?'}`)
  console.log(`   IRS BMF parishes:    ${irsCount?.toLocaleString() ?? '?'}`)
  console.log(`   Geocoded (quality 2): ${geocodedCount?.toLocaleString() ?? '?'}`)
  console.log(`   MA parishes (MassGIS): ${maFinal ?? '?'} ${maFinal >= 400 ? '✓' : '⚠️ check MA seed'}`)

  if (errors > 0) {
    console.log(`\n⚠️  ${errors} records had errors. Check that migration 021 has been applied.`)
    console.log(`   Required columns: irs_ein, data_source, data_quality`)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
