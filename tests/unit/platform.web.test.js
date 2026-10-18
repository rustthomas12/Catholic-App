import { describe, it, expect } from 'vitest'
import {
  isNative, apiUrl, publicOrigin, authRedirectUrl, deepLinkToPath, parseAuthTokens, APP_ORIGIN,
} from '../../src/lib/platform'

// In jsdom Capacitor reports the 'web' platform — the web app must behave
// exactly as it did before the native work.
describe('platform helpers on the web', () => {
  it('is not native', () => {
    expect(isNative).toBe(false)
  })

  it('keeps API calls relative', () => {
    expect(apiUrl('/api/readings?date=2026-10-12')).toBe('/api/readings?date=2026-10-12')
  })

  it('uses the page origin for public and auth URLs', () => {
    expect(publicOrigin()).toBe(window.location.origin)
    expect(authRedirectUrl('/onboarding')).toBe(`${window.location.origin}/onboarding`)
  })
})

describe('deepLinkToPath', () => {
  it('maps universal links on the app domain', () => {
    expect(deepLinkToPath(`${APP_ORIGIN}/join/ABC123`)).toBe('/join/ABC123')
    expect(deepLinkToPath(`${APP_ORIGIN}/org-admin/9?tab=billing#x`)).toBe('/org-admin/9?tab=billing#x')
  })

  it('maps infold:// links', () => {
    expect(deepLinkToPath('infold://settings')).toBe('/settings')
    expect(deepLinkToPath('infold://org-admin/123?tab=billing&subscribed=true'))
      .toBe('/org-admin/123?tab=billing&subscribed=true')
    expect(deepLinkToPath('infold://onboarding#access_token=a&refresh_token=b'))
      .toBe('/onboarding#access_token=a&refresh_token=b')
    expect(deepLinkToPath('infold://')).toBe('/')
  })

  it('ignores other hosts, API routes and junk', () => {
    expect(deepLinkToPath('https://evil.example.com/settings')).toBeNull()
    expect(deepLinkToPath(`${APP_ORIGIN}/api/delete-account`)).toBeNull()
    expect(deepLinkToPath('not a url')).toBeNull()
    expect(deepLinkToPath('')).toBeNull()
  })
})

describe('parseAuthTokens', () => {
  it('reads Supabase implicit-flow tokens from the fragment', () => {
    expect(parseAuthTokens('infold://reset-password#access_token=AT&refresh_token=RT&type=recovery'))
      .toEqual({ access_token: 'AT', refresh_token: 'RT', type: 'recovery' })
  })

  it('returns null without both tokens', () => {
    expect(parseAuthTokens('infold://onboarding')).toBeNull()
    expect(parseAuthTokens('infold://onboarding#access_token=AT')).toBeNull()
  })
})
