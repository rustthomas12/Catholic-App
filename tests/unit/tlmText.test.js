// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { cleanTlmSection } from '../../src/utils/tlmText.js'

describe('cleanTlmSection', () => {
  it('splits heading, starred citation and passage', () => {
    const out = cleanTlmSection({
      reference: null,
      text: 'Continuation ☩ of the Holy Gospel according to Luke\n*Luke 12:32-34*\nAt that time, Jesus said to His disciples...',
    })
    expect(out.intro).toBe('Continuation ☩ of the Holy Gospel according to Luke')
    expect(out.reference).toBe('Luke 12:32-34')
    expect(out.text).toBe('At that time, Jesus said to His disciples...')
  })

  it('keeps inner citations as plain lines without asterisks', () => {
    const out = cleanTlmSection({
      reference: null,
      text: '*Ps 36:30-31*\nThe mouth of the just tells of wisdom.\n*Ps 111:1*\nHappy the man who fears the Lord.',
    })
    expect(out.intro).toBeNull()
    expect(out.reference).toBe('Ps 36:30-31')
    expect(out.text).toBe('The mouth of the just tells of wisdom.\nPs 111:1\nHappy the man who fears the Lord.')
    expect(out.text).not.toContain('*')
  })

  it('leaves a provided reference and missing text alone', () => {
    expect(cleanTlmSection({ reference: 'Mt 5:1', text: '*Mt 5:1-12*\nBlessed are...' }).reference).toBe('Mt 5:1')
    expect(cleanTlmSection(null)).toBeNull()
    expect(cleanTlmSection({ reference: 'x', text: '' })).toEqual({ reference: 'x', text: '' })
  })
})
