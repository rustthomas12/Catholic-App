import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const rpc = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('../../src/lib/supabase', () => ({ supabase: { rpc: (...a) => rpc(...a) } }))

const { markPostSeen, resetPostSeen } = await import('../../src/lib/postSeen')

describe('postSeen', () => {
  beforeEach(() => { vi.useFakeTimers(); rpc.mockClear(); resetPostSeen() })
  afterEach(() => vi.useRealTimers())

  it('batches ids into one mark_posts_seen call', () => {
    markPostSeen('a'); markPostSeen('b')
    expect(rpc).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('mark_posts_seen', { p_post_ids: ['a', 'b'] })
  })

  it('sends each id once per session', () => {
    markPostSeen('a'); vi.advanceTimersByTime(1000)
    markPostSeen('a'); vi.advanceTimersByTime(1000)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('retries an id after a failed batch', async () => {
    rpc.mockReturnValueOnce(Promise.resolve({ error: { message: 'x' } }))
    markPostSeen('a'); vi.advanceTimersByTime(1000)
    await Promise.resolve(); await Promise.resolve()
    markPostSeen('a'); vi.advanceTimersByTime(1000)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('starts fresh after sign-out', () => {
    markPostSeen('a'); vi.advanceTimersByTime(1000)
    resetPostSeen()
    markPostSeen('a'); vi.advanceTimersByTime(1000)
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})
