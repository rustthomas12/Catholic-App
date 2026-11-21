import { describe, it, expect, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}))

const { isAndroid, isIOS, canPurchaseInApp } = await import('../../src/lib/platform')

// Google Play Payments policy: plans are sold on the website only
describe('platform helpers inside the Android app', () => {
  it('detects Android and hides plan purchases', () => {
    expect(isAndroid).toBe(true)
    expect(isIOS).toBe(false)
    expect(canPurchaseInApp).toBe(false)
  })
})
