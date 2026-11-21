import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/lib/supabase', () => ({ supabase: {} }))
const { postImagePath } = await import('../../src/utils/storage.js')

describe('postImagePath', () => {
  it('gets the storage path from a post photo URL', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/posts/ae2b1f74-43f5/1795292452052-gatrz5.png'
    expect(postImagePath(url)).toBe('ae2b1f74-43f5/1795292452052-gatrz5.png')
  })

  it('ignores a query string and decodes the path', () => {
    expect(postImagePath('https://x/storage/v1/object/public/posts/u1/a%20b.jpg?t=1')).toBe('u1/a b.jpg')
  })

  it('returns null for no photo or another bucket', () => {
    expect(postImagePath(null)).toBe(null)
    expect(postImagePath('')).toBe(null)
    expect(postImagePath('https://x/storage/v1/object/public/avatars/u1/me.png')).toBe(null)
  })
})
