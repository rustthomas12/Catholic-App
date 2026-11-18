// The Catholic Church is a communion of 24 churches sui iuris: the Latin
// Church and 23 Eastern Catholic Churches. Each one belongs to a liturgical
// tradition, and churches in the same tradition celebrate the same rite.
//
// The slugs are stored in profiles.church and parishes.church, and the
// database check constraint (migration 089) must list the same values.
// Labels are English defaults; Spanish lives in locales/es/common.json
// under church.* and tradition.*.

export const TRADITIONS = [
  { id: 'latin',       label: 'Latin' },
  { id: 'byzantine',   label: 'Byzantine' },
  { id: 'alexandrian', label: 'Alexandrian' },
  { id: 'antiochian',  label: 'West Syriac (Antiochian)' },
  { id: 'armenian',    label: 'Armenian' },
  { id: 'chaldean',    label: 'East Syriac (Chaldean)' },
]

export const CHURCHES = [
  { id: 'latin',            tradition: 'latin',       label: 'Latin (Roman)' },

  { id: 'ukrainian',        tradition: 'byzantine',   label: 'Ukrainian Greek Catholic' },
  { id: 'ruthenian',        tradition: 'byzantine',   label: 'Ruthenian (Byzantine Catholic)' },
  { id: 'melkite',          tradition: 'byzantine',   label: 'Melkite Greek Catholic' },
  { id: 'romanian',         tradition: 'byzantine',   label: 'Romanian Greek Catholic' },
  { id: 'slovak',           tradition: 'byzantine',   label: 'Slovak Greek Catholic' },
  { id: 'hungarian',        tradition: 'byzantine',   label: 'Hungarian Greek Catholic' },
  { id: 'italo_albanian',   tradition: 'byzantine',   label: 'Italo-Albanian' },
  { id: 'greek',            tradition: 'byzantine',   label: 'Greek Byzantine Catholic' },
  { id: 'bulgarian',        tradition: 'byzantine',   label: 'Bulgarian Greek Catholic' },
  { id: 'krizevci',         tradition: 'byzantine',   label: 'Greek Catholic Church of Križevci' },
  { id: 'macedonian',       tradition: 'byzantine',   label: 'Macedonian Greek Catholic' },
  { id: 'belarusian',       tradition: 'byzantine',   label: 'Belarusian Greek Catholic' },
  { id: 'russian',          tradition: 'byzantine',   label: 'Russian Greek Catholic' },
  { id: 'albanian',         tradition: 'byzantine',   label: 'Albanian Greek Catholic' },

  { id: 'coptic',           tradition: 'alexandrian', label: 'Coptic Catholic' },
  { id: 'ethiopian',        tradition: 'alexandrian', label: 'Ethiopian Catholic' },
  { id: 'eritrean',         tradition: 'alexandrian', label: 'Eritrean Catholic' },

  { id: 'maronite',         tradition: 'antiochian',  label: 'Maronite' },
  { id: 'syriac',           tradition: 'antiochian',  label: 'Syriac Catholic' },
  { id: 'syro_malankara',   tradition: 'antiochian',  label: 'Syro-Malankara Catholic' },

  { id: 'armenian',         tradition: 'armenian',    label: 'Armenian Catholic' },

  { id: 'chaldean',         tradition: 'chaldean',    label: 'Chaldean Catholic' },
  { id: 'syro_malabar',     tradition: 'chaldean',    label: 'Syro-Malabar Catholic' },
]

const BY_ID = Object.fromEntries(CHURCHES.map((c) => [c.id, c]))

export const DEFAULT_CHURCH = 'latin'

export function getChurch(id) {
  return BY_ID[id] ?? BY_ID[DEFAULT_CHURCH]
}

export function isEastern(id) {
  return !!id && id !== DEFAULT_CHURCH && !!BY_ID[id]
}

// Church ids for a directory filter value: '' = all, 'eastern' = every
// Eastern church, a tradition id = that tradition, otherwise one church id.
export function churchesForFilter(filter) {
  if (!filter) return null
  if (filter === 'eastern') return CHURCHES.filter((c) => c.id !== DEFAULT_CHURCH).map((c) => c.id)
  if (TRADITIONS.some((tr) => tr.id === filter)) return CHURCHES.filter((c) => c.tradition === filter).map((c) => c.id)
  return BY_ID[filter] ? [filter] : null
}

// Translated names. Pass the `t` from useTranslation (any namespace).
export function churchLabel(t, id) {
  const c = getChurch(id)
  return t(`common:church.${c.id}`, c.label)
}

export function traditionLabel(t, id) {
  const tr = TRADITIONS.find((x) => x.id === id)
  return tr ? t(`common:tradition.${tr.id}`, tr.label) : ''
}
