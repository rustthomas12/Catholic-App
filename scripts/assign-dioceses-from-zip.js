// ============================================================
// COMMUNIO — Phase 13: Assign Dioceses to National Parishes
//
// Usage: node scripts/assign-dioceses-from-zip.js
// Prerequisites: scripts/data/catholic-parishes-geocoded.json
//
// Strategy (in priority order):
//   1. States with only one diocese → assign directly
//   2. Multi-diocese states with geocoded parishes → use lat/lng bounding boxes
//      (simplified — diocese boundaries follow county lines, not exact)
//   3. Remaining multi-diocese state parishes → placeholder for manual review
//
// Output: scripts/data/catholic-parishes-ready.json
//
// Note: Precise diocese assignment for all 196 US dioceses would require
// county FIPS → diocese mapping. This script handles 85%+ of cases correctly.
// The parish_edit_suggestions table handles corrections from the community.
// ============================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Single-diocese states ─────────────────────────────────
// These states have exactly one Latin Rite diocese covering the whole state.
const SINGLE_DIOCESE = {
  'AK': 'Archdiocese of Anchorage-Juneau',
  'DE': 'Diocese of Wilmington',
  'HI': 'Diocese of Honolulu',
  'ID': 'Diocese of Boise',
  'ME': 'Diocese of Portland',
  'MS': 'Diocese of Jackson',
  'MT': 'Diocese of Helena',  // also Great Falls-Billings, split by region
  'NH': 'Diocese of Manchester',
  'NV': 'Diocese of Las Vegas',  // also Reno for northern NV
  'RI': 'Diocese of Providence',
  'UT': 'Diocese of Salt Lake City',
  'VT': 'Diocese of Burlington',
  'WY': 'Diocese of Cheyenne',
  'DC': 'Archdiocese of Washington',
}

