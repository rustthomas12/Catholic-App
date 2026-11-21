// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Push state the banner sees; tests change it to mimic the phone's async check
let push
const subscribe = vi.fn(async () => true)
vi.mock('../../src/hooks/usePushNotifications', () => ({ usePushNotifications: () => push }))
vi.mock('../../src/hooks/useAuth.jsx', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))

const { default: PushPrompt } = await import('../../src/components/shared/PushPrompt.jsx')

let host, root
const render = () => act(() => { root.render(createElement(PushPrompt)) })
const shown = () => host.textContent.includes('Never miss a parish announcement')

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear(); sessionStorage.clear()
  localStorage.setItem('infold-session-count', '5') // past the 3-session wait
  push = { isSupported: true, permission: 'default', isSubscribed: false, isLoading: false, subscribe }
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers() })

describe('PushPrompt', () => {
  it('waits for the permission check before appearing', async () => {
    render()
    expect(shown()).toBe(false)
    await act(async () => { vi.advanceTimersByTime(1600) })
    expect(shown()).toBe(true)
  })

  it('never appears when the check finds notifications already on (the reported bug)', async () => {
    render()                                   // phone starts at 'default'…
    await act(async () => { vi.advanceTimersByTime(500) })
    push = { ...push, permission: 'granted', isSubscribed: true } // …then the check returns
    render()
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(shown()).toBe(false)
  })

  it('hides itself if notifications turn on while it is showing', async () => {
    render()
    await act(async () => { vi.advanceTimersByTime(1600) })
    expect(shown()).toBe(true)
    push = { ...push, permission: 'granted', isSubscribed: true }
    render()
    expect(shown()).toBe(false)
  })

  it('is not offered again after turning notifications on from it', async () => {
    render()
    await act(async () => { vi.advanceTimersByTime(1600) })
    const btn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Turn on notifications'))
    await act(async () => { btn.click() })
    expect(localStorage.getItem('infold-push-dismissed')).toBe('true')
  })
})
