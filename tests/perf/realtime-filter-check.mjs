/**
 * Checks the filtered subscriptions postLive uses really deliver:
 *  - UPDATE with filter id=in.(…)  → like counts reach a viewer of that post
 *  - nothing for a post the viewer isn't watching
 *  - INSERT with filter group_id=in.(…)
 * Uses the accounts from social-load.mjs (run its setup first).
 *   node --env-file=.env.local tests/perf/realtime-filter-check.mjs
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const state = JSON.parse(fs.readFileSync('tests/perf/.social-load-state.json', 'utf8'))
const URL_ = process.env.VITE_SUPABASE_URL, ANON = process.env.VITE_SUPABASE_ANON_KEY
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function client(u) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.setSession({ access_token: u.access_token, refresh_token: u.refresh_token })
  if (error) throw error
  return c
}
const [ua, ub, uc] = state.users
const A = await client(ua), B = await client(ub), C = await client(uc)
const G = state.groupId

const mk = async (txt) => (await A.from('posts').insert({ author_id: ua.id, group_id: G, content: txt }).select('id').single()).data.id
const watched = await mk('[TEST] watched post'), other = await mk('[TEST] other post')

const got = { upd: [], ins: [] }
await new Promise((res) => {
  C.channel('chk_upd').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts', filter: `id=in.(${watched})` }, (p) => got.upd.push(p.new))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `group_id=in.(${G})` }, (p) => got.ins.push(p.new.id))
    .subscribe((s) => { if (s === 'SUBSCRIBED') res() })
})
await sleep(1500)
await B.from('likes').insert({ post_id: watched, user_id: ub.id })
await B.from('likes').insert({ post_id: other, user_id: ub.id })
const fresh = await mk('[TEST] new post while watching')
await sleep(4000)

const updWatched = got.upd.filter((r) => r.id === watched)
const ok = (c, m) => console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`)
ok(updWatched.some((r) => r.like_count === 1), `like on watched post arrives with like_count=1 (got ${JSON.stringify(updWatched.map((r) => r.like_count))})`)
ok(!got.upd.some((r) => r.id === other), 'like on an unwatched post is NOT delivered')
ok(got.ins.includes(fresh), 'new post in my group arrives')
for (const c of [A, B, C]) c.removeAllChannels()
process.exit(0)