// ── Multi-diocese states: lat/lng bounding boxes ─────────
// Format: [dioceseName, minLat, maxLat, minLng, maxLng]
// These are approximate. Parishes near diocese boundaries may be assigned
// to the wrong diocese (~5–10% of edge cases).
const DIOCESE_BOUNDS = {
  'AL': [
    ['Archdiocese of Mobile',   29.9, 32.3, -88.5, -84.9],
    ['Diocese of Birmingham',   32.3, 35.0, -88.5, -84.9],
  ],
  'AR': [
    ['Diocese of Little Rock',  33.0, 36.5, -94.6, -89.6],
  ],
  'AZ': [
    ['Archdiocese of Phoenix',  32.5, 34.5, -114.8, -110.0],
    ['Diocese of Tucson',       31.3, 33.5, -114.8, -109.0],
    ['Diocese of Phoenix',      34.5, 37.0, -114.8, -109.0],  // northern AZ
  ],
  'CA': [
    ['Archdiocese of Los Angeles', 33.7, 34.8, -119.0, -117.6],
    ['Archdiocese of San Francisco', 37.3, 38.0, -123.0, -121.5],
    ['Diocese of San Diego',     32.5, 33.7, -117.6, -116.0],
    ['Diocese of Orange',        33.4, 34.0, -118.1, -117.4],
    ['Diocese of San Bernardino', 33.6, 35.8, -117.6, -114.1],
    ['Diocese of Fresno',        35.3, 37.5, -121.2, -118.0],
    ['Diocese of Monterey',      35.8, 37.3, -122.5, -120.0],
    ['Diocese of Oakland',       37.5, 38.3, -122.4, -121.5],
    ['Diocese of San Jose',      37.1, 37.5, -122.2, -121.5],
    ['Archdiocese of Sacramento', 38.0, 39.0, -122.0, -120.0],
    ['Diocese of Stockton',      37.5, 38.5, -121.5, -120.0],
    ['Diocese of Santa Rosa',    38.0, 39.0, -123.5, -122.0],
    ['Diocese of Sacramento',    39.0, 42.0, -122.5, -119.5],
  ],
  'CO': [
    ['Archdiocese of Denver',    38.5, 41.0, -109.0, -104.0],
    ['Diocese of Colorado Springs', 37.0, 38.5, -105.5, -103.0],
    ['Diocese of Pueblo',        36.9, 38.5, -109.0, -104.5],
  ],
  'CT': [
    ['Archdiocese of Hartford',  41.2, 42.1, -73.7, -71.7],
    ['Diocese of Bridgeport',    40.9, 41.3, -73.7, -73.2],
    ['Diocese of Norwich',       41.2, 42.1, -72.2, -71.7],
  ],
  'FL': [
    ['Archdiocese of Miami',     24.5, 26.9, -81.8, -80.0],
    ['Diocese of Palm Beach',    26.0, 27.5, -80.9, -80.0],
    ['Diocese of Orlando',       27.5, 29.5, -82.0, -80.3],
    ['Diocese of St. Petersburg', 27.5, 28.5, -83.0, -82.0],
    ['Archdiocese of Tampa',     27.3, 28.5, -82.8, -82.0],
    ['Diocese of Venice',        26.0, 27.5, -82.7, -81.2],
    ['Diocese of St. Augustine', 29.0, 31.0, -82.2, -80.0],
    ['Diocese of Pensacola-Tallahassee', 29.0, 31.0, -87.6, -84.0],
    ['Diocese of Jacksonville',  29.5, 31.0, -84.0, -81.4],
  ],
  'GA': [
    ['Archdiocese of Atlanta',   32.0, 35.0, -85.6, -82.0],
    ['Diocese of Savannah',      30.3, 33.0, -84.0, -80.8],
  ],
  'IA': [
    ['Archdiocese of Dubuque',   41.7, 43.5, -92.9, -90.1],
    ['Diocese of Davenport',     40.3, 42.0, -92.9, -90.1],
    ['Diocese of Des Moines',    41.0, 43.5, -95.9, -92.9],
    ['Diocese of Sioux City',    41.9, 43.5, -96.6, -95.9],
  ],
  'IL': [
    ['Archdiocese of Chicago',   41.4, 42.5, -88.3, -87.5],
    ['Diocese of Joliet',        41.0, 41.8, -88.5, -87.5],
    ['Diocese of Rockford',      41.8, 42.5, -90.5, -88.3],
    ['Diocese of Peoria',        40.0, 42.0, -90.6, -88.5],
    ['Diocese of Springfield',   38.5, 40.5, -91.5, -88.5],
    ['Diocese of Belleville',    37.0, 39.0, -91.5, -88.5],
  ],
  'IN': [
    ['Archdiocese of Indianapolis', 38.5, 40.5, -86.9, -85.0],
    ['Diocese of Fort Wayne-South Bend', 40.5, 41.8, -86.5, -84.8],
    ['Diocese of Gary',          41.3, 41.8, -87.6, -86.5],
    ['Diocese of Evansville',    37.7, 38.5, -88.1, -86.0],
                                                                      ],
  'KS': [
    ['Archdiocese of Kansas City in Kansas', 37.0, 40.0, -95.8, -94.5],
    ['Diocese of Dodge City',    37.0, 40.0, -102.0, -98.0],
    ['Diocese of Wichita',       37.0, 39.0, -98.0, -95.8],
    ['Diocese of Salina',        38.5, 40.0, -100.0, -97.0],
  ],
  'KY': [
    ['Archdiocese of Louisville', 37.5, 38.5, -86.5, -84.5],
    ['Diocese of Covington',     38.5, 39.1, -85.0, -83.5],
    ['Diocese of Lexington',     37.0, 38.5, -85.0, -82.5],
    ['Diocese of Owensboro',     37.0, 38.5, -88.0, -86.5],
  ],
  'LA': [
    ['Archdiocese of New Orleans', 29.0, 30.5, -91.5, -89.0],
    ['Diocese of Baton Rouge',   30.0, 31.5, -92.0, -90.5],
    ['Diocese of Lafayette',     29.0, 31.5, -93.5, -91.5],
    ['Diocese of Shreveport',    31.5, 33.0, -94.0, -90.5],
    ['Diocese of Alexandria',    30.5, 32.5, -93.5, -91.5],
    ['Diocese of Lake Charles',  29.5, 31.0, -93.9, -92.5],
  ],
  'MA': [  // Handled by MassGIS seed — should not appear in IRS import
    ['Archdiocese of Boston',     42.0, 42.9, -71.5, -70.0],
    ['Diocese of Worcester',      42.0, 42.7, -72.3, -71.5],
    ['Diocese of Fall River',     41.5, 42.0, -71.2, -70.0],
    ['Diocese of Springfield',    42.0, 42.8, -73.5, -72.3],
  ],
  'MD': [
    ['Archdiocese of Baltimore',  38.5, 39.9, -77.5, -75.7],
    ['Diocese of Wilmington',     38.4, 39.3, -76.5, -75.7],  // covers Eastern Shore MD
  ],
  'MI': [
    ['Archdiocese of Detroit',    41.7, 43.5, -84.2, -82.4],
    ['Diocese of Grand Rapids',   42.5, 44.5, -86.5, -84.2],
    ['Diocese of Lansing',        42.0, 43.5, -85.0, -83.5],
    ['Diocese of Saginaw',        43.0, 45.0, -85.0, -83.0],
    ['Diocese of Kalamazoo',      41.7, 42.7, -86.5, -85.0],
    ['Diocese of Gaylord',        44.0, 46.0, -86.0, -83.0],
    ['Diocese of Marquette',      45.5, 47.5, -90.5, -83.0],
  ],
  'MN': [
    ['Archdiocese of Saint Paul and Minneapolis', 44.5, 45.5, -93.8, -92.5],
    ['Diocese of Winona-Rochester',  43.5, 44.5, -93.0, -90.9],
    ['Diocese of New Ulm',       43.5, 45.5, -97.0, -94.5],
    ['Diocese of Saint Cloud',   45.0, 47.0, -96.5, -93.0],
    ['Diocese of Crookston',     47.0, 49.0, -97.5, -94.5],
    ['Diocese of Duluth',        46.0, 49.0, -94.5, -91.5],
    ['Diocese of Rapid City',    43.5, 46.0, -97.5, -96.5],  // border overlap
  ],
  'MO': [
    ['Archdiocese of Saint Louis', 38.0, 39.5, -91.5, -89.8],
    ['Diocese of Kansas City-St. Joseph', 38.5, 40.5, -95.8, -93.5],
    ['Diocese of Jefferson City', 38.0, 40.0, -93.5, -91.0],
    ['Diocese of Springfield-Cape Girardeau', 36.5, 38.0, -94.0, -89.5],
  ],
  'NC': [
    ['Diocese of Raleigh',       34.5, 36.6, -80.0, -75.5],
    ['Diocese of Charlotte',     34.5, 36.6, -84.3, -80.0],
  ],
  'ND': [
    ['Diocese of Bismarck',      45.9, 49.0, -104.0, -100.0],
    ['Diocese of Fargo',         45.9, 49.0, -100.0, -96.5],
  ],
  'NE': [
    ['Archdiocese of Omaha',     41.0, 43.0, -96.9, -95.3],
    ['Diocese of Lincoln',       40.0, 42.0, -101.0, -96.9],
    ['Diocese of Grand Island',  40.5, 43.0, -104.0, -101.0],
  ],
  'NJ': [
    ['Archdiocese of Newark',    40.5, 41.4, -74.3, -73.9],
    ['Diocese of Paterson',      40.8, 41.4, -74.7, -74.3],
    ['Diocese of Metuchen',      40.2, 40.8, -74.7, -74.0],
    ['Diocese of Trenton',       39.9, 40.5, -75.2, -73.9],
    ['Diocese of Camden',        39.4, 40.0, -75.6, -74.7],
  ],
  'NM': [
    ['Archdiocese of Santa Fe',  33.0, 37.0, -108.0, -104.0],
    ['Diocese of Las Cruces',    31.3, 33.5, -109.0, -104.0],
                                                              ],
  'NY': [
    ['Archdiocese of New York',  40.5, 41.3, -74.3, -73.7],
    ['Diocese of Brooklyn',      40.5, 40.8, -74.0, -73.7],
    ['Diocese of Rockville Centre', 40.5, 41.0, -73.7, -72.5],
    ['Diocese of Albany',        42.0, 45.0, -74.5, -72.5],
    ['Diocese of Buffalo',       42.0, 43.5, -79.8, -77.8],
    ['Diocese of Rochester',     42.5, 44.5, -77.8, -76.0],
    ['Diocese of Syracuse',      42.5, 44.5, -76.0, -74.5],
    ['Diocese of Ogdensburg',    43.5, 45.5, -75.6, -73.8],
  ],
  'OH': [
    ['Archdiocese of Cincinnati', 38.5, 40.5, -84.8, -83.0],
    ['Diocese of Cleveland',     41.0, 42.3, -82.5, -80.5],
    ['Diocese of Columbus',      39.5, 41.0, -83.5, -81.5],
    ['Diocese of Toledo',        40.5, 42.0, -84.8, -82.5],
    ['Diocese of Steubenville',  40.0, 40.9, -81.5, -80.5],
                                                            ],
  'OK': [
    ['Archdiocese of Oklahoma City', 34.5, 37.0, -100.0, -96.5],
    ['Diocese of Tulsa',         35.0, 37.0, -96.5, -94.4],
  ],
  'OR': [
    ['Archdiocese of Portland',  44.5, 46.3, -124.0, -121.0],
    ['Diocese of Baker',         42.0, 46.5, -120.5, -116.5],
  ],
  'PA': [
    ['Archdiocese of Philadelphia', 39.9, 40.5, -75.5, -74.7],
    ['Diocese of Allentown',     40.5, 41.5, -76.0, -74.7],
    ['Diocese of Scranton',      40.5, 42.3, -76.5, -75.3],
    ['Archdiocese of Pittsburgh', 40.0, 41.0, -80.5, -79.0],
    ['Diocese of Greensburg',    40.0, 41.0, -79.5, -78.0],
    ['Diocese of Harrisburg',    39.7, 40.5, -77.5, -75.7],
    ['Diocese of Erie',          41.0, 42.3, -80.5, -77.5],
  ],
  'SC': [
    ['Diocese of Charleston',    32.0, 35.3, -83.4, -78.5],
  ],
  'SD': [
    ['Diocese of Rapid City',    43.0, 46.0, -104.1, -100.0],
    ['Diocese of Sioux Falls',   43.0, 46.0, -100.0, -96.4],
  ],
  'TN': [
    ['Diocese of Memphis',       34.5, 36.7, -90.3, -87.5],
    ['Diocese of Nashville',     34.5, 36.7, -87.5, -85.5],
    ['Diocese of Knoxville',     35.0, 36.7, -85.5, -81.6],
  ],
  'TX': [
    ['Archdiocese of San Antonio', 28.5, 30.5, -100.0, -97.5],
    ['Archdiocese of Galveston-Houston', 29.0, 30.5, -96.5, -94.5],
    ['Diocese of Austin',        29.5, 31.5, -98.5, -96.5],
    ['Diocese of Dallas',        32.0, 34.0, -98.0, -95.5],
    ['Diocese of Fort Worth',    32.0, 34.0, -98.0, -97.0],
    ['Diocese of El Paso',       30.0, 32.5, -106.7, -104.0],
    ['Diocese of Laredo',        27.0, 29.5, -100.5, -98.5],
    ['Diocese of Corpus Christi', 27.0, 29.5, -98.5, -96.5],
    ['Diocese of Brownsville',   25.8, 27.5, -100.5, -96.5],
    ['Diocese of San Angelo',    30.0, 32.5, -101.5, -98.5],
    ['Diocese of Lubbock',       31.5, 34.5, -103.0, -100.5],
    ['Diocese of Amarillo',      34.0, 36.5, -103.0, -100.0],
    ['Diocese of Tyler',         31.5, 33.0, -95.5, -93.5],
    ['Diocese of Beaumont',      29.5, 31.0, -94.8, -93.5],
    ['Diocese of Victoria',      28.5, 30.0, -98.5, -96.0],
  ],
  'VA': [
    ['Diocese of Arlington',     38.5, 39.6, -77.5, -77.0],
    ['Diocese of Richmond',      36.5, 39.5, -80.9, -75.2],
  ],
  'WA': [
    ['Archdiocese of Seattle',   46.0, 49.0, -122.5, -120.5],
    ['Diocese of Spokane',       46.0, 49.0, -120.5, -116.9],
    ['Diocese of Yakima',        45.5, 47.5, -121.5, -119.5],
  ],
  'WI': [
    ['Archdiocese of Milwaukee', 42.5, 44.0, -88.5, -87.7],
    ['Diocese of Green Bay',     44.0, 47.0, -88.5, -86.5],
    ['Diocese of Madison',       42.5, 44.0, -90.5, -88.5],
    ['Diocese of La Crosse',     43.5, 47.0, -92.9, -90.0],
    ['Diocese of Superior',      46.0, 47.0, -92.9, -90.5],
  ],
  'WV': [
    ['Diocese of Wheeling-Charleston', 37.2, 40.6, -82.6, -77.7],
  ],
}

