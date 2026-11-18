import { getChurch } from '../data/churches'

// Words that differ by Church. Pass the result as i18next `context`:
//   t('common:term.mass_times', { context: liturgyContext(parish.church) })
// resolves term.mass_times_eastern / _qurbana, and falls back to the Latin
// wording (term.mass_times) when the context is undefined or has no entry.
//
//   undefined — Latin Church: "Mass"
//   'eastern' — the Eucharistic liturgy is called the Divine Liturgy
//   'qurbana' — Syro-Malabar and Syro-Malankara: Holy Qurbana
//
// These choices should be reviewed by clergy of each Church.
export function liturgyContext(church) {
  const c = getChurch(church)
  if (c.id === 'latin') return undefined
  if (c.id === 'syro_malabar' || c.id === 'syro_malankara') return 'qurbana'
  return 'eastern'
}
