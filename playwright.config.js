import { defineConfig, devices } from '@playwright/test'

// End-to-end tests: drive the real app in a phone-sized browser.
//   npm run test:e2e
// Logged-in tests need test accounts (see tests/e2e/README.md):
//   E2E_EMAIL, E2E_PASSWORD, E2E_EMAIL_2, E2E_PASSWORD_2
// /api calls are proxied to the deployed app unless API_PROXY_TARGET is set.
const PORT = 5179

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 15'], browserName: 'chromium' } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: true,
    env: {
      API_PROXY_TARGET: process.env.API_PROXY_TARGET || 'https://app.getcommunio.app',
    },
  },
})