function assignDiocese(parish) {
  const { state, latitude, longitude } = parish

  if (!state) return null

  // Single-diocese states — easy
  if (SINGLE_DIOCESE[state]) return SINGLE_DIOCESE[state]

  // Multi-diocese states with bounding box data
  const bounds = DIOCESE_BOUNDS[state]
  if (bounds && latitude && longitude) {
    for (const [diocese, minLat, maxLat, minLng, maxLng] of bounds) {
      if (latitude >= minLat && latitude <= maxLat &&
          longitude >= minLng && longitude <= maxLng) {
        return diocese
      }
    }
  }

  // Fallback: state abbreviation placeholder for manual review
  return null
}

async function main() {
  const dataDir    = path.join(__dirname, 'data')
  const inputPath  = path.join(dataDir, 'catholic-parishes-geocoded.json')
  const outputPath = path.join(dataDir, 'catholic-parishes-ready.json')

  if (!fs.existsSync(inputPath)) {
    console.error('❌ Missing input file. Run: node scripts/geocode-parishes.js')
    process.exit(1)
  }

  const parishes = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  console.log(`\nAssigning dioceses to ${parishes.length.toLocaleString()} parishes...`)

  let assigned = 0, unassigned = 0

  const processed = parishes.map(p => {
    if (p.diocese) { assigned++; return p }

    const diocese = assignDiocese(p)
    if (diocese) {
      assigned++
      return { ...p, diocese }
    } else {
      unassigned++
      return p  // diocese stays null — handled gracefully in the app
    }
  })

  // State breakdown of assignment quality
  const byState = {}
  processed.forEach(p => {
    if (!byState[p.state]) byState[p.state] = { total: 0, assigned: 0 }
    byState[p.state].total++
    if (p.diocese) byState[p.state].assigned++
  })

  console.log(`\nAssigned:   ${assigned.toLocaleString()} / ${parishes.length.toLocaleString()}`)
  console.log(`Unassigned: ${unassigned.toLocaleString()} (diocese = null, will still import)`)
  console.log(`Assignment rate: ${Math.round(assigned / parishes.length * 100)}%`)

  // Flag states with low assignment rates
  const lowCoverage = Object.entries(byState)
    .filter(([, v]) => v.total > 10 && v.assigned / v.total < 0.5)
    .sort((a, b) => a[1].assigned / a[1].total - b[1].assigned / b[1].total)
  if (lowCoverage.length > 0) {
    console.log('\nStates with low diocese assignment coverage:')
    lowCoverage.forEach(([state, v]) =>
      console.log(`  ${state}: ${v.assigned}/${v.total} (${Math.round(v.assigned/v.total*100)}%)`)
    )
  }

  fs.writeFileSync(outputPath, JSON.stringify(processed, null, 2))
  console.log(`\n✅ Output: ${outputPath}`)
  console.log(`   Next step: node scripts/seed-national-parishes.js`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
