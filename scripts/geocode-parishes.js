// ============================================================
// COMMUNIO — Phase 13: Geocode Catholic Parishes
// Service: US Census Bureau Geocoder (free, no API key, batch endpoint)
// https://geocoding.geo.census.gov/geocoder/locations/addressbatch
//
// Usage: node scripts/geocode-parishes.js
// Prerequisites: scripts/data/catholic-parishes-filtered.json
//
// Features:
//   - Sends batches of 1,000 addresses to the Census batch geocoder
//   - Saves progress after every batch (safe to interrupt and resume)
//   - 2-second delay between batches to be respectful
//   - ~80–90% match rate expected
//
// Output: scripts/data/catholic-parishes-geocoded.json
// Runtime: ~30–45 minutes for 14,000 parishes
// ============================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { FormData, File } from 'formdata-node'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CENSUS_URL  = 'https://geocoding.geo.census.gov/geocoder/locations/addressbatch'
const BATCH_SIZE  = 1000   // Census accepts up to 10,000 but 1,000 is reliable
const DELAY_MS    = 2000   // 2 seconds between batches

async function geocodeBatch(parishes) {
  // Build CSV in Census geocoder format: ID, Street, City, State, ZIP
  const csvLines = parishes.map(p =>
    `${p._idx},"${(p.address || '').replace(/"/g, "'")}","${p.city || ''}","${p.state || ''}","${p.zip || ''}"`
  )
  const csvContent = csvLines.join('\n')

  const form = new FormData()
  form.set('addressFile', new File([csvContent], 'addresses.csv', { type: 'text/csv' }))
  form.set('benchmark', 'Public_AR_Current')

  let response
  try {
    response = await fetch(CENSUS_URL, {
      method: 'POST',
      body:   form,
      signal: AbortSignal.timeout(120000),  // 2-minute timeout per batch
    })
  } catch (err) {
    throw new Error(`Network error: ${err.message}`)
  }

  if (!response.ok) {
    throw new Error(`Census geocoder HTTP ${response.status}`)
  }

  const text = await response.text()

  // Parse response CSV
  // Format: ID, Input Address, Match, MatchType, OutputAddress, Coordinates, TigerLineID, Side
  const results = {}
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const parts = line.split(',')
    if (parts.length < 6) continue

    const id     = parts[0]?.trim()
    const match  = parts[2]?.trim()   // 'Match' | 'No_Match' | 'Tie'
    const coords = parts[5]?.trim()   // "lng,lat"

    if (match === 'Match' && coords && coords.includes(',')) {
      const [lng, lat] = coords.split(',').map(Number)
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        results[id] = { latitude: lat, longitude: lng }
      }
    }
  }

  return results
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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

  // Load progress (allows safe resume after interruption)
  let progress = {}
  if (fs.existsSync(progressPath)) {
    progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'))
    const alreadyDone = Object.keys(progress).length
    console.log(`Resuming — ${alreadyDone.toLocaleString()} already geocoded from previous run`)
  }

  // Assign internal index and apply previously geocoded coords
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
  const totalBatches = Math.ceil(toGeocode.length / BATCH_SIZE)
  let batchMatched = 0, batchFailed = 0

  for (let i = 0; i < toGeocode.length; i += BATCH_SIZE) {
    const batch     = toGeocode.slice(i, i + BATCH_SIZE)
    const batchNum  = Math.floor(i / BATCH_SIZE) + 1

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length} addresses)... `)

    try {
      const results = await geocodeBatch(batch)
      const matched = Object.keys(results).length

      // Apply geocoded coords to parishes and progress
      for (const p of batch) {
        const r = results[p._idx]
        if (r) {
          p.latitude  = r.latitude
          p.longitude = r.longitude
          progress[p._idx] = r
        }
      }

      batchMatched += matched
      batchFailed  += (batch.length - matched)
      process.stdout.write(`${matched}/${batch.length} matched\n`)

      // Save progress after every batch
      fs.writeFileSync(progressPath, JSON.stringify(progress))

    } catch (err) {
      process.stdout.write(`ERROR: ${err.message}\n`)
      console.log('  Saving progress and waiting 15 seconds before next batch...')
      fs.writeFileSync(progressPath, JSON.stringify(progress))
      await sleep(15000)
      continue
    }

    if (i + BATCH_SIZE < toGeocode.length) {
      await sleep(DELAY_MS)
    }
  }

  // Apply remaining progress to the full parish list
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
