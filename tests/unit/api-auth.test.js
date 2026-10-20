// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stripe: record checkout sessions instead of calling the API
const created = []
vi.mock('stripe', () => ({
  default: class {
    constructor() {
      this.checkout = { sessions: { create: async (args) => { created.push(args); return { url: 'https://stripe.test/c' } } } }
      this.billingPortal = { sessions: { create: async () => ({ url: 'https://stripe.test/p' }) } }
    }
  },
}))

// Supabase client used by track-return
const updates = []
const filters = []
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const q = {
        select: () => q, eq: (col, val) => { filters.push([col, val]); q._eq = { ...(q._eq || {}), [col]: val }; return q },
        single: async () => ({ data: { id: 'act1', activated_at: '2020-01-01T00:00:00Z', returned_at: null, is_active: true, user_id: q._eq?.user_id } }),
        update: (v) => { updates.push({ v, where: () => q._eq }); return q },
        then: (ok) => ok({ error: null }),
      }
      return q
    },
  }),
}))

process.env.SUPABASE_URL = 'https://db.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
process.env.STRIPE_PRICE_ORG_STARTER = 'price_org'
process.env.STRIPE_PRICE_PARISH_MEDIUM = 'price_parish'

// Fake Supabase auth + REST: tokens map to users; tables seeded below
const USERS = { 'tok-admin': { id: 'u-admin', email: 'a@x.test' }, 'tok-member': { id: 'u-member', email: 'm@x.test' } }
let ROWS
function fakeFetch(url, opts = {}) {
  const auth = opts.headers?.Authorization?.replace('Bearer ', '')
  if (url.endsWith('/auth/v1/user')) {
    const u = USERS[auth]
    return Promise.resolve({ ok: !!u, json: async () => u })
  }
  const [, table, query] = url.match(/\/rest\/v1\/(\w+)\?(.*)$/)
  const params = Object.fromEntries(new URLSearchParams(query))
  const rows = (ROWS[table] || []).filter(r =>
    Object.entries(params).every(([k, v]) => !v.startsWith('eq.') || String(r[k]) === v.slice(3)))
  return Promise.resolve({ ok: true, json: async () => rows })
}

function call(handler, { token, body } = {}) {
  const req = { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body }
  const res = { statusCode: 200, body: null, setHeader() {}, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this }, end() { return this } }
  return handler(req, res).then(() => res)
}

beforeEach(() => {
  created.length = 0
  updates.length = 0
  filters.length = 0
  ROWS = {
    profiles: [{ id: 'u-admin', is_admin: false }, { id: 'u-member', is_admin: false }],
    organization_members: [{ id: 1, org_id: 'org1', user_id: 'u-admin', role: 'admin' }, { id: 2, org_id: 'org1', user_id: 'u-member', role: 'member' }],
    parish_admins: [{ id: 1, parish_id: 'p-managed', user_id: 'u-admin' }],
  }
  globalThis.fetch = vi.fn(fakeFetch)
})

describe('create-org-checkout-session', async () => {
  const { default: handler } = await import('../../api/create-org-checkout-session.js')

  it('rejects requests without a session', async () => {
    expect((await call(handler, { body: { orgId: 'org1', tier: 'starter' } })).statusCode).toBe(401)
  })
  it('rejects an invalid token', async () => {
    expect((await call(handler, { token: 'forged', body: { orgId: 'org1', tier: 'starter' } })).statusCode).toBe(401)
  })
  it('rejects a non-admin member', async () => {
    const res = await call(handler, { token: 'tok-member', body: { orgId: 'org1', tier: 'starter' } })
    expect(res.statusCode).toBe(403)
    expect(created).toHaveLength(0)
  })
  it('rejects an unknown billing track', async () => {
    expect((await call(handler, { token: 'tok-admin', body: { orgId: 'org1', tier: 'starter', billingTrack: 'free' } })).statusCode).toBe(400)
  })
  it('lets the org admin check out, ignoring a forged adminUserId', async () => {
    const res = await call(handler, { token: 'tok-admin', body: { orgId: 'org1', tier: 'starter', adminUserId: 'u-member', adminEmail: 'evil@x.test' } })
    expect(res.statusCode).toBe(200)
    expect(created[0].metadata.admin_user_id).toBe('u-admin')
    expect(created[0].customer_email).toBe('a@x.test')
  })
})

describe('create-parish-checkout-session', async () => {
  const { default: handler } = await import('../../api/create-parish-checkout-session.js')

  it('rejects requests without a session', async () => {
    expect((await call(handler, { body: { parishId: 'p-new' } })).statusCode).toBe(401)
  })
  it("rejects a parish someone else already manages", async () => {
    const res = await call(handler, { token: 'tok-member', body: { parishId: 'p-managed' } })
    expect(res.statusCode).toBe(403)
    expect(created).toHaveLength(0)
  })
  it('lets a pastor claim an unmanaged parish as themselves', async () => {
    const res = await call(handler, { token: 'tok-member', body: { parishId: 'p-new', adminUserId: 'u-admin' } })
    expect(res.statusCode).toBe(200)
    expect(created[0].metadata.admin_user_id).toBe('u-member')
  })
  it('lets the existing admin renew', async () => {
    expect((await call(handler, { token: 'tok-admin', body: { parishId: 'p-managed' } })).statusCode).toBe(200)
  })
})

describe('track-return', async () => {
  const { default: handler } = await import('../../api/track-return.js')

  it('rejects requests without a session', async () => {
    expect((await call(handler, { body: { userId: 'u-member' } })).statusCode).toBe(401)
    expect(updates).toHaveLength(0)
  })
  it('tracks the caller, not the userId in the body', async () => {
    const res = await call(handler, { token: 'tok-member', body: { userId: 'u-admin' } })
    expect(res.statusCode).toBe(200)
    expect(filters).toContainEqual(['user_id', 'u-member'])
    expect(filters).not.toContainEqual(['user_id', 'u-admin'])
    expect(updates).toHaveLength(1)
  })
})
