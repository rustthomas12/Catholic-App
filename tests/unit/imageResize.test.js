// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { fitWithin, shrinkImage } from '../../src/utils/imageResize.js'

describe('fitWithin', () => {
  it('scales the long side down to the max, keeping the ratio', () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
  })
  it('never scales up', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
  it('handles missing dimensions', () => {
    expect(fitWithin(0, 0, 1600)).toEqual({ width: 0, height: 0 })
  })
})

describe('shrinkImage', () => {
  it('returns GIFs and missing files untouched', async () => {
    const gif = { type: 'image/gif', size: 10 }
    expect(await shrinkImage(gif)).toBe(gif)
    expect(await shrinkImage(null)).toBeNull()
  })
})
