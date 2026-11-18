import { describe, it, expect } from 'vitest'
import i18n from '../../src/utils/i18n'
import { liturgyContext } from '../../src/utils/liturgyTerms'

const term = (church) => i18n.t('common:term.mass_times', { context: liturgyContext(church), lng: 'en' })

describe('liturgy vocabulary by Church', () => {
  it('keeps "Mass" for the Latin Church and unknown values', () => {
    expect(term('latin')).toBe('Mass Times')
    expect(term(undefined)).toBe('Mass Times')
    expect(term('not_a_church')).toBe('Mass Times')
  })

  it('says Divine Liturgy for Byzantine and other Eastern Churches', () => {
    expect(term('ukrainian')).toBe('Divine Liturgy Times')
    expect(term('melkite')).toBe('Divine Liturgy Times')
    expect(term('maronite')).toBe('Divine Liturgy Times')
  })

  it('says Holy Qurbana for the Syro-Malabar and Syro-Malankara Churches', () => {
    expect(term('syro_malabar')).toBe('Holy Qurbana Times')
    expect(term('syro_malankara')).toBe('Holy Qurbana Times')
  })
})
