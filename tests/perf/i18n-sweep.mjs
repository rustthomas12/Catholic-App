/**
 * Spanish coverage sweep: opens the main screens in Spanish as the demo
 * account and lists visible text that still looks English.
 *   node --env-file=.env.local tests/perf/i18n-sweep.mjs [baseUrl]
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
const BASE = process.argv[2] || 'http://localhost:5173'
const url = process.env.VITE_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data } = await admin.auth.admin.generateLink({ type: 'magiclink', email: 'appreview@getinfold.app' })
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data: v } = await anon.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
const uid = v.session.user.id
const { data: prof } = await admin.from('profiles').select('language').eq('id', uid).single()
await admin.from('profiles').update({ language: 'es' }).eq('id', uid)
const ROUTES = (process.env.ROUTES || '/,/groups,/faith,/notifications,/messages,/directory,/profile,/organizations,/settings').split(',')
const EN = /\b(the|your|you|and|no|yet|posts?|with|from|here|this|of|to|for|share|view|see all|today|join|loading|nothing|time|access|my|about|more|less|members?|events?)\b/i
const b = await chromium.launch()
try {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript((s) => { localStorage.setItem('parish-app-auth', JSON.stringify(s)); localStorage.setItem('infold-language', 'es') }, v.session)
  const p = await ctx.newPage()
  for (const r of ROUTES) {
    await p.goto(BASE + r); await p.waitForTimeout(3500)
    const lines = await p.evaluate(() => {
      const out = new Set(); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      while (w.nextNode()) { const n = w.currentNode; const t = n.textContent.trim(); const el = n.parentElement
        if (t.length > 2 && el && el.offsetParent !== null && !el.closest('article,[data-post-id],[data-user-content]')) out.add(t) }
      for (const el of document.querySelectorAll('[placeholder],[aria-label]')) { const t = el.getAttribute('placeholder') || el.getAttribute('aria-label'); if (t) out.add('@' + t) }
      return [...out]
    })
    const hits = lines.filter((t) => EN.test(t) && !/^(inFold|App Review)/.test(t))
    console.log(`\n${r}`); for (const h of hits) console.log('   ' + h.slice(0, 110))
  }
} finally {
  await admin.from('profiles').update({ language: prof?.language ?? null }).eq('id', uid)
  await b.close()
}
