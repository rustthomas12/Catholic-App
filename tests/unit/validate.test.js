import { describe, it, expect } from 'vitest'
import { checkEmail, checkUrl, safeImageUrl } from '../../src/utils/validate'

describe('checkEmail', () => {
  it('accepts normal addresses and empty', () => {
    expect(checkEmail('office@stmary.org').error).toBeNull()
    expect(checkEmail('  ').value).toBeNull()
  })
  it.each(['not-an-email', 'a@b', 'a b@c.org', '@stmary.org'])('rejects %s', (v) => {
    expect(checkEmail(v).error).toBeTruthy()
  })
})

describe('checkUrl', () => {
  it('adds https:// to bare domains', () => {
    expect(checkUrl('example.org').value).toBe('https://example.org/')
  })
  it('keeps http/https', () => {
    expect(checkUrl('http://example.org/x').error).toBeNull()
  })
  it.each(['javascript:alert(1)', 'data:text/html,hi', 'ftp://x.org', 'notadomain'])('rejects %s', (v) => {
    expect(checkUrl(v).error).toBeTruthy()
  })
})

describe('safeImageUrl', () => {
  it('allows https only', () => {
    expect(safeImageUrl('https://cdn.example.org/logo.png')).toBeTruthy()
    expect(safeImageUrl('http://cdn.example.org/logo.png')).toBeNull()
    expect(safeImageUrl('javascript:alert(1)')).toBeNull()
    expect(safeImageUrl(null)).toBeNull()
  })
})
