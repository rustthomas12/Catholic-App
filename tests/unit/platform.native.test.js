import { describe, it, expect, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
}))

const { isNative, isIOS, apiUrl, publicOrigin, authRedirectUrl, APP_ORIGIN } =
  await import('../../src/lib/platform')

describe('platform helpers inside the iOS / Android app', () => {
  it('detects the native platform', () => {
    expect(isNative).toBe(true)
    expect(isIOS).toBe(true)
  })

  it('sends API calls to the hosted app', () => {
    expect(APP_ORIGIN).toBe('https://app.getinfold.app')
    expect(apiUrl('/api/delete-account')).toBe(`${APP_ORIGIN}/api/delete-account`)
  })

  it('never leaks the local capacitor:// origin into shared links', () => {
    expect(publicOrigin()).toBe(APP_ORIGIN)
  })

  it('routes auth emails through the native bounce page', () => {
    expect(authRedirectUrl('/reset-password'))
      .toBe(`${APP_ORIGIN}/api/native-return?to=%2Freset-password`)
  })
})
