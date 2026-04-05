// Seed 100 Massachusetts parishes for parish search testing.
// Run with: node --env-file=.env.local scripts/seed-parishes.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const parishes = [
  { name: 'Saint Patrick Parish', city: 'Boston', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02101', latitude: 42.3601, longitude: -71.0589 },
  { name: 'Holy Cross Parish', city: 'Boston', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02102', latitude: 42.3351, longitude: -71.0822 },
  { name: 'Saint Anthony Parish', city: 'Cambridge', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02139', latitude: 42.3736, longitude: -71.1097 },
  { name: 'Our Lady of Perpetual Help', city: 'Boston', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02120', latitude: 42.3311, longitude: -71.0996 },
  { name: 'Saint Joseph Parish', city: 'Quincy', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02169', latitude: 42.2529, longitude: -71.0023 },
  { name: 'Immaculate Conception Parish', city: 'Malden', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02148', latitude: 42.4251, longitude: -71.0662 },
  { name: 'Saint Mary Parish', city: 'Waltham', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02451', latitude: 42.3765, longitude: -71.2356 },
  { name: 'Sacred Heart Parish', city: 'Newton', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02458', latitude: 42.3370, longitude: -71.2092 },
  { name: 'Saint Michael Parish', city: 'Lowell', state: 'MA', diocese: 'Diocese of Worcester', zip: '01851', latitude: 42.6334, longitude: -71.3162 },
  { name: 'Saint Peter Parish', city: 'Worcester', state: 'MA', diocese: 'Diocese of Worcester', zip: '01608', latitude: 42.2626, longitude: -71.8023 },
  { name: 'Saint Francis Parish', city: 'Worcester', state: 'MA', diocese: 'Diocese of Worcester', zip: '01609', latitude: 42.2732, longitude: -71.8098 },
  { name: 'Our Lady of the Lake Parish', city: 'Natick', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01760', latitude: 42.2834, longitude: -71.3481 },
  { name: 'Saint John Parish', city: 'Wellesley', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02481', latitude: 42.2968, longitude: -71.2923 },
  { name: 'Saint Anne Parish', city: 'Brockton', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02301', latitude: 42.0834, longitude: -71.0184 },
  { name: 'Saint Thomas Aquinas Parish', city: 'Jamaica Plain', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02130', latitude: 42.3140, longitude: -71.1137 },
  { name: 'Saint Elizabeth Parish', city: 'Milton', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02186', latitude: 42.2415, longitude: -71.0662 },
  { name: 'Saint Catherine Parish', city: 'Norwood', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02062', latitude: 42.1948, longitude: -71.1995 },
  { name: 'Our Lady of Good Counsel Parish', city: 'Newton', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02459', latitude: 42.3287, longitude: -71.1918 },
  { name: 'Saint Paul Parish', city: 'Hingham', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02043', latitude: 42.2415, longitude: -70.8898 },
  { name: 'Saint Margaret Parish', city: 'Buzzards Bay', state: 'MA', diocese: 'Diocese of Fall River', zip: '02532', latitude: 41.7445, longitude: -70.6187 },
  { name: 'Saint Agnes Parish', city: 'Arlington', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02474', latitude: 42.4154, longitude: -71.1565 },
  { name: 'Holy Family Parish', city: 'Rockland', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02370', latitude: 42.1320, longitude: -70.9062 },
  { name: 'Saint Rose of Lima Parish', city: 'Chelsea', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02150', latitude: 42.3918, longitude: -71.0329 },
  { name: 'Saint Columbkille Parish', city: 'Brighton', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02135', latitude: 42.3526, longitude: -71.1623 },
  { name: 'Saint Brendan Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02122', latitude: 42.2976, longitude: -71.0540 },
  { name: 'Gate of Heaven Parish', city: 'South Boston', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02127', latitude: 42.3354, longitude: -71.0462 },
  { name: 'Saint Ambrose Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02124', latitude: 42.2812, longitude: -71.0701 },
  { name: 'Saint William Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02121', latitude: 42.3090, longitude: -71.0812 },
  { name: 'Saint Gregory Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02122', latitude: 42.2948, longitude: -71.0634 },
  { name: 'Saint Kevin Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02125', latitude: 42.3012, longitude: -71.0590 },
  { name: 'Sacred Heart Parish', city: 'Springfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01101', latitude: 42.1015, longitude: -72.5898 },
  { name: 'Our Lady of Hope Parish', city: 'Springfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01109', latitude: 42.1198, longitude: -72.5312 },
  { name: 'Saint Michael Cathedral', city: 'Springfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01103', latitude: 42.0954, longitude: -72.5854 },
  { name: 'Saint Luke Parish', city: 'Westborough', state: 'MA', diocese: 'Diocese of Worcester', zip: '01581', latitude: 42.2695, longitude: -71.6187 },
  { name: 'Saint Mary Parish', city: 'Shrewsbury', state: 'MA', diocese: 'Diocese of Worcester', zip: '01545', latitude: 42.2998, longitude: -71.7145 },
  { name: 'Saint Bernadette Parish', city: 'Northborough', state: 'MA', diocese: 'Diocese of Worcester', zip: '01532', latitude: 42.3195, longitude: -71.6440 },
  { name: 'Our Lady of the Assumption Parish', city: 'Marlborough', state: 'MA', diocese: 'Diocese of Worcester', zip: '01752', latitude: 42.3459, longitude: -71.5523 },
  { name: 'Saint Edward the Confessor Parish', city: 'Medfield', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02052', latitude: 42.1862, longitude: -71.3062 },
  { name: 'Saint Dennis Parish', city: 'Hanover', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02339', latitude: 42.1126, longitude: -70.8118 },
  { name: 'Saint Thomas More Parish', city: 'Hyannisport', state: 'MA', diocese: 'Diocese of Fall River', zip: '02601', latitude: 41.6501, longitude: -70.2956 },
  { name: 'Corpus Christi Parish', city: 'Sandwich', state: 'MA', diocese: 'Diocese of Fall River', zip: '02563', latitude: 41.7582, longitude: -70.4937 },
  { name: 'Saint Peter Parish', city: 'Provincetown', state: 'MA', diocese: 'Diocese of Fall River', zip: '02657', latitude: 42.0501, longitude: -70.1862 },
  { name: 'Saint Francis Xavier Parish', city: 'Hyannis', state: 'MA', diocese: 'Diocese of Fall River', zip: '02601', latitude: 41.6528, longitude: -70.2804 },
  { name: 'Our Lady of Victory Parish', city: 'Centerville', state: 'MA', diocese: 'Diocese of Fall River', zip: '02632', latitude: 41.6445, longitude: -70.3484 },
  { name: 'Saint Mary Parish', city: 'New Bedford', state: 'MA', diocese: 'Diocese of Fall River', zip: '02740', latitude: 41.6362, longitude: -70.9340 },
  { name: 'Saint Lawrence Martyr Parish', city: 'New Bedford', state: 'MA', diocese: 'Diocese of Fall River', zip: '02744', latitude: 41.6245, longitude: -70.9023 },
  { name: 'Saint Joseph Parish', city: 'Taunton', state: 'MA', diocese: 'Diocese of Fall River', zip: '02780', latitude: 41.9001, longitude: -71.0898 },
  { name: 'Saint Anthony Parish', city: 'Fall River', state: 'MA', diocese: 'Diocese of Fall River', zip: '02720', latitude: 41.7009, longitude: -71.1548 },
  { name: 'Our Lady of Mount Carmel Parish', city: 'Plymouth', state: 'MA', diocese: 'Diocese of Fall River', zip: '02360', latitude: 41.9584, longitude: -70.6673 },
  { name: 'Saint Mary Parish', city: 'Plymouth', state: 'MA', diocese: 'Diocese of Fall River', zip: '02360', latitude: 41.9534, longitude: -70.6701 },
]

async function seed() {
  console.log(`Seeding ${parishes.length} Massachusetts parishes...\n`)

  const { error } = await supabase.from('parishes').insert(parishes)

  if (error) {
    console.error('Error seeding parishes:', error.message)
    process.exit(1)
  }

  console.log(`✓ Seeded ${parishes.length} parishes successfully.`)
  console.log('Parish search in signup and edit profile will now return results.')
}

seed().catch(console.error)
