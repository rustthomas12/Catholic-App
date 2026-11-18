import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CHURCHES, TRADITIONS, churchesForFilter, getChurch, isEastern } from '../../src/data/churches'

describe('churches sui iuris', () => {
  it('lists the Latin Church and 23 Eastern Catholic Churches', () => {
    expect(CHURCHES).toHaveLength(24)
    expect(CHURCHES.filter((c) => isEastern(c.id))).toHaveLength(23)
    expect(new Set(CHURCHES.map((c) => c.id)).size).toBe(24)
  })

  it('puts every church in a known tradition', () => {
    const ids = new Set(TRADITIONS.map((t) => t.id))
    for (const c of CHURCHES) expect(ids.has(c.tradition)).toBe(true)
  })

  it('matches the database check constraint in migration 089', () => {
    const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/089_churches_sui_iuris.sql'), 'utf8')
    const list = sql.match(/\$c\$\(([\s\S]*?)\)\$c\$/)[1]
    const inSql = [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort()
    expect(inSql).toEqual(CHURCHES.map((c) => c.id).sort())
  })

  it('resolves directory filters', () => {
    expect(churchesForFilter('')).toBeNull()
    expect(churchesForFilter('latin')).toEqual(['latin'])
    expect(churchesForFilter('eastern')).toHaveLength(23)
    expect(churchesForFilter('byzantine')).toContain('melkite')
    expect(churchesForFilter('byzantine')).not.toContain('maronite')
    expect(churchesForFilter('maronite')).toEqual(['maronite'])
    expect(churchesForFilter('nonsense')).toBeNull()
  })

  it('falls back to Latin for unknown or missing ids', () => {
    expect(getChurch(undefined).id).toBe('latin')
    expect(isEastern('latin')).toBe(false)
    expect(isEastern(null)).toBe(false)
  })
})
