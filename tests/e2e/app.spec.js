import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { watchErrors, expectHealthyPage, login } from './helpers'

// Signed-in end-to-end tests. They run against the real Supabase project
// with two dedicated test accounts and clean up everything they create.
//   E2E_EMAIL / E2E_PASSWORD      — main tester
//   E2E_EMAIL_2 / E2E_PASSWORD_2  — second tester (for blocking)
//   SUPABASE_SERVICE_ROLE_KEY     — lookups and cleanup only
const A = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const B = { email: process.env.E2E_EMAIL_2, password: process.env.E2E_PASSWORD_2 }
const admin = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_URL
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null

test.skip(!A.email || !B.email || !admin, 'E2E test accounts not configured')

async function userId(email) {
  const { data } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  if (data) return data.id
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return list.users.find((u) => u.email === email)?.id
}

const ROUTES = [
  '/', '/groups', '/directory', '/faith', '/faith/prayer', '/faith/journal', '/faith/rosary',
  '/faith/hours', '/faith/morning-offering', '/faith/intentions', '/faith/examination',
  '/premium/confession-tracker', '/saints', '/notifications', '/messages', '/organizations',
  '/profile', '/settings', '/settings/profile', '/settings/notifications', '/settings/blocked',
  '/contact',
]

test('every main screen loads without errors', async ({ page }) => {
  const watch = watchErrors(page)
  await login(page, A.email, A.password)
  for (const path of ROUTES) {
    await page.goto(path)
    await page.waitForLoadState('networkidle').catch(() => {})
    await expectHealthyPage(page)
    await expect(page, `redirected away from ${path}`).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}(\\?|$)`))
  }
  watch.assertClean()
})

test('post lifecycle: create, open link, like, comment, delete', async ({ page }) => {
  const watch = watchErrors(page)
  const text = `E2E test post ${Date.now()}`
  await login(page, A.email, A.password)

  await page.goto('/')
  await page.getByRole('button', { name: /share a thought/i }).first().click()
  await page.getByPlaceholder(/share a thought/i).fill(text)
  await page.getByRole('button', { name: 'Post', exact: true }).click()
  await expect(page.getByText(text)).toBeVisible()

  const { data: post } = await admin.from('posts').select('id').eq('content', text).single()

  // Shared link target
  await page.goto(`/post/${post.id}`)
  await expect(page.getByText(text)).toBeVisible()

  await page.getByRole('button', { name: 'Like' }).click()
  await expect(page.getByRole('button', { name: 'Unlike' })).toBeVisible()

  await page.getByRole('button', { name: 'Comments' }).click()
  await page.getByPlaceholder('Write a comment...').fill('E2E comment')
  await page.getByPlaceholder('Write a comment...').press('Enter')
  await expect(page.getByText('E2E comment')).toBeVisible()

  await page.getByRole('button', { name: 'Post options' }).click()
  await page.getByRole('button', { name: /delete post/i }).click()
  await page.getByRole('button', { name: /^delete$/i }).click()
  await expect(page).toHaveURL(/\/$/)

  const { data: after } = await admin.from('posts').select('deleted_at').eq('id', post.id).maybeSingle()
  expect(after === null || after.deleted_at !== null).toBeTruthy()
  watch.assertClean()
})

test('blocking hides a user’s posts; unblocking restores them', async ({ page }) => {
  const watch = watchErrors(page)
  const bId = await userId(B.email)
  const text = `E2E post by second tester ${Date.now()}`
  const { data: post, error } = await admin.from('posts').insert({ author_id: bId, content: text }).select('id').single()
  expect(error).toBeNull()

  try {
    await login(page, A.email, A.password)

    await page.goto(`/post/${post.id}`)
    await expect(page.getByText(text)).toBeVisible()

    // Block from the post menu
    await page.getByRole('button', { name: 'Post options' }).click()
    await page.getByRole('button', { name: /block user/i }).click()
    await page.getByRole('button', { name: /^block$/i }).click()
    await expect(page.getByText(text)).toHaveCount(0)

    // The database now hides it, even on a fresh load
    await page.goto(`/post/${post.id}`)
    await expect(page.getByText("This post isn't available")).toBeVisible()

    // Profile shows the blocked state
    await page.goto(`/profile/${bId}`)
    await expect(page.getByText('You blocked this account. Their posts are hidden.')).toBeVisible()

    // Unblock from Settings
    await page.goto('/settings/blocked')
    await page.getByRole('button', { name: 'Unblock' }).first().click()
    await expect(page.getByText("You haven't blocked anyone.")).toBeVisible()

    await page.goto(`/post/${post.id}`)
    await expect(page.getByText(text)).toBeVisible()
  } finally {
    const aId = await userId(A.email)
    await admin.from('user_blocks').delete().eq('blocker_id', aId)
    await admin.from('posts').delete().eq('id', post.id)
  }
  watch.assertClean()
})
