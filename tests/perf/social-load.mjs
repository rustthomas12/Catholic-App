/**
 * Social load + function test against the live Supabase project, walled off
 * inside one PRIVATE group that only the test accounts belong to.
 *
 *   node --env-file=.env.local tests/perf/social-load.mjs setup   [count=25]
 *   node --env-file=.env.local tests/perf/social-load.mjs check            (function sweep)
 *   node --env-file=.env.local tests/perf/social-load.mjs load    [stage…] (simultaneous load)
 *   node --env-file=.env.local tests/perf/social-load.mjs verify           (count integrity)
 *   node --env-file=.env.local tests/perf/social-load.mjs cleanup          (deletes everything)
 *
 * - Accounts loadtest01..NN@getinfold.app are created with the admin API,
 *   email pre-confirmed: no emails are sent and no passwords exist. Each one
 *   signs in with a one-time magic-link token (admin generateLink → verifyOtp).
 * - Every write goes through the anon key + the test user's own session, so
 *   RLS, triggers and filters run exactly as they do for the app.
 * - The last account is deliberately NOT in the group (privacy checks).
 * - State (ids, sessions) lives in STATE_FILE so cleanup always knows what to delete.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { performance } from 'node:perf_hooks'

const URL_ = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERVICE) { console.error('need VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const UNFILTERED = process.env.UNFILTERED === '1'
const STATE_FILE = process.env.STATE_FILE || 'tests/perf/.social-load-state.json'
const PREFIX = 'loadtest'
const DOMAIN = 'getinfold.app'
const GROUP_NAME = '[TEST] Load test (private)'

const admin = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const loadState = () => (fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { users: [] })
const saveState = (s) => fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))
function must({ data, error }, what) { if (error) throw new Error(`${what}: ${error.message}`); return data }

// ── sessions ───────────────────────────────────────────────────────────────
function userClient() {
  return createClient(URL_, ANON, { auth: { autoRefreshToken: true, persistSession: false }, realtime: { params: { eventsPerSecond: 50 } } })
}
async function signIn(u) {
  const c = userClient()
  if (u.refresh_token) {
    const { data, error } = await c.auth.setSession({ access_token: u.access_token, refresh_token: u.refresh_token })
    if (!error && data.session) { u.access_token = data.session.access_token; u.refresh_token = data.session.refresh_token; return c }
  }
  const link = must(await admin.auth.admin.generateLink({ type: 'magiclink', email: u.email }), `link ${u.email}`)
  const { data, error } = await c.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  if (error) throw new Error(`verify ${u.email}: ${error.message}`)
  u.access_token = data.session.access_token; u.refresh_token = data.session.refresh_token
  return c
}
async function signInAll(state) {
  const clients = []
  for (const u of state.users) { clients.push(await signIn(u)); await sleep(150) }
  saveState(state)
  return clients
}

// ── setup ──────────────────────────────────────────────────────────────────
async function setup(count) {
  const state = loadState()
  const existing = new Map(state.users.map((u) => [u.email, u]))
  for (let i = 1; i <= count; i++) {
    const n = String(i).padStart(2, '0')
    const email = `${PREFIX}${n}@${DOMAIN}`
    if (existing.has(email)) continue
    const { user } = must(await admin.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { full_name: `[TEST] Load ${n}`, username: `${PREFIX}${n}` },
    }), `create ${email}`)
    must(await admin.from('profiles').upsert({ id: user.id, full_name: `[TEST] Load ${n}`, username: `${PREFIX}${n}`, onboarding_completed: true }), 'profile')
    state.users.push({ email, id: user.id, n })
    saveState(state)
    process.stdout.write(`created ${email}\n`)
  }
  state.users.sort((a, b) => a.n.localeCompare(b.n))
  const owner = state.users[0]
  if (!state.groupId) {
    const g = must(await admin.from('groups').insert({
      name: GROUP_NAME, description: 'Automated load test. Deleted after the run.', category: 'other',
      creator_id: owner.id, is_private: true,
    }).select('id').single(), 'group')
    state.groupId = g.id
    saveState(state)
  }
  const members = state.users.slice(0, -1) // last user stays OUTSIDE (privacy checks)
  const have = new Set(must(await admin.from('group_members').select('user_id').eq('group_id', state.groupId), 'members').map((m) => m.user_id))
  const rows = members.filter((u) => !have.has(u.id)).map((u) => ({ group_id: state.groupId, user_id: u.id, role: u === owner ? 'admin' : 'member' }))
  if (rows.length) must(await admin.from('group_members').insert(rows), 'add members')
  saveState(state)
  console.log(`setup done: ${state.users.length} users, group ${state.groupId}, ${members.length} members, outsider ${state.users.at(-1).email}`)
}

// ── function sweep ─────────────────────────────────────────────────────────
async function check() {
  const state = loadState()
  const cs = await signInAll(state)
  const U = state.users, G = state.groupId
  const [A, B, C] = [cs[0], cs[1], cs[2]], OUT = cs.at(-1)
  const results = []
  const t = async (name, fn) => {
    const s = performance.now()
    try { const note = await fn(); results.push({ name, ok: true, ms: Math.round(performance.now() - s), note: note || '' }) }
    catch (e) { results.push({ name, ok: false, ms: Math.round(performance.now() - s), note: e.message }) }
  }
  const expectErr = async (p, what) => { const { data, error } = await p; if (!error && (!data || (Array.isArray(data) && data.length))) throw new Error(`${what} was allowed`); return error ? `blocked (${error.code || error.message.slice(0, 40)})` : 'no rows changed' }
  const counts = async (id) => must(await admin.from('posts').select('like_count, comment_count').eq('id', id).single(), 'counts')

  let post, prayer, comment
  await t('post in private group', async () => {
    post = must(await A.from('posts').insert({ author_id: U[0].id, group_id: G, content: '[TEST] Function sweep post' }).select('id').single(), 'insert')
  })
  await t('post as someone else is refused', () => expectErr(A.from('posts').insert({ author_id: U[1].id, group_id: G, content: '[TEST] spoof' }).select('id'), 'spoofed author'))
  await t('outsider cannot post in private group', () => expectErr(OUT.from('posts').insert({ author_id: U.at(-1).id, group_id: G, content: '[TEST] outsider' }).select('id'), 'outsider post'))
  await t('member sees post', async () => { const r = must(await B.from('posts').select('id').eq('id', post.id), 'read'); if (r.length !== 1) throw new Error('not visible') })
  await t('outsider cannot see private group post', async () => { const r = must(await OUT.from('posts').select('id').eq('id', post.id), 'read'); if (r.length) throw new Error('LEAK: outsider sees it') })
  await t('like + like_count trigger', async () => {
    must(await B.from('likes').insert({ post_id: post.id, user_id: U[1].id }), 'like B')
    must(await C.from('likes').insert({ post_id: post.id, user_id: U[2].id }), 'like C')
    const c = await counts(post.id); if (c.like_count !== 2) throw new Error(`like_count ${c.like_count}, want 2`)
  })
  await t('double like rejected', () => expectErr(B.from('likes').insert({ post_id: post.id, user_id: U[1].id }).select('id'), 'double like'))
  await t('like as someone else refused', () => expectErr(B.from('likes').insert({ post_id: post.id, user_id: U[3].id }).select('id'), 'spoofed like'))
  await t('unlike + count drops', async () => {
    must(await C.from('likes').delete().eq('post_id', post.id).eq('user_id', U[2].id), 'unlike')
    const c = await counts(post.id); if (c.like_count !== 1) throw new Error(`like_count ${c.like_count}, want 1`)
  })
  await t('like notification (as app does)', async () => {
    must(await B.from('notifications').insert({ user_id: U[0].id, type: 'like', reference_id: post.id, message: '[TEST] Load 02 liked your post', actor_id: U[1].id, is_read: false }), 'notify')
    const r = must(await A.from('notifications').select('id').eq('reference_id', post.id).eq('type', 'like'), 'read notif'); if (!r.length) throw new Error('recipient sees none')
  })
  await t('comment + comment_count trigger', async () => {
    comment = must(await B.from('comments').insert({ post_id: post.id, author_id: U[1].id, content: '[TEST] first comment' }).select('id').single(), 'comment')
    must(await C.from('comments').insert({ post_id: post.id, author_id: U[2].id, content: '[TEST] second comment' }), 'comment 2')
    const c = await counts(post.id); if (c.comment_count !== 2) throw new Error(`comment_count ${c.comment_count}, want 2`)
  })
  await t('comment over 500 chars rejected', () => expectErr(B.from('comments').insert({ post_id: post.id, author_id: U[1].id, content: 'x'.repeat(501) }).select('id'), 'long comment'))
  await t('outsider cannot comment', () => expectErr(OUT.from('comments').insert({ post_id: post.id, author_id: U.at(-1).id, content: '[TEST] outsider comment' }).select('id'), 'outsider comment'))
  await t('edit own comment', async () => { const r = must(await B.from('comments').update({ content: '[TEST] first comment (edited)' }).eq('id', comment.id).select('id'), 'edit'); if (r.length !== 1) throw new Error('not updated') })
  await t("cannot edit someone else's comment", () => expectErr(C.from('comments').update({ content: '[TEST] hijack' }).eq('id', comment.id).select('id'), 'edit other comment'))
  await t('edit own post', async () => { const r = must(await A.from('posts').update({ content: '[TEST] Function sweep post (edited)' }).eq('id', post.id).select('id'), 'edit'); if (r.length !== 1) throw new Error('not updated') })
  await t("cannot edit someone else's post", () => expectErr(B.from('posts').update({ content: '[TEST] hijack' }).eq('id', post.id).select('id'), 'edit other post'))
  await t('cannot fake like_count', async () => { await A.from('posts').update({ like_count: 9999 }).eq('id', post.id); const c = await counts(post.id); if (c.like_count === 9999) throw new Error('author rewrote like_count') ; return `still ${c.like_count}` })
  await t('prayer request post', async () => { prayer = must(await C.from('posts').insert({ author_id: U[2].id, group_id: G, content: '[TEST] Please pray for the load test', is_prayer_request: true }).select('id').single(), 'prayer') })
  await t('group chat message', async () => {
    must(await B.from('group_chat_messages').insert({ group_id: G, user_id: U[1].id, content: '[TEST] chat hello' }), 'chat')
    const r = must(await A.from('group_chat_messages').select('id').eq('group_id', G), 'read chat'); if (!r.length) throw new Error('member cannot read chat')
  })
  await t('outsider cannot read group chat', async () => { const r = must(await OUT.from('group_chat_messages').select('id').eq('group_id', G), 'read'); if (r.length) throw new Error('LEAK: outsider reads chat') })
  await t('direct message both ways', async () => {
    must(await A.from('direct_messages').insert({ sender_id: U[0].id, recipient_id: U[1].id, content: '[TEST] hi B' }), 'dm A→B')
    must(await B.from('direct_messages').insert({ sender_id: U[1].id, recipient_id: U[0].id, content: '[TEST] hi A' }), 'dm B→A')
    const r = must(await B.from('direct_messages').select('id').or(`sender_id.eq.${U[0].id},recipient_id.eq.${U[0].id}`), 'read'); if (r.length < 2) throw new Error(`B sees ${r.length}`)
  })
  await t('third party cannot read DMs', async () => { const r = must(await C.from('direct_messages').select('id').or(`sender_id.eq.${U[0].id},recipient_id.eq.${U[0].id}`), 'read'); if (r.length) throw new Error('LEAK: C reads A↔B DMs') })
  await t('group feed query (as app)', async () => {
    const r = must(await B.from('posts').select('*, author:profiles!author_id(id, full_name), group:groups!group_id(id, name), likes(user_id)').eq('likes.user_id', U[1].id).eq('group_id', G).is('deleted_at', null).eq('is_removed', false).order('created_at', { ascending: false }).range(0, 19), 'feed')
    if (r.length < 2) throw new Error(`feed has ${r.length}`)
    return `${r.length} posts`
  })
  await t("cannot delete someone else's post", async () => { await B.from('posts').delete().eq('id', prayer.id); const r = must(await admin.from('posts').select('id, deleted_at').eq('id', prayer.id), 'look'); if (!r.length || r[0].deleted_at) throw new Error('B deleted C\'s post') })
  await t('delete own comment', async () => {
    const del = await B.from('comments').delete().eq('id', comment.id).select('id')
    if (del.error || !del.data?.length) { const up = must(await B.from('comments').update({ is_removed: true }).eq('id', comment.id).select('id'), 'soft delete'); if (!up.length) throw new Error('could not delete'); }
    const c = await counts(post.id); if (c.comment_count !== 1) throw new Error(`comment_count ${c.comment_count}, want 1`)
  })

  for (const c of cs) c.removeAllChannels()
  const w = Math.max(...results.map((r) => r.name.length))
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(w)}  ${String(r.ms).padStart(5)}ms  ${r.note}`)
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`)
}

// ── load ───────────────────────────────────────────────────────────────────
const LAT = {}
const ERR = {}
function rec(op, ms, error) {
  ;(LAT[op] ||= []).push(ms)
  if (error) { const k = `${op}: ${error.code || ''} ${String(error.message || error).slice(0, 70)}`; ERR[k] = (ERR[k] || 0) + 1 }
}
async function timed(op, p) { const s = performance.now(); let r; try { r = await p } catch (e) { r = { error: e } } rec(op, performance.now() - s, r.error); return r }
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]) }

const PHRASES = ['Praying for everyone today.', 'Beautiful Mass this morning!', 'Who is going to adoration tonight?', 'Thank you all for the prayers.', 'Rosary at 7pm, all welcome.', 'Saint of the day is inspiring.', 'Bible study notes are up.', 'Grateful for this community.']

async function runStage({ users, seconds, think }, ctx) {
  const { clients, state, posts } = ctx
  const until = Date.now() + seconds * 1000
  let ops = 0
  const actor = async (i) => {
    const c = clients[i], me = state.users[i]
    while (Date.now() < until) {
      const r = Math.random()
      if (r < 0.30) {
        const res = await timed('feed', c.from('posts').select('*, author:profiles!author_id(id, full_name, avatar_url), group:groups!group_id(id, name), likes(user_id)')
          .eq('likes.user_id', me.id).eq('group_id', state.groupId).is('deleted_at', null).eq('is_removed', false).order('created_at', { ascending: false }).range(0, 19))
        for (const p of res.data || []) { ctx.authors.set(p.id, p.author_id); if (!posts.includes(p.id)) posts.push(p.id) }
      } else if (r < 0.62 && posts.length) {
        const id = pick(posts)
        const res = await timed('like', c.from('likes').insert({ post_id: id, user_id: me.id }))
        if (res.error?.code === '23505') { delete ERR[Object.keys(ERR).find((k) => k.startsWith('like: 23505'))]; await timed('unlike', c.from('likes').delete().eq('post_id', id).eq('user_id', me.id)) }
        else if (!res.error && ctx.authors.get(id) && ctx.authors.get(id) !== me.id) await timed('notify', c.from('notifications').insert({ user_id: ctx.authors.get(id), type: 'like', reference_id: id, message: `[TEST] Load ${me.n} liked your post`, actor_id: me.id, is_read: false }))
      } else if (r < 0.82 && posts.length) {
        const id = pick(posts)
        await timed('comment', c.from('comments').insert({ post_id: id, author_id: me.id, content: `[TEST] ${pick(PHRASES)}` }))
      } else if (r < 0.92) {
        const res = await timed('post', c.from('posts').insert({ author_id: me.id, group_id: state.groupId, content: `[TEST] ${pick(PHRASES)} (#${Date.now() % 100000})`, is_prayer_request: Math.random() < 0.2 }).select('id').single())
        if (res.data?.id) { posts.push(res.data.id); ctx.created.add(res.data.id); ctx.authors.set(res.data.id, me.id); ctx.stageCreated.add(res.data.id) }
      } else if (posts.length) {
        await timed('open post', c.from('comments').select('*, author:profiles!author_id(id, full_name, avatar_url)').eq('post_id', pick(posts)).order('created_at').limit(50))
      }
      ops++
      if (think) await sleep(think[0] + Math.random() * (think[1] - think[0]))
    }
  }
  const s = performance.now()
  await Promise.all(Array.from({ length: users }, (_, i) => actor(i)))
  return { ops, secs: (performance.now() - s) / 1000 }
}

async function load(stageArgs) {
  const state = loadState()
  const all = await signInAll(state)
  const clients = all.slice(0, -1) // members only
  const seed = must(await admin.from('posts').select('id, author_id').eq('group_id', state.groupId).is('deleted_at', null), 'seed posts')
  const posts = seed.map((p) => p.id)
  const ctx = { clients, state, posts, created: new Set(), stageCreated: new Set(), authors: new Map(seed.map((p) => [p.id, p.author_id])) }

  // realtime watchers: 5 members listen to post INSERTs like the app's postLive channel
  const watchers = clients.slice(0, 5)
  const seen = watchers.map(() => new Set())
  const updates = { n: 0 }
  await Promise.all(watchers.map((c, i) => new Promise((res) => {
    c.channel(`load_${i}`)
      // Same shape as the app's postLive since realtime-scaling: new posts
      // filtered to the viewer's groups, counts only for the posts on screen
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', ...(UNFILTERED ? {} : { filter: `group_id=in.(${state.groupId})` }) }, (p) => { if (p.new?.group_id === state.groupId) seen[i].add(p.new.id) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts', ...(UNFILTERED ? {} : { filter: `id=in.(${posts.slice(-20).join(',') || '00000000-0000-0000-0000-000000000000'})` }) }, () => { updates.n++ })
      .subscribe((s) => { if (s === 'SUBSCRIBED') res() })
    setTimeout(res, 8000)
  })))

  const STAGES = stageArgs.length ? stageArgs.map((s) => { const [u, sec, t] = s.split(':'); return { users: +u, seconds: +sec, think: t === '0' ? null : [300, 1200] } })
    : [{ users: 10, seconds: 30, think: [300, 1200] }, { users: clients.length, seconds: 45, think: [300, 1200] }, { users: clients.length, seconds: 30, think: null }]

  for (const st of STAGES) {
    for (const k of Object.keys(LAT)) delete LAT[k]
    for (const k of Object.keys(ERR)) delete ERR[k]
    const users = Math.min(st.users, clients.length)
    console.log(`\n=== stage: ${users} users at once, ${st.seconds}s, ${st.think ? 'human pace (0.3–1.2s between actions)' : 'NO pauses (burst)'} ===`)
    ctx.stageCreated = new Set()
    const { ops, secs } = await runStage({ ...st, users }, ctx)
    await sleep(4000)
    const sc = [...ctx.stageCreated]
    console.log(`live updates: ${sc.length} new posts this stage; watchers got ${seen.map((s) => sc.filter((id) => s.has(id)).length).join(', ')}`)
    const total = Object.values(LAT).reduce((n, a) => n + a.length, 0)
    const errs = Object.values(ERR).reduce((n, v) => n + v, 0)
    console.log(`${total} requests in ${secs.toFixed(1)}s = ${(total / secs).toFixed(1)} req/s, errors ${errs} (${((errs / Math.max(total, 1)) * 100).toFixed(2)}%)`)
    console.log('op          count   p50    p95    p99    max (ms)')
    for (const [op, a] of Object.entries(LAT)) console.log(`${op.padEnd(10)} ${String(a.length).padStart(6)} ${String(pct(a, 50)).padStart(5)} ${String(pct(a, 95)).padStart(6)} ${String(pct(a, 99)).padStart(6)} ${String(Math.round(Math.max(...a))).padStart(6)}`)
    for (const [k, v] of Object.entries(ERR).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ERR x${v}  ${k}`)
    if (errs / Math.max(total, 1) > 0.2) { console.log('error rate over 20%, stopping'); break }
  }

  await sleep(5000)
  const created = [...ctx.created]
  console.log(`\nrealtime: ${created.length} posts created during load; each watcher received ${seen.map((s) => created.filter((id) => s.has(id)).length).join(', ')} of them; ${updates.n} count-update events seen in total`)
  for (const c of all) c.removeAllChannels()
}

// ── verify ─────────────────────────────────────────────────────────────────
async function verify() {
  const state = loadState()
  const posts = must(await admin.from('posts').select('id, like_count, comment_count').eq('group_id', state.groupId), 'posts')
  let bad = 0, likes = 0, comments = 0
  for (let i = 0; i < posts.length; i += 100) {
    const ids = posts.slice(i, i + 100).map((p) => p.id)
    const L = must(await admin.from('likes').select('post_id').in('post_id', ids), 'likes')
    const C = must(await admin.from('comments').select('post_id, is_removed').in('post_id', ids), 'comments')
    for (const p of posts.slice(i, i + 100)) {
      const l = L.filter((x) => x.post_id === p.id).length, c = C.filter((x) => x.post_id === p.id && !x.is_removed).length
      likes += l; comments += c
      if (l !== p.like_count || c !== p.comment_count) { bad++; if (bad <= 10) console.log(`MISMATCH ${p.id}: like_count ${p.like_count} vs ${l} rows, comment_count ${p.comment_count} vs ${c} rows`) }
    }
  }
  const notif = must(await admin.from('notifications').select('id', { count: 'exact', head: true }).in('user_id', state.users.map((u) => u.id)), 'n')
  const leak = must(await admin.from('notifications').select('id, user_id').in('actor_id', state.users.map((u) => u.id)).not('user_id', 'in', `(${state.users.map((u) => u.id).join(',')})`), 'leak')
  console.log(`${posts.length} posts, ${likes} likes, ${comments} comments checked: ${bad} count mismatches`)
  console.log(`notifications sent to real (non-test) users by test accounts: ${leak.length}`)
}

// ── cleanup ────────────────────────────────────────────────────────────────
async function cleanup() {
  const state = loadState()
  const ids = state.users.map((u) => u.id)
  if (!ids.length) { console.log('nothing to clean'); return }
  const inList = `(${ids.join(',')})`
  const del = async (what, q) => { const { error, count } = await q; console.log(`${error ? 'ERROR' : 'ok   '} ${what}${error ? ': ' + error.message : count != null ? ` (${count})` : ''}`) }
  await del('notifications to test users', admin.from('notifications').delete({ count: 'exact' }).in('user_id', ids))
  await del('notifications from test users', admin.from('notifications').delete({ count: 'exact' }).in('actor_id', ids))
  await del('direct messages', admin.from('direct_messages').delete({ count: 'exact' }).or(`sender_id.in.${inList},recipient_id.in.${inList}`))
  if (state.groupId) {
    await del('group chat', admin.from('group_chat_messages').delete({ count: 'exact' }).eq('group_id', state.groupId))
    await del('group posts', admin.from('posts').delete({ count: 'exact' }).eq('group_id', state.groupId))
  }
  await del('other posts by test users', admin.from('posts').delete({ count: 'exact' }).in('author_id', ids))
  await del('likes', admin.from('likes').delete({ count: 'exact' }).in('user_id', ids))
  await del('comments', admin.from('comments').delete({ count: 'exact' }).in('author_id', ids))
  if (state.groupId) {
    await del('group members', admin.from('group_members').delete({ count: 'exact' }).eq('group_id', state.groupId))
    await del('group', admin.from('groups').delete({ count: 'exact' }).eq('id', state.groupId))
  }
  let gone = 0
  for (const u of state.users) {
    await admin.from('profiles').delete().eq('id', u.id)
    const { error } = await admin.auth.admin.deleteUser(u.id)
    if (error && !/not found/i.test(error.message)) console.log(`ERROR delete ${u.email}: ${error.message}`); else gone++
  }
  console.log(`deleted ${gone}/${state.users.length} accounts`)
  const left = must(await admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', ids), 'left')
  fs.renameSync(STATE_FILE, STATE_FILE + '.done')
  console.log('state archived to', STATE_FILE + '.done')
}

const [mode, ...args] = process.argv.slice(2)
const run = { setup: () => setup(+(args[0] || 25)), check, load: () => load(args), verify, cleanup }[mode]
if (!run) { console.log('modes: setup [n] | check | load [users:seconds:think(0=none)]… | verify | cleanup'); process.exit(1) }
await run()
process.exit(0)
