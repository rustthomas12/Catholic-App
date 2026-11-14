/**
 * Creates (or tops up) the App Review demo account so Apple and Google
 * reviewers sign in to an app with something in it.
 *
 *   node --env-file=.env.local scripts/seed-review-account.mjs
 *
 * - appreview@getinfold.app, email confirmed, NO password: set one with
 *   "Forgot password" on the login screen (mail reaches the getinfold.app
 *   catch-all), then put it in App Store Connect / Play Console.
 * - Follows St. Paul the Apostle (Warren, MA) and sets it as home parish.
 * - Creates a public parish group it runs, and three posts of its own
 *   (parish post, prayer request, group post).
 * Safe to re-run: existing rows are reused, nothing is duplicated.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)')
  process.exit(1)
}
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const EMAIL = 'appreview@getinfold.app'
const PARISH_ID = 'cf0d02e6-1e04-4204-8f87-13fdc21a2faf' // St. Paul the Apostle, Warren MA
const GROUP_NAME = 'Daily Rosary Circle'

function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

async function findUser() {
  for (let page = 1; page < 50; page++) {
    const { users } = must(await db.auth.admin.listUsers({ page, perPage: 200 }), 'list users')
    const hit = users.find((u) => u.email?.toLowerCase() === EMAIL)
    if (hit) return hit
    if (users.length < 200) return null
  }
  return null
}

let user = await findUser()
if (!user) {
  user = must(await db.auth.admin.createUser({
    email: EMAIL,
    email_confirm: true,
    user_metadata: { full_name: 'App Review', username: 'appreview' },
  }), 'create user').user
  console.log('created', EMAIL)
} else {
  console.log('exists', EMAIL)
}
const uid = user.id

// Profile (the signup trigger may already have made the row)
must(await db.from('profiles').upsert({
  id: uid,
  full_name: 'App Review',
  username: 'appreview',
  bio: 'Demo account for app review.',
  parish_id: PARISH_ID,
  onboarding_completed: true,
}), 'profile')

// Follow the parish
const follow = must(await db.from('parish_follows').select('id').eq('user_id', uid).eq('parish_id', PARISH_ID), 'follow lookup')
if (!follow.length) must(await db.from('parish_follows').insert({ user_id: uid, parish_id: PARISH_ID }), 'follow')

// Group it runs
let group = must(await db.from('groups').select('id').eq('creator_id', uid).eq('name', GROUP_NAME), 'group lookup')[0]
if (!group) {
  group = must(await db.from('groups').insert({
    name: GROUP_NAME,
    description: 'Praying the Rosary together, one decade at a time. Share intentions and join in whenever you can.',
    category: 'interest',
    parish_id: PARISH_ID,
    creator_id: uid,
    is_private: false,
  }).select('id').single(), 'group')
}
const member = must(await db.from('group_members').select('id').eq('group_id', group.id).eq('user_id', uid), 'member lookup')
if (!member.length) must(await db.from('group_members').insert({ group_id: group.id, user_id: uid, role: 'admin' }), 'member')

// Posts
const POSTS = [
  { content: 'Grateful for this parish community. The new Rosary group meets online all week. Everyone is welcome to join!', parish_id: PARISH_ID },
  { content: 'Please pray for my grandmother, who is recovering from surgery this week. Thank you!', parish_id: PARISH_ID, is_prayer_request: true },
  { content: "This Friday we'll pray the Sorrowful Mysteries together. Post your intentions below and we'll include them.", group_id: group.id },
]
const existing = must(await db.from('posts').select('content').eq('author_id', uid).is('deleted_at', null), 'post lookup')
for (const p of POSTS) {
  if (existing.some((e) => e.content === p.content)) continue
  must(await db.from('posts').insert({ author_id: uid, ...p }), 'post')
}

console.log('done: user', uid, '· group', group.id)
