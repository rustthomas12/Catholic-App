import { describe, it, expect } from 'vitest'
import { applyNativeCors, returnUrl, isNativeRequest } from '../../api/_native.js'
import nativeReturn from '../../api/native-return.js'
import { buildFcmMessage } from '../../api/_fcm.js'

function mockRes() {
  const res = { headers: {}, statusCode: 200, body: undefined, ended: false }
  res.setHeader = (k, v) => { res.headers[k] = v }
  res.status = (c) => { res.statusCode = c; return res }
  res.end = () => { res.ended = true; return res }
  res.send = (b) => { res.body = b; return res }
  res.json = (b) => { res.body = b; return res }
  return res
}

describe('applyNativeCors', () => {
  it('allows the iOS and Android app origins', () => {
    for (const origin of ['capacitor://localhost', 'https://localhost']) {
      const res = mockRes()
      expect(applyNativeCors({ method: 'POST', headers: { origin } }, res)).toBe(false)
      expect(res.headers['Access-Control-Allow-Origin']).toBe(origin)
    }
  })

  it('does not add CORS for other origins', () => {
    const res = mockRes()
    applyNativeCors({ method: 'POST', headers: { origin: 'https://evil.example.com' } }, res)
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined()
  })

  it('answers preflight requests', () => {
    const res = mockRes()
    expect(applyNativeCors({ method: 'OPTIONS', headers: { origin: 'capacitor://localhost' } }, res)).toBe(true)
    expect(res.statusCode).toBe(204)
    expect(res.ended).toBe(true)
  })
})

describe('returnUrl', () => {
  it('is unchanged for web requests', () => {
    expect(returnUrl({ headers: {} }, '/settings')).toBe('https://app.getinfold.app/settings')
  })

  it('uses the bounce page for app requests', () => {
    const req = { headers: { origin: 'capacitor://localhost' } }
    expect(isNativeRequest(req)).toBe(true)
    expect(returnUrl(req, '/org-admin/1?tab=billing'))
      .toBe('https://app.getinfold.app/api/native-return?to=%2Forg-admin%2F1%3Ftab%3Dbilling')
  })
})

describe('native-return page', () => {
  it('redirects to the infold:// scheme', () => {
    const res = mockRes()
    nativeReturn({ query: { to: '/settings' } }, res)
    expect(res.body).toContain('"infold://settings"')
  })

  it('refuses absolute and protocol-relative targets', () => {
    for (const to of ['//evil.example.com', 'https://evil.example.com', 'javascript:alert(1)']) {
      const res = mockRes()
      nativeReturn({ query: { to } }, res)
      expect(res.body).toContain('"infold://"')
      expect(res.body).not.toContain('evil')
      expect(res.body).not.toContain('alert(1)')
    }
  })

  it('cannot break out of the inline script', () => {
    const res = mockRes()
    nativeReturn({ query: { to: '/x</script><script>alert(1)</script>' } }, res)
    expect(res.body).not.toContain('</script><script>alert(1)')
  })
})

describe('buildFcmMessage', () => {
  it('carries the deep-link URL and notification text', () => {
    const msg = buildFcmMessage('tok', {
      title: 'New message', body: 'Hi', url: '/messages', tag: 'direct_message-1700000000000',
    })
    expect(msg.token).toBe('tok')
    expect(msg.notification).toEqual({ title: 'New message', body: 'Hi' })
    expect(msg.data.url).toBe('/messages')
    expect(msg.apns.payload.aps['thread-id']).toBe('direct_message')
  })

  it('defaults the URL to home', () => {
    expect(buildFcmMessage('tok', { title: 't', body: 'b' }).data.url).toBe('/')
  })
})

describe('applyNativeCors for public cached data', () => {
  it('always allows any origin so CDN-cached copies work in the apps', () => {
    for (const origin of [undefined, 'https://app.getinfold.app', 'capacitor://localhost']) {
      const res = mockRes()
      applyNativeCors({ method: 'GET', headers: { origin } }, res, { publicData: true })
      expect(res.headers['Access-Control-Allow-Origin']).toBe('*')
    }
  })
})
