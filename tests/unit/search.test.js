// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { fuzzyIlike, containsIlike } from '../../src/utils/search'

describe('search patterns used inside PostgREST or() filters', () => {
  it('fuzzyIlike tolerates punctuation between words', () => {
    expect(fuzzyIlike('Saint Joseph')).toBe('%St%Joseph%')
    expect(fuzzyIlike('Mary, Mother (of God)')).toBe('%Mary%Mother%of%God%')
  })

  it('containsIlike strips characters that would end or add a condition', () => {
    const p = containsIlike('a,b),is_admin.eq.true')
    expect(p).not.toMatch(/[,()]/)
    expect(p).toBe('%a b is_admin.eq.true%')
  })

  it('containsIlike keeps ordinary text', () => {
    expect(containsIlike('  North Brookfield ')).toBe('%North Brookfield%')
    expect(containsIlike('01535')).toBe('%01535%')
  })

  it('containsIlike removes wildcards and quotes', () => {
    expect(containsIlike(`50% "off"*`)).toBe('%50 off%')
  })
})
