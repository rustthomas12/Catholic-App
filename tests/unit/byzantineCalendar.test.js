import { describe, it, expect } from 'vitest'
import { getByzantineSeason, getByzantineFeast, gregorianPascha } from '../../src/utils/byzantineCalendar'
import { getSeasonForChurch, getFeastForChurch, calendarFor } from '../../src/utils/liturgical'

const on = (y, m, d) => new Date(y, m - 1, d, 12) // noon local, month 1-based
const seasonOn = (y, m, d) => getByzantineSeason(on(y, m, d)).season.replace('byz_', '')
const feastOn = (y, m, d) => getByzantineFeast(on(y, m, d)).feastId

describe('Gregorian Pascha', () => {
  it('matches known dates', () => {
    const iso = (n) => new Date(n * 86400000).toISOString().slice(0, 10)
    expect(iso(gregorianPascha(2026))).toBe('2026-04-05')
    expect(iso(gregorianPascha(2027))).toBe('2027-03-28')
    expect(iso(gregorianPascha(2025))).toBe('2025-04-20')
  })
})

describe('Byzantine seasons (2026, Pascha April 5)', () => {
  it.each([
    [[2026, 1, 3],   'nativity'],
    [[2026, 1, 6],   'theophany'],
    [[2026, 1, 14],  'theophany'],
    [[2026, 1, 20],  'after_theophany'],
    [[2026, 1, 25],  'triodion'],        // Sunday of the Publican and Pharisee
    [[2026, 2, 15],  'triodion'],        // Forgiveness Sunday
    [[2026, 2, 16],  'great_lent'],      // Clean Monday
    [[2026, 3, 28],  'great_lent'],      // Lazarus Saturday
    [[2026, 3, 29],  'holy_week'],       // Palm Sunday
    [[2026, 4, 4],   'holy_week'],
    [[2026, 4, 5],   'pascha'],
    [[2026, 5, 13],  'pascha'],          // Leave-taking of Pascha
    [[2026, 5, 14],  'pentecost_season'],// Ascension
    [[2026, 5, 31],  'pentecost_season'],// All Saints
    [[2026, 6, 1],   'apostles_fast'],
    [[2026, 6, 28],  'apostles_fast'],
    [[2026, 6, 29],  'after_pentecost'],
    [[2026, 8, 1],   'dormition_fast'],
    [[2026, 8, 15],  'after_pentecost'],
    [[2026, 11, 14], 'after_pentecost'],
    [[2026, 11, 15], 'nativity_fast'],
    [[2026, 11, 18], 'nativity_fast'],
    [[2026, 12, 24], 'nativity_fast'],
    [[2026, 12, 25], 'nativity'],
  ])('%j is %s', ([y, m, d], expected) => {
    expect(seasonOn(y, m, d)).toBe(expected)
  })

  it('marks fasting seasons', () => {
    expect(getByzantineSeason(on(2026, 11, 18)).fasting).toBe(true)
    expect(getByzantineSeason(on(2026, 3, 1)).fasting).toBe(true)
    expect(getByzantineSeason(on(2026, 4, 10)).fasting).toBe(false)
  })
})

describe('Byzantine feasts', () => {
  it('finds fixed and moveable feasts', () => {
    expect(feastOn(2026, 1, 6)).toBe('theophany')
    expect(feastOn(2026, 8, 15)).toBe('dormition')
    expect(feastOn(2026, 11, 21)).toBe('entrance')
    expect(feastOn(2026, 12, 6)).toBe('nicholas')
    expect(feastOn(2026, 2, 16)).toBe('clean_monday')
    expect(feastOn(2026, 4, 5)).toBe('pascha')
    expect(feastOn(2026, 5, 24)).toBe('pentecost')
    expect(getByzantineFeast(on(2026, 11, 18)).isFeast).toBe(false)
  })
})

describe('calendar by Church', () => {
  it('uses the Latin calendar for the Latin Church', () => {
    expect(calendarFor('latin')).toBe('latin')
    expect(getSeasonForChurch('latin', on(2026, 11, 18)).season).toBe('ordinary')
    expect(getFeastForChurch('latin', on(2026, 12, 8)).isFeast).toBe(true)
  })

  it('uses the Byzantine calendar for Byzantine Churches', () => {
    for (const church of ['ukrainian', 'ruthenian', 'melkite', 'romanian']) {
      expect(getSeasonForChurch(church, on(2026, 11, 18)).season).toBe('byz_nativity_fast')
    }
    // No Immaculate Conception on the Byzantine calendar
    expect(getFeastForChurch('melkite', on(2026, 12, 8)).isFeast).toBe(false)
  })

  it('shows no season for traditions without a calendar yet', () => {
    expect(getSeasonForChurch('maronite', on(2026, 11, 18))).toBeNull()
    expect(getSeasonForChurch('syro_malabar', on(2026, 11, 18))).toBeNull()
    expect(getFeastForChurch('chaldean', on(2026, 12, 25)).isFeast).toBe(false)
  })
})
