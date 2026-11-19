import { describe, it, expect, vi, beforeEach } from 'vitest'

const insert = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('../../src/lib/supabase', () => ({ supabase: { from: () => ({ insert }) } }))
vi.mock('../../src/lib/platform', () => ({ platform: 'web' }))

const { reportError } = await import('../../src/lib/errorReporting')

describe('error reporting', () => {
  beforeEach(() => insert.mockClear())

  it('sends the page path only, never the query string or hash', () => {
    window.history.pushState({}, '', '/reset-password?code=secret#access_token=abc')
    reportError('error', new Error('Boom one'))
    expect(insert).toHaveBeenCalledTimes(1)
    const row = insert.mock.calls[0][0]
    expect(row.path).toBe('/reset-password')
    expect(JSON.stringify(row)).not.toContain('secret')
    expect(JSON.stringify(row)).not.toContain('access_token')
    expect(row).toMatchObject({ kind: 'error', message: 'Boom one', platform: 'web' })
  })

  it('sends each distinct error once per page load', () => {
    reportError('render', new Error('Boom two'))
    reportError('render', new Error('Boom two'))
    expect(insert).toHaveBeenCalledTimes(1)
  })

  it('ignores errors that are not app bugs', () => {
    reportError('rejection', new TypeError('Failed to fetch'))
    reportError('error', 'ResizeObserver loop completed with undelivered notifications.')
    reportError('error', new Error('Failed to fetch dynamically imported module: /assets/x.js'))
    expect(insert).not.toHaveBeenCalled()
  })

  it('clips long messages and stacks', () => {
    const e = new Error('x'.repeat(2000)); e.stack = 'y'.repeat(10000)
    reportError('error', e)
    const row = insert.mock.calls[0][0]
    expect(row.message.length).toBe(500)
    expect(row.stack.length).toBe(4000)
  })
})
