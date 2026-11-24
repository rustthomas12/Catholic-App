import { describe, it, expect } from 'vitest'
import { adorationSlots, formatClock, normalizeEnd, validWindow } from '../../src/utils/adoration'

describe('adorationSlots', () => {
  it('splits a window into hourly slots', () => {
    const s = adorationSlots({ start_time: '09:00:00', end_time: '12:00:00', slot_minutes: 60 })
    expect(s.map(x => [x.index, x.start, x.end])).toEqual([[0, '09:00', '10:00'], [1, '10:00', '11:00'], [2, '11:00', '12:00']])
  })
  it('shortens a final partial slot', () => {
    const s = adorationSlots({ start_time: '09:00', end_time: '10:45', slot_minutes: 30 })
    expect(s.at(-1)).toEqual({ index: 3, start: '10:30', end: '10:45' })
    expect(s).toHaveLength(4)
  })
  it('runs until midnight', () => {
    const s = adorationSlots({ start_time: '00:00', end_time: '24:00:00', slot_minutes: 60 })
    expect(s).toHaveLength(24)
    expect(s.at(-1).end).toBe('24:00')
  })
})

describe('formatClock', () => {
  it('formats 12-hour times', () => {
    expect(formatClock('00:00')).toBe('12:00 AM')
    expect(formatClock('09:05:00')).toBe('9:05 AM')
    expect(formatClock('12:00')).toBe('12:00 PM')
    expect(formatClock('13:30')).toBe('1:30 PM')
    expect(formatClock('24:00')).toBe('12:00 AM')
  })
})

describe('window helpers', () => {
  it('treats an end of midnight as the end of the day', () => {
    expect(normalizeEnd('00:00')).toBe('24:00')
    expect(validWindow('21:00', '00:00')).toBe(true)
    expect(validWindow('10:00', '09:00')).toBe(false)
    expect(validWindow('10:00', '')).toBe(false)
  })
})
