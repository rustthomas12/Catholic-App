import { test, expect } from '@playwright/test'
import { createRequire } from 'node:module'
import { login } from './helpers'

// Accessibility guard (docs/ACCESSIBILITY_AND_MOBILE_PLAN.md): axe-core on
// each screen, WCAG 2.2 A/AA. Any serious or critical violation fails.
// Public screens always run; signed-in screens run when E2E_EMAIL is set.
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const PUBLIC = ['/login', '/signup', '/forgot-password', '/terms', '/privacy', '/policy']
const SIGNED_IN = [
  '/', '/groups', '/directory', '/faith', '/faith/prayer', '/faith/rosary', '/saints',
  '/notifications', '/messages', '/organizations', '/profile', '/settings',
  '/settings/profile', '/settings/notifications',
]

async function audit(page, path) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.addScriptTag({ path: AXE })
  const violations = await page.evaluate(async (tags) => {
    const res = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] })
    return res.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.html.slice(0, 90)).join(' | ')}`)
  }, TAGS)
  expect(violations, `${path}\n${violations.join('\n')}`).toEqual([])
}

for (const path of PUBLIC) {
  test(`a11y ${path}`, async ({ page }) => { await audit(page, path) })
}

test.describe('signed in', () => {
  test.skip(!process.env.E2E_EMAIL, 'E2E test account not configured')
  for (const path of SIGNED_IN) {
    test(`a11y ${path}`, async ({ page }) => {
      await login(page, process.env.E2E_EMAIL, process.env.E2E_PASSWORD)
      await audit(page, path)
    })
  }
})
