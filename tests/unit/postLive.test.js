// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Fake Realtime: records channels, their bindings and removals
const channels = []
const removed = new Set()
function fakeChannel(name) {
  const ch = {
    name, bindings: [], subscribed: false, onStatus: null,
    on(type, opts, cb) { ch.bindings.push({ ...opts, cb }); return ch },
    subscribe(cb) { ch.subscribed = true; ch.onStatus = cb; return ch },
    fire(event, payload) { for (const b of ch.bindings) if (b.event === event) b.cb(payload) },
  }
  channels.push(ch)
  return ch
}
vi.mock('../../src/lib/supabase', () => ({
  supabase: { channel: (n) => fakeChannel(n), removeChannel: (c) => removed.add(c) },
}))

let live
const live_ = () => channels.filter((c) => c.subscribed && !removed.has(c))
const updateFilters = () => live_().flatMap((c) => c.bindings.filter((b) => b.event === 'UPDATE').map((b) => b.filter))
const insertFilters = () => live_().flatMap((c) => c.bindings.filter((b) => b.event === 'INSERT').map((b) => b.filter))
const idsIn = (f) => f.slice(f.indexOf('(') + 1, -1).split(',')
const tick = async (ms = 300) => { await vi.advanceTimersByTimeAsync(ms) }

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()
  channels.length = 0
  removed.clear()
  live = await import('../../src/lib/postLive.js')
})
afterEach(() => vi.useRealTimers())

describe('postLive filtered subscriptions', () => {
  it('only subscribes to the posts being watched', async () => {
    live.watchPost('p1', () => {})
    live.watchPost('p2', () => {})
    await tick()
    expect(updateFilters()).toEqual(['id=in.(p1,p2)'])
  })

  it('splits watched posts into groups of at most 100', async () => {
    for (let i = 0; i < 250; i++) live.watchPost(`p${i}`, () => {})
    await tick()
    const f = updateFilters()
    expect(f.map((x) => idsIn(x).length)).toEqual([100, 100, 50])
    expect(new Set(f.flatMap(idsIn)).size).toBe(250)
  })

  it('keeps the old channel until the rebuilt one is subscribed', async () => {
    live.watchPost('p1', () => {})
    await tick()
    const first = live_().find((c) => c.bindings.some((b) => b.event === 'UPDATE'))
    live.watchPost('p2', () => {})
    await tick()
    expect(removed.has(first)).toBe(false) // new one not confirmed yet
    const next = channels.find((c) => c !== first && c.bindings.some((b) => b.filter === 'id=in.(p1,p2)'))
    next.onStatus('SUBSCRIBED')
    expect(removed.has(first)).toBe(true)
  })

  it('delivers updates and deletes to the right listener', async () => {
    const a = vi.fn(), b = vi.fn()
    live.watchPost('p1', a)
    live.watchPost('p2', b)
    await tick()
    const upd = live_().find((c) => c.bindings.some((x) => x.event === 'UPDATE'))
    upd.fire('UPDATE', { new: { id: 'p1', like_count: 3 } })
    expect(a).toHaveBeenCalledWith({ id: 'p1', like_count: 3 })
    expect(b).not.toHaveBeenCalled()
    const del = live_().find((c) => c.bindings.some((x) => x.event === 'DELETE'))
    del.fire('DELETE', { old: { id: 'p2' } })
    expect(b).toHaveBeenCalledWith(null)
  })

  it('filters new posts by the union of every feed scope', async () => {
    const cb = vi.fn()
    live.watchNewPosts(cb, { parishIds: ['par1'], groupIds: ['g1'] })
    live.watchNewPosts(() => {}, { groupIds: ['g2'], orgIds: ['o1'] })
    await tick()
    expect(insertFilters().sort()).toEqual(['group_id=in.(g1,g2)', 'org_id=in.(o1)', 'parish_id=in.(par1)'])
    live_().find((c) => c.bindings.some((x) => x.event === 'INSERT')).fire('INSERT', { new: { id: 'n1', group_id: 'g1' } })
    expect(cb).toHaveBeenCalledWith({ id: 'n1', group_id: 'g1' })
  })

  it('never listens to all posts when a feed has no communities', async () => {
    live.watchNewPosts(() => {}, { parishIds: [], groupIds: [] })
    await tick()
    expect(insertFilters()).toEqual([])
    expect(live_().flatMap((c) => c.bindings).filter((b) => b.event !== 'DELETE' && !b.filter)).toEqual([])
  })

  it('closes everything 5 s after the last listener leaves', async () => {
    const stopA = live.watchPost('p1', () => {})
    const stopB = live.watchNewPosts(() => {}, { groupIds: ['g1'] })
    await tick()
    stopA(); stopB()
    await tick(4000)
    expect(live_().length).toBeGreaterThan(0)
    await tick(1500)
    expect(live_().length).toBe(0)
  })
})
