// ============================================================
// COMMUNIO — Phase 13: Geocode Catholic Parishes
// Service: US Census Bureau Geocoder (free, no API key)
// https://geocoding.geo.census.gov/geocoder/locations/address
//
// Uses the single-address endpoint with 10 concurrent requests.
// The batch endpoint is unreliable; single-address is stable.
//
// Usage: node scripts/geocode-parishes.js
// Prerequisites: scripts/data/catholic-parishes-filtered.json
//
// Features:
//   - 10 concurrent requests (well within Census rate limits)
//   - Saves progress every 100 geocoded (safe to interrupt and resume)
//   - ~80–90% match rate expected
//
// Output: scripts/data/catholic-parishes-geocoded.json
// Runtime: ~15–25 minutes for 13,000 parishes
// ============================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CENSUS_URL   = 'https://geocoding.geo.census.gov/geocoder/locations/address'
const CONCURRENCY  = 10   // parallel requests at a time
const SAVE_EVERY   = 200  // save progress every N geocoded
const DELAY_MS     = 50   // ms between launching each request in a batch

async function geocodeOne(parish) {
  const params = new URLSearchParams({
    street:    parish.address || '',
    city:      parish.city    || '',
    state:     parish.state   || '',
    zip:       parish.zip     || '',
    benchmark: 'Public_AR_Current',
    format:    'json',
  })

  try {
    const res = await fetch(`${CENSUS_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null

    const json = await res.json()
    const match = json?.result?.addressMatches?.[0]
    if (!match) return null

    const { x: lng, y: lat } = match.coordinates
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null
    return { latitude: lat, longitude: lng }
  } catch {
    return null
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runConcurrent(items, fn, concurrency, onProgress) {
  const results = new Array(items.length).fill(null)
  let idx = 0
  let done = 0

  async function worker() {
    while (idx < items.length) {
      const i = idx++
      results[i] = await fn(items[i])
      done++
      if (onProgress) onProgress(done, items.length)
    }
  }

  const workers = []
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    await sleep(DELAY_MS * i)  // stagger launches slightly
    workers.push(worker())
  }
  await Promise.all(workers)
  return results
}

async function main() {
  const dataDir      = path.join(__dirname, 'data')
  const inputPath    = path.join(dataDir, 'catholic-parishes-filtered.json')
  const outputPath   = path.join(dataDir, 'catholic-parishes-geocoded.json')
  const progressPath = path.join(dataDir, 'geocoding-progress.json')

  if (!fs.existsSync(inputPath)) {
    console.error('❌ Missing input file. Run: node scripts/filter-catholic-parishes.js')
    process.exit(1)
  }

  const parishes = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  console.log(`\nParishes to geocode: ${parishes.length.toLocaleString()}`)

  // Load previous progress
  let progress = {}
  if (fs.existsSync(progressPath)) {
    progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'))
    console.log(`Resuming — ${Object.keys(progress).length.toLocaleString()} already geocoded`)
  }

  // Assign index, apply known coords, collect remaining
  const toGeocode = []
  parishes.forEach((p, i) => {
    p._idx = i
    if (progress[i]) {
      p.latitude  = progress[i].latitude
      p.longitude = progress[i].longitude
    } else if (!p.latitude || !p.longitude) {
      toGeocode.push(p)
    }
  })

  console.log(`Remaining to geocode: ${toGeocode.length.toLocaleString()}`)
  console.log(`Running ${CONCURRENCY} concurrent requests...\n`)

  let matched = 0
  let processed = 0
  const startTime = Date.now()

  // Print progress every 100
  function logProgress(done, total) {
    processed = done
    if (done % 100 === 0 || done === total) {
      const pct      = Math.round(done / total * 100)
      const elapsed  = Math.round((Date.now() - startTime) / 1000)
      const rate     = done / (elapsed || 1)
      const remaining = Math.round((total - done) / rate)
      process.stdout.write(
        `\r  ${done.toLocaleString()}/${total.toLocaleString()} (${pct}%) — ${matched} matched — ~${remaining}s remaining  `
      )

      // Save progress periodically
      if (done % SAVE_EVERY === 0) {
        fs.writeFileSync(progressPath, JSON.stringify(progress))
      }
    }
  }

  const results = await runConcurrent(toGeocode, async (p) => {
    const r = await geocodeOne(p)
    if (r) {
      p.latitude  = r.latitude
      p.longitude = r.longitude
      progress[p._idx] = r
      matched++
    }
    return r
  }, CONCURRENCY, logProgress)

  process.stdout.write('\n')

  // Save final progress
  fs.writeFileSync(progressPath, JSON.stringify(progress))

  // Apply remaining progress to full parish list
  parishes.forEach(p => {
    if (progress[p._idx] && !p.latitude) {
      p.latitude  = progress[p._idx].latitude
      p.longitude = progress[p._idx].longitude
    }
    delete p._idx
  })

  const withCoords    = parishes.filter(p => p.latitude && p.longitude).length
  const withoutCoords = parishes.length - withCoords
  const matchRate     = Math.round(withCoords / parishes.length * 100)

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Geocoded successfully:  ${withCoords.toLocaleString()}`)
  console.log(`No match (kept):        ${withoutCoords.toLocaleString()}`)
  console.log(`Match rate:             ${matchRate}%`)
  console.log(`(Parishes without coords still import — just won't appear on map/Near me)`)

  fs.writeFileSync(outputPath, JSON.stringify(parishes, null, 2))
  console.log(`\n✅ Output: ${outputPath}`)
  console.log(`   Next step: node scripts/assign-dioceses-from-zip.js`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
