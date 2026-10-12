import { test, expect } from '@playwright/test'
import { watchErrors, expectHealthyPage } from './helpers'

// Screens a signed-out visitor can reach
const PUBLIC_PAGES = [
  ['/login', /sign in|log in|welcome/i],
  ['/signup', /create|sign up|join/i],
  ['/forgot-password', /reset|forgot/i],
  ['/terms', /terms/i],
  ['/privacy', /privacy/i],
  ['/policy', /policy|community/i],
  ['/delete-account', /delete your communio account/i],
]

for (const [path, heading] of PUBLIC_PAGES) {
  test(`public page ${path} renders without errors`, async ({ page }) => {
    const watch = watchErrors(page)
    await page.goto(path)
    await expect(page.locator('body')).toContainText(heading)
    await expectHealthyPage(page)
    watch.assertClean()
  })
}

test('protected screens send signed-out visitors to login', async ({ page }) => {
  for (const path of ['/', '/groups', '/faith', '/messages', '/settings', '/post/00000000-0000-0000-0000-000000000000']) {
    await page.goto(path)
    await page.waitForURL(/\/login/)
  }
})

test('old Support the Mission links no longer show a gift page', async ({ page }) => {
  await page.goto('/premium')
  await page.waitForURL((url) => url.pathname !== '/premium')
  await expect(page.locator('body')).not.toContainText(/make a gift/i)
})

test('unknown routes show the 404 page', async ({ page }) => {
  await page.goto('/definitely-not-a-page')
  await expect(page.getByText('Page not found')).toBeVisible()
})

test('login shows an error for wrong credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('nobody@parishapp.dev')
  await page.getByPlaceholder('••••••••').fill('wrong-password-123')
  await page.locator('button[type="submit"]').click()
  await expect(page.locator('body')).toContainText(/incorrect|invalid|wrong|error/i)
  await expect(page).toHaveURL(/\/login/)
})

test('universal / app link files are served as JSON', async ({ request }) => {
  const aasa = await request.get('/.well-known/apple-app-site-association')
  expect(aasa.ok()).toBeTruthy()
  expect((await aasa.json()).applinks.details[0].appIDs[0]).toMatch(/\.app\.getcommunio$/)
  const assetlinks = await request.get('/.well-known/assetlinks.json')
  expect((await assetlinks.json())[0].target.package_name).toBe('app.getcommunio')
})
