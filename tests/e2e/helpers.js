import { expect } from '@playwright/test'

// Errors that come from the outside world, not from our code
const IGNORED = [
  /favicon/i,
  /Failed to load resource/i, // network 4xx/5xx are asserted separately where it matters
  /workbox/i,
  /service worker/i,
  /\[vite\]/i,
  /Download the React DevTools/i,
]

/**
 * Collects uncaught exceptions and console errors for the page.
 * Call `assertClean()` at the end of a test.
 */
export function watchErrors(page) {
  const errors = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (IGNORED.some((re) => re.test(text))) return
    errors.push(`console: ${text}`)
  })
  return {
    errors,
    assertClean() {
      expect(errors, errors.join('\n')).toEqual([])
    },
  }
}

/** Fails if an error boundary or 404 page is showing. */
export async function expectHealthyPage(page) {
  await expect(page.getByText('Something went wrong')).toHaveCount(0)
  await expect(page.getByText('Page not found')).toHaveCount(0)
}

export async function login(page, email, password) {
  // The "Add to Home Screen" banner is tested separately; keep it out of the way
  await page.addInitScript(() => { try { sessionStorage.setItem('pwa_install_dismissed', '1') } catch { /* ignore */ } })
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
}
