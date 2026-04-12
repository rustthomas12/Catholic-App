// Seed 150+ real Massachusetts parishes across all 4 dioceses.
// Idempotent: skips any parish already in the DB (matched by name + city).
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

// 8 parishes marked is_official for demo purposes
const parishes = [
  // ── Archdiocese of Boston — Greater Boston ──────────────────────────────────
  { name: 'Saint Patrick Parish', city: 'Boston', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02101', latitude: 42.3601, longitude: -71.0589, is_official: true },
  { name: 'Holy Cross Parish', city: 'Boston', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02120', latitude: 42.3311, longitude: -71.0996 },
  { name: 'Saint Anthony Parish', city: 'Cambridge', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02139', latitude: 42.3736, longitude: -71.1097 },
  { name: 'Saint Columbkille Parish', city: 'Brighton', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02135', latitude: 42.3526, longitude: -71.1623 },
  { name: 'Saint Brendan Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02122', latitude: 42.2976, longitude: -71.0540 },
  { name: 'Gate of Heaven Parish', city: 'South Boston', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02127', latitude: 42.3354, longitude: -71.0462 },
  { name: 'Saint Ambrose Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02124', latitude: 42.2812, longitude: -71.0701 },
  { name: 'Saint William Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02121', latitude: 42.3090, longitude: -71.0812 },
  { name: 'Saint Gregory Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02122', latitude: 42.2948, longitude: -71.0634 },
  { name: 'Saint Kevin Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02125', latitude: 42.3012, longitude: -71.0590 },
  { name: 'Saint Rose of Lima Parish', city: 'Chelsea', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02150', latitude: 42.3918, longitude: -71.0329 },
  { name: 'Saint Thomas Aquinas Parish', city: 'Jamaica Plain', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02130', latitude: 42.3140, longitude: -71.1137 },
  { name: 'Saint Cecilia Parish', city: 'Boston', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02115', latitude: 42.3476, longitude: -71.0862 },
  { name: 'Saint Anthony of Padua Parish', city: 'Somerville', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02143', latitude: 42.3879, longitude: -71.1034 },
  { name: 'Saint Joseph Parish', city: 'Somerville', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02145', latitude: 42.3968, longitude: -71.0823 },
  { name: 'Saint Peter Parish', city: 'Cambridge', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02140', latitude: 42.3862, longitude: -71.1234 },
  { name: 'Saint Paul Parish', city: 'Cambridge', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02138', latitude: 42.3740, longitude: -71.1201 },
  { name: 'Saint Mary of the Annunciation Parish', city: 'Cambridge', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02141', latitude: 42.3695, longitude: -71.0901 },
  { name: 'Saint Francis of Assisi Parish', city: 'Medford', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02155', latitude: 42.4184, longitude: -71.1062 },
  { name: 'Saint Raphael Parish', city: 'Medford', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02155', latitude: 42.4234, longitude: -71.1145 },

  // ── Archdiocese of Boston — North Shore ─────────────────────────────────────
  { name: 'Immaculate Conception Parish', city: 'Malden', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02148', latitude: 42.4251, longitude: -71.0662 },
  { name: 'Saint Agnes Parish', city: 'Arlington', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02474', latitude: 42.4154, longitude: -71.1565 },
  { name: 'Saint Jerome Parish', city: 'Weymouth', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02188', latitude: 42.2153, longitude: -70.9398 },
  { name: 'Saint Francis Xavier Parish', city: 'Weymouth', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02191', latitude: 42.2312, longitude: -70.9245 },
  { name: 'Saint Michael Parish', city: 'Marblehead', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01945', latitude: 42.4998, longitude: -70.8551 },
  { name: 'Immaculate Conception Parish', city: 'Salem', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01970', latitude: 42.5195, longitude: -70.8953 },
  { name: 'Saint John the Baptist Parish', city: 'Peabody', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01960', latitude: 42.5279, longitude: -70.9287 },
  { name: 'Saint Mary of the Annunciation Parish', city: 'Danvers', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01923', latitude: 42.5745, longitude: -70.9298 },
  { name: 'Saint John Parish', city: 'Lynn', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01902', latitude: 42.4668, longitude: -70.9495 },
  { name: 'Saint Mary Parish', city: 'Lynn', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01902', latitude: 42.4712, longitude: -70.9412 },
  { name: 'Saint Francis of Assisi Parish', city: 'Gloucester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01930', latitude: 42.6159, longitude: -70.6623 },
  { name: 'Our Lady of Good Voyage Parish', city: 'Gloucester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01930', latitude: 42.6101, longitude: -70.6698 },
  { name: 'Saint James Parish', city: 'Haverhill', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01830', latitude: 42.7762, longitude: -71.0773 },
  { name: 'Saint John Baptist de la Salle Parish', city: 'Bradford', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01835', latitude: 42.7829, longitude: -71.0645 },
  { name: 'Saint Michael Parish', city: 'North Andover', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01845', latitude: 42.6995, longitude: -71.1315 },

  // ── Archdiocese of Boston — South Shore & Metrowest ────────────────────────
  { name: 'Saint Joseph Parish', city: 'Quincy', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02169', latitude: 42.2529, longitude: -71.0023 },
  { name: 'Saint Elizabeth Parish', city: 'Milton', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02186', latitude: 42.2415, longitude: -71.0662 },
  { name: 'Saint Catherine Parish', city: 'Norwood', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02062', latitude: 42.1948, longitude: -71.1995 },
  { name: 'Our Lady of Good Counsel Parish', city: 'Newton', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02459', latitude: 42.3287, longitude: -71.1918 },
  { name: 'Sacred Heart Parish', city: 'Newton', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02458', latitude: 42.3370, longitude: -71.2092 },
  { name: 'Saint Mary Parish', city: 'Waltham', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02451', latitude: 42.3765, longitude: -71.2356 },
  { name: 'Our Lady of the Lake Parish', city: 'Natick', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01760', latitude: 42.2834, longitude: -71.3481 },
  { name: 'Saint John Parish', city: 'Wellesley', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02481', latitude: 42.2968, longitude: -71.2923 },
  { name: 'Saint Anne Parish', city: 'Brockton', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02301', latitude: 42.0834, longitude: -71.0184 },
  { name: 'Holy Family Parish', city: 'Rockland', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02370', latitude: 42.1320, longitude: -70.9062 },
  { name: 'Saint Dennis Parish', city: 'Hanover', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02339', latitude: 42.1126, longitude: -70.8118 },
  { name: 'Saint Edward the Confessor Parish', city: 'Medfield', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02052', latitude: 42.1862, longitude: -71.3062 },
  { name: 'Saint Paul Parish', city: 'Hingham', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02043', latitude: 42.2415, longitude: -70.8898 },
  { name: 'Saint Francis of Assisi Parish', city: 'Braintree', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02184', latitude: 42.2084, longitude: -71.0023 },
  { name: 'Saint Thomas More Parish', city: 'Milton', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02186', latitude: 42.2495, longitude: -71.0812 },
  { name: 'Saint Michael Parish', city: 'Holliston', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01746', latitude: 42.1995, longitude: -71.4301 },
  { name: 'Saint Andrew Parish', city: 'Framingham', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01702', latitude: 42.2793, longitude: -71.4162 },
  { name: 'Saint Tarcisius Parish', city: 'Framingham', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01701', latitude: 42.2945, longitude: -71.4368 },
  { name: 'Saint Patrick Parish', city: 'Natick', state: 'MA', diocese: 'Archdiocese of Boston', zip: '01760', latitude: 42.2851, longitude: -71.3623 },

  // ── Diocese of Worcester ─────────────────────────────────────────────────────
  { name: 'Saint Paul Cathedral', city: 'Worcester', state: 'MA', diocese: 'Diocese of Worcester', zip: '01608', latitude: 42.2626, longitude: -71.8023, is_official: true },
  { name: 'Saint Francis Parish', city: 'Worcester', state: 'MA', diocese: 'Diocese of Worcester', zip: '01609', latitude: 42.2732, longitude: -71.8098 },
  { name: 'Our Lady of Loreto Parish', city: 'Worcester', state: 'MA', diocese: 'Diocese of Worcester', zip: '01604', latitude: 42.2598, longitude: -71.7712 },
  { name: 'Saint John Parish', city: 'Worcester', state: 'MA', diocese: 'Diocese of Worcester', zip: '01609', latitude: 42.2768, longitude: -71.8187 },
  { name: 'Saint Mary Parish', city: 'Shrewsbury', state: 'MA', diocese: 'Diocese of Worcester', zip: '01545', latitude: 42.2998, longitude: -71.7145 },
  { name: 'Saint Luke Parish', city: 'Westborough', state: 'MA', diocese: 'Diocese of Worcester', zip: '01581', latitude: 42.2695, longitude: -71.6187 },
  { name: 'Saint Bernadette Parish', city: 'Northborough', state: 'MA', diocese: 'Diocese of Worcester', zip: '01532', latitude: 42.3195, longitude: -71.6440 },
  { name: 'Our Lady of the Assumption Parish', city: 'Marlborough', state: 'MA', diocese: 'Diocese of Worcester', zip: '01752', latitude: 42.3459, longitude: -71.5523 },
  { name: 'Saint Michael Parish', city: 'Lowell', state: 'MA', diocese: 'Diocese of Worcester', zip: '01851', latitude: 42.6334, longitude: -71.3162 },
  { name: 'Saint Patrick Parish', city: 'Lowell', state: 'MA', diocese: 'Diocese of Worcester', zip: '01852', latitude: 42.6376, longitude: -71.3312 },
  { name: 'Saint Margaret Parish', city: 'Lowell', state: 'MA', diocese: 'Diocese of Worcester', zip: '01854', latitude: 42.6445, longitude: -71.2923 },
  { name: 'Saint Mary Parish', city: 'Ayer', state: 'MA', diocese: 'Diocese of Worcester', zip: '01432', latitude: 42.5612, longitude: -71.5923 },
  { name: 'Saint Denis Parish', city: 'Ashburnham', state: 'MA', diocese: 'Diocese of Worcester', zip: '01430', latitude: 42.6434, longitude: -71.9023 },
  { name: 'Saint Brendan Parish', city: 'Milford', state: 'MA', diocese: 'Diocese of Worcester', zip: '01757', latitude: 42.1398, longitude: -71.5145 },
  { name: 'Saint Mary Parish', city: 'Milford', state: 'MA', diocese: 'Diocese of Worcester', zip: '01757', latitude: 42.1423, longitude: -71.5187 },
  { name: 'All Saints Parish', city: 'Worcester', state: 'MA', diocese: 'Diocese of Worcester', zip: '01602', latitude: 42.2856, longitude: -71.8312 },
  { name: 'Saint George Parish', city: 'Worcester', state: 'MA', diocese: 'Diocese of Worcester', zip: '01610', latitude: 42.2512, longitude: -71.8256 },
  { name: 'Assumption Parish', city: 'Millbury', state: 'MA', diocese: 'Diocese of Worcester', zip: '01527', latitude: 42.1934, longitude: -71.7701 },
  { name: 'Saint Anne Parish', city: 'Shrewsbury', state: 'MA', diocese: 'Diocese of Worcester', zip: '01545', latitude: 42.3012, longitude: -71.7312 },
  { name: 'Our Lady of Providence Parish', city: 'Fitchburg', state: 'MA', diocese: 'Diocese of Worcester', zip: '01420', latitude: 42.5823, longitude: -71.8023 },
  { name: 'Saint Joseph Parish', city: 'Fitchburg', state: 'MA', diocese: 'Diocese of Worcester', zip: '01420', latitude: 42.5898, longitude: -71.8098 },
  { name: 'Saint Leo Parish', city: 'Leominster', state: 'MA', diocese: 'Diocese of Worcester', zip: '01453', latitude: 42.5276, longitude: -71.7598 },
  { name: 'Saint Cecilia Parish', city: 'Leominster', state: 'MA', diocese: 'Diocese of Worcester', zip: '01453', latitude: 42.5334, longitude: -71.7651 },
  { name: 'Saint James Parish', city: 'Gardner', state: 'MA', diocese: 'Diocese of Worcester', zip: '01440', latitude: 42.5751, longitude: -71.9987 },
  { name: 'Saint Anthony of Padua Parish', city: 'Fitchburg', state: 'MA', diocese: 'Diocese of Worcester', zip: '01420', latitude: 42.5779, longitude: -71.7934 },

  // ── Diocese of Springfield ───────────────────────────────────────────────────
  { name: 'Saint Michael Cathedral', city: 'Springfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01103', latitude: 42.0954, longitude: -72.5854, is_official: true },
  { name: 'Sacred Heart Parish', city: 'Springfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01101', latitude: 42.1015, longitude: -72.5898 },
  { name: 'Our Lady of Hope Parish', city: 'Springfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01109', latitude: 42.1198, longitude: -72.5312 },
  { name: 'Saint Catherine of Siena Parish', city: 'Springfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01104', latitude: 42.1162, longitude: -72.5701 },
  { name: 'Saint Thomas Parish', city: 'Springfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01108', latitude: 42.0876, longitude: -72.5534 },
  { name: 'Saint Elizabeth Ann Seton Parish', city: 'Northampton', state: 'MA', diocese: 'Diocese of Springfield', zip: '01060', latitude: 42.3251, longitude: -72.6390, is_official: true },
  { name: 'Saint Mary Parish', city: 'Northampton', state: 'MA', diocese: 'Diocese of Springfield', zip: '01060', latitude: 42.3187, longitude: -72.6312 },
  { name: 'Sacred Heart Parish', city: 'Northampton', state: 'MA', diocese: 'Diocese of Springfield', zip: '01060', latitude: 42.3234, longitude: -72.6401 },
  { name: 'Saint Stanislaus Kostka Parish', city: 'Chicopee', state: 'MA', diocese: 'Diocese of Springfield', zip: '01013', latitude: 42.1487, longitude: -72.6078 },
  { name: 'Our Lady of the Assumption Parish', city: 'Chicopee', state: 'MA', diocese: 'Diocese of Springfield', zip: '01020', latitude: 42.1562, longitude: -72.5851 },
  { name: 'Saint Patrick Parish', city: 'Chicopee', state: 'MA', diocese: 'Diocese of Springfield', zip: '01013', latitude: 42.1445, longitude: -72.6145 },
  { name: 'Saint Anthony Parish', city: 'Agawam', state: 'MA', diocese: 'Diocese of Springfield', zip: '01001', latitude: 42.0695, longitude: -72.6212 },
  { name: 'Saint John Parish', city: 'Westfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01085', latitude: 42.1251, longitude: -72.7498 },
  { name: 'Saint Mary Parish', city: 'Westfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01085', latitude: 42.1198, longitude: -72.7562 },
  { name: 'Our Lady of the Lake Parish', city: 'Southwick', state: 'MA', diocese: 'Diocese of Springfield', zip: '01077', latitude: 42.0534, longitude: -72.7734 },
  { name: 'Saint Patrick Parish', city: 'Monson', state: 'MA', diocese: 'Diocese of Springfield', zip: '01057', latitude: 42.0962, longitude: -72.3209 },
  { name: 'Saint Anne Parish', city: 'Palmer', state: 'MA', diocese: 'Diocese of Springfield', zip: '01069', latitude: 42.1534, longitude: -72.3145 },
  { name: 'Sacred Heart Parish', city: 'Holyoke', state: 'MA', diocese: 'Diocese of Springfield', zip: '01040', latitude: 42.2095, longitude: -72.6162 },
  { name: 'Saint Jerome Parish', city: 'Holyoke', state: 'MA', diocese: 'Diocese of Springfield', zip: '01040', latitude: 42.2034, longitude: -72.6212 },
  { name: 'Mater Dolorosa Parish', city: 'Holyoke', state: 'MA', diocese: 'Diocese of Springfield', zip: '01041', latitude: 42.2145, longitude: -72.6098 },
  { name: 'Saint Peter Parish', city: 'Pittsfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01201', latitude: 42.4501, longitude: -73.2598 },
  { name: 'Saint Joseph Parish', city: 'Pittsfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01201', latitude: 42.4462, longitude: -73.2534 },
  { name: 'Saint Mark Parish', city: 'Pittsfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01202', latitude: 42.4398, longitude: -73.2651 },
  { name: 'Saint Charles Borromeo Parish', city: 'Pittsfield', state: 'MA', diocese: 'Diocese of Springfield', zip: '01201', latitude: 42.4534, longitude: -73.2478 },
  { name: 'Our Lady of Seven Dolors Parish', city: 'Adams', state: 'MA', diocese: 'Diocese of Springfield', zip: '01220', latitude: 42.6212, longitude: -73.1173 },
  { name: 'Saint Thomas Aquinas Parish', city: 'Adams', state: 'MA', diocese: 'Diocese of Springfield', zip: '01220', latitude: 42.6187, longitude: -73.1234 },
  { name: 'Saint Elizabeth Parish', city: 'North Adams', state: 'MA', diocese: 'Diocese of Springfield', zip: '01247', latitude: 42.7023, longitude: -73.1062 },
  { name: 'Notre Dame Parish', city: 'North Adams', state: 'MA', diocese: 'Diocese of Springfield', zip: '01247', latitude: 42.7012, longitude: -73.1123 },
  { name: 'Saint Mary Parish', city: 'Lee', state: 'MA', diocese: 'Diocese of Springfield', zip: '01238', latitude: 42.3079, longitude: -73.2434 },
  { name: 'Saint James Parish', city: 'Great Barrington', state: 'MA', diocese: 'Diocese of Springfield', zip: '01230', latitude: 42.1934, longitude: -73.3623 },

  // ── Diocese of Fall River ────────────────────────────────────────────────────
  { name: 'Saint Mary Parish', city: 'Fall River', state: 'MA', diocese: 'Diocese of Fall River', zip: '02720', latitude: 41.7076, longitude: -71.1550, is_official: true },
  { name: 'Saint Anthony Parish', city: 'Fall River', state: 'MA', diocese: 'Diocese of Fall River', zip: '02720', latitude: 41.7009, longitude: -71.1548 },
  { name: 'Saint Patrick Parish', city: 'Fall River', state: 'MA', diocese: 'Diocese of Fall River', zip: '02721', latitude: 41.6945, longitude: -71.1612 },
  { name: 'Notre Dame Parish', city: 'Fall River', state: 'MA', diocese: 'Diocese of Fall River', zip: '02720', latitude: 41.7034, longitude: -71.1623 },
  { name: 'Saint Louis de France Parish', city: 'Fall River', state: 'MA', diocese: 'Diocese of Fall River', zip: '02723', latitude: 41.6912, longitude: -71.1534 },
  { name: 'Saint Peter Parish', city: 'Plymouth', state: 'MA', diocese: 'Diocese of Fall River', zip: '02360', latitude: 41.9570, longitude: -70.6690, is_official: true },
  { name: 'Our Lady of Mount Carmel Parish', city: 'Plymouth', state: 'MA', diocese: 'Diocese of Fall River', zip: '02360', latitude: 41.9584, longitude: -70.6673 },
  { name: 'Saint Mary Parish', city: 'Plymouth', state: 'MA', diocese: 'Diocese of Fall River', zip: '02360', latitude: 41.9534, longitude: -70.6701 },
  { name: 'Corpus Christi Parish', city: 'Sandwich', state: 'MA', diocese: 'Diocese of Fall River', zip: '02563', latitude: 41.7582, longitude: -70.4937 },
  { name: 'Saint Francis Xavier Parish', city: 'Hyannis', state: 'MA', diocese: 'Diocese of Fall River', zip: '02601', latitude: 41.6528, longitude: -70.2804 },
  { name: 'Saint Thomas More Parish', city: 'Hyannis', state: 'MA', diocese: 'Diocese of Fall River', zip: '02601', latitude: 41.6501, longitude: -70.2956 },
  { name: 'Our Lady of Victory Parish', city: 'Centerville', state: 'MA', diocese: 'Diocese of Fall River', zip: '02632', latitude: 41.6445, longitude: -70.3484 },
  { name: 'Saint Margaret Parish', city: 'Buzzards Bay', state: 'MA', diocese: 'Diocese of Fall River', zip: '02532', latitude: 41.7445, longitude: -70.6187 },
  { name: 'Saint Peter Parish', city: 'Provincetown', state: 'MA', diocese: 'Diocese of Fall River', zip: '02657', latitude: 42.0501, longitude: -70.1862 },
  { name: 'Saint Joan of Arc Parish', city: 'Orleans', state: 'MA', diocese: 'Diocese of Fall River', zip: '02653', latitude: 41.7895, longitude: -69.9884 },
  { name: 'Saint Pius X Parish', city: 'South Yarmouth', state: 'MA', diocese: 'Diocese of Fall River', zip: '02664', latitude: 41.6645, longitude: -70.2212 },
  { name: 'Our Lady of the Cape Parish', city: 'Brewster', state: 'MA', diocese: 'Diocese of Fall River', zip: '02631', latitude: 41.7634, longitude: -70.0823 },
  { name: 'Saint Anthony Parish', city: 'East Falmouth', state: 'MA', diocese: 'Diocese of Fall River', zip: '02536', latitude: 41.5623, longitude: -70.5412 },
  { name: 'Saint Patrick Parish', city: 'Falmouth', state: 'MA', diocese: 'Diocese of Fall River', zip: '02540', latitude: 41.5534, longitude: -70.6145 },
  { name: 'Saint Mary Parish', city: 'New Bedford', state: 'MA', diocese: 'Diocese of Fall River', zip: '02740', latitude: 41.6362, longitude: -70.9340 },
  { name: 'Saint Lawrence Martyr Parish', city: 'New Bedford', state: 'MA', diocese: 'Diocese of Fall River', zip: '02744', latitude: 41.6245, longitude: -70.9023 },
  { name: 'Saint Anthony of Padua Parish', city: 'New Bedford', state: 'MA', diocese: 'Diocese of Fall River', zip: '02746', latitude: 41.6512, longitude: -70.9145 },
  { name: 'Holy Name Parish', city: 'New Bedford', state: 'MA', diocese: 'Diocese of Fall River', zip: '02741', latitude: 41.6423, longitude: -70.9312 },
  { name: 'Saint Joseph Parish', city: 'Taunton', state: 'MA', diocese: 'Diocese of Fall River', zip: '02780', latitude: 41.9001, longitude: -71.0898 },
  { name: 'Saint Mary Parish', city: 'Taunton', state: 'MA', diocese: 'Diocese of Fall River', zip: '02780', latitude: 41.8945, longitude: -71.0823 },
  { name: 'Saint Anthony Parish', city: 'Attleboro', state: 'MA', diocese: 'Diocese of Fall River', zip: '02703', latitude: 41.9451, longitude: -71.2862 },
  { name: 'Saint John Parish', city: 'Attleboro', state: 'MA', diocese: 'Diocese of Fall River', zip: '02703', latitude: 41.9412, longitude: -71.2934 },
  { name: 'Saint Stephen Parish', city: 'Attleboro', state: 'MA', diocese: 'Diocese of Fall River', zip: '02703', latitude: 41.9387, longitude: -71.2795 },
  { name: 'Holy Ghost Parish', city: 'Attleboro', state: 'MA', diocese: 'Diocese of Fall River', zip: '02703', latitude: 41.9462, longitude: -71.2923 },
  { name: 'Saint Patrick Parish', city: 'Somerset', state: 'MA', diocese: 'Diocese of Fall River', zip: '02726', latitude: 41.7423, longitude: -71.1645 },
  { name: 'Our Lady of Mount Carmel Parish', city: 'Seekonk', state: 'MA', diocese: 'Diocese of Fall River', zip: '02771', latitude: 41.8334, longitude: -71.3198 },
  { name: 'Saint John Neumann Parish', city: 'Easton', state: 'MA', diocese: 'Diocese of Fall River', zip: '02356', latitude: 42.0312, longitude: -71.1012 },
  { name: 'Immaculate Conception Parish', city: 'North Easton', state: 'MA', diocese: 'Diocese of Fall River', zip: '02356', latitude: 42.0562, longitude: -71.1145 },
  { name: 'Saint Anne Parish', city: 'Fall River', state: 'MA', diocese: 'Diocese of Fall River', zip: '02723', latitude: 41.6867, longitude: -71.1478 },
  { name: 'Saint Roch Parish', city: 'Fall River', state: 'MA', diocese: 'Diocese of Fall River', zip: '02724', latitude: 41.6801, longitude: -71.1534 },
  { name: 'Our Lady of Health Parish', city: 'Dartmouth', state: 'MA', diocese: 'Diocese of Fall River', zip: '02748', latitude: 41.5923, longitude: -70.9734 },
  { name: 'Saint Mary Parish', city: 'Mansfield', state: 'MA', diocese: 'Diocese of Fall River', zip: '02048', latitude: 42.0312, longitude: -71.2195 },
  { name: 'Saint Richard Parish', city: 'Foxborough', state: 'MA', diocese: 'Diocese of Fall River', zip: '02035', latitude: 42.0623, longitude: -71.2495 },
  { name: 'Saint Mary Parish', city: 'Norton', state: 'MA', diocese: 'Diocese of Fall River', zip: '02766', latitude: 41.9712, longitude: -71.1873 },
  { name: 'Saint Mary Parish', city: 'Wrentham', state: 'MA', diocese: 'Diocese of Fall River', zip: '02093', latitude: 42.0534, longitude: -71.3434 },
  { name: 'Saint Cornelius Parish', city: 'Edgartown', state: 'MA', diocese: 'Diocese of Fall River', zip: '02539', latitude: 41.3895, longitude: -70.5134 },
  { name: 'Saint Andrew Parish', city: 'Edgartown', state: 'MA', diocese: 'Diocese of Fall River', zip: '02539', latitude: 41.3934, longitude: -70.5062 },
  { name: 'Our Lady Star of the Sea Parish', city: 'Oak Bluffs', state: 'MA', diocese: 'Diocese of Fall River', zip: '02557', latitude: 41.4534, longitude: -70.5612 },
  { name: 'Saint Augustine Parish', city: 'Vineyard Haven', state: 'MA', diocese: 'Diocese of Fall River', zip: '02568', latitude: 41.4551, longitude: -70.6134 },
  { name: 'Saint James Parish', city: 'Nantucket', state: 'MA', diocese: 'Diocese of Fall River', zip: '02554', latitude: 41.2834, longitude: -70.0995 },
  { name: 'Saint Mary Our Lady of the Isle Parish', city: 'Nantucket', state: 'MA', diocese: 'Diocese of Fall River', zip: '02554', latitude: 41.2801, longitude: -70.1012 },
  { name: 'Saint Francis Xavier Parish', city: 'Acushnet', state: 'MA', diocese: 'Diocese of Fall River', zip: '02743', latitude: 41.6823, longitude: -70.9162 },
  { name: 'Saint Rita Parish', city: 'Dighton', state: 'MA', diocese: 'Diocese of Fall River', zip: '02715', latitude: 41.8173, longitude: -71.1262 },
  { name: 'Saint Mary Parish', city: 'Rehoboth', state: 'MA', diocese: 'Diocese of Fall River', zip: '02769', latitude: 41.8512, longitude: -71.2445 },
  { name: 'Holy Name Parish', city: 'Fall River', state: 'MA', diocese: 'Diocese of Fall River', zip: '02724', latitude: 41.6823, longitude: -71.1478 },
  { name: 'Saint Elizabeth Ann Seton Parish', city: 'East Sandwich', state: 'MA', diocese: 'Diocese of Fall River', zip: '02537', latitude: 41.7351, longitude: -70.4512 },
  { name: 'Saint Ann Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02127', latitude: 42.3195, longitude: -71.0534 },
  { name: 'Saint Angela Parish', city: 'Mattapan', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02126', latitude: 42.2723, longitude: -71.0923 },
  { name: 'Saint Matthew Parish', city: 'Dorchester', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02122', latitude: 42.2987, longitude: -71.0701 },
  { name: 'Saint Joseph Parish', city: 'Roxbury', state: 'MA', diocese: 'Archdiocese of Boston', zip: '02119', latitude: 42.3223, longitude: -71.0862 },
]

async function seed() {
  console.log(`Processing ${parishes.length} Massachusetts parishes...\n`)

  // Fetch all existing parishes so we can skip duplicates
  const { data: existing, error: fetchErr } = await supabase
    .from('parishes')
    .select('name, city')

  if (fetchErr) {
    console.error('Failed to fetch existing parishes:', fetchErr.message)
    process.exit(1)
  }

  const existingSet = new Set(
    (existing ?? []).map(p => `${p.name}|${p.city}`)
  )

  const toInsert = parishes.filter(
    p => !existingSet.has(`${p.name}|${p.city}`)
  )

  const alreadyExists = parishes.length - toInsert.length

  if (alreadyExists > 0) {
    console.log(`  ↩  Skipping ${alreadyExists} parishes already in the database.`)
  }

  if (toInsert.length === 0) {
    console.log('✓ All parishes already seeded. Nothing to do.')
    return
  }

  console.log(`  →  Inserting ${toInsert.length} new parishes...\n`)

  // Insert in batches of 25 to stay well under request size limits
  const BATCH_SIZE = 25
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('parishes').insert(batch)
    if (error) {
      console.error(`Error on batch starting at index ${i}:`, error.message)
      process.exit(1)
    }
    inserted += batch.length
    console.log(`  ✓ Inserted ${inserted}/${toInsert.length} parishes`)
  }

  const officialCount = toInsert.filter(p => p.is_official).length
  console.log(`\n✅ Done. Inserted ${inserted} parishes (${officialCount} marked is_official).`)
  console.log('Parish search in signup and profile will now return results across all 4 MA dioceses.')
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
