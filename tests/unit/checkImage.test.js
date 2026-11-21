// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { verdictFor } from '../../api/_vision.js'
import { ownsPath } from '../../api/check-image.js'

const safe = (o) => ({ adult: 'VERY_UNLIKELY', violence: 'VERY_UNLIKELY', racy: 'VERY_UNLIKELY', ...o })

describe('verdictFor', () => {
  it('passes ordinary photos and missing results', () => {
    expect(verdictFor(safe({}))).toBe('ok')
    expect(verdictFor(null)).toBe('ok')
  })
  it('blocks likely adult content', () => {
    expect(verdictFor(safe({ adult: 'LIKELY' }))).toBe('blocked')
    expect(verdictFor(safe({ adult: 'VERY_LIKELY' }))).toBe('blocked')
    expect(verdictFor(safe({ adult: 'POSSIBLE' }))).toBe('ok')
  })
  it('only blocks violence and racy content when very likely (religious art)', () => {
    expect(verdictFor(safe({ violence: 'LIKELY' }))).toBe('ok')
    expect(verdictFor(safe({ violence: 'VERY_LIKELY' }))).toBe('blocked')
    expect(verdictFor(safe({ racy: 'LIKELY' }))).toBe('ok')
    expect(verdictFor(safe({ racy: 'VERY_LIKELY' }))).toBe('blocked')
  })
})

describe('ownsPath', () => {
  const uid = '11111111-2222-3333-4444-555555555555'
  it('accepts the caller’s own folder in each bucket', () => {
    expect(ownsPath('posts', `${uid}/1-abc.jpg`, uid)).toBe(true)
    expect(ownsPath('avatars', `${uid}/avatar.jpg`, uid)).toBe(true)
    expect(ownsPath('groups', `group-avatars/${uid}/1.jpg`, uid)).toBe(true)
  })
  it('rejects other users, other buckets and tricks', () => {
    expect(ownsPath('posts', `someone-else/1.jpg`, uid)).toBe(false)
    expect(ownsPath('groups', `${uid}/1.jpg`, uid)).toBe(false)
    expect(ownsPath('documents', `${uid}/1.jpg`, uid)).toBe(false)
    expect(ownsPath('posts', `${uid}/../x/1.jpg`, uid)).toBe(false)
    expect(ownsPath('posts', `${uid}/`, uid)).toBe(false)
    expect(ownsPath('posts', null, uid)).toBe(false)
  })
})
