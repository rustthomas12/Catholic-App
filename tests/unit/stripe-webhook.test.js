// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'node:events'

// Stripe: events are the raw JSON body (signature check stubbed); the new
// subscription uses the 2025+ shape (period end on the item, not the sub)
const SUBS = {
  sub_new: {
    id: 'sub_new', status: 'trialing', trial_end: 1800000000,
    items: { data: [{ current_period_end: 1800000000 }] },
    metadata: { parish_id: 'p1' },
  },
}
vi.mock('stripe', () => ({
  default: class {
    constructor() {
      this.webhooks = { constructEvent: (body) => JSON.parse(body) }
      this.subscriptions = { retrieve: async (id) => SUBS[id] }
    }
  },
}))

const writes = []
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => {
      const q = {
        select: () => q, eq: () => q, maybeSingle: async () => ({ data: { id: 'existing-admin' } }),
        single: async () => ({ data: null }),
        update: (v) => { writes.push({ table, update: v }); return q },
        upsert: async (v) => { writes.push({ table, upsert: v }); return { error: null } },
        insert: async () => ({ error: null }),
        then: (ok) => ok({ error: null }),
      }
      return q
    },
    rpc: async () => ({ error: null }),
  }),
}))

process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
process.env.SUPABASE_URL = 'https://db.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'

const { default: handler } = await import('../../api/stripe-webhook.js')

function send(event) {
  const req = new EventEmitter()
  req.method = 'POST'
  req.headers = { 'stripe-signature': 'sig' }
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this }, send(b) { this.body = b; return this } }
  const done = handler(req, res).then(() => res)
  req.emit('data', Buffer.from(JSON.stringify(event)))
  req.emit('end')
  return done
}

const iso = (s) => new Date(s * 1000).toISOString()

beforeEach(() => { writes.length = 0 })

describe('stripe-webhook: parish subscriptions', () => {
  it('stores the new subscription when a parish checkout completes', async () => {
    const res = await send({
      type: 'checkout.session.completed',
      data: { object: {
        customer: 'cus_1', subscription: 'sub_new',
        metadata: { parish_id: 'p1', billing_type: 'parish_medium', admin_user_id: 'u1' },
      } },
    })
    expect(res.statusCode).toBe(200)
    const row = writes.find((w) => w.table === 'parish_subscriptions')?.upsert
    expect(row).toMatchObject({
      parish_id: 'p1',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_new',
      status: 'trialing',
      trial_ends_at: iso(1800000000),
      current_period_end: iso(1800000000),
    })
  })

  it('handles customer.subscription.created like updated', async () => {
    await send({ type: 'customer.subscription.created', data: { object: { ...SUBS.sub_new, customer: 'cus_1' } } })
    const row = writes.find((w) => w.table === 'parish_subscriptions')?.upsert
    expect(row).toMatchObject({ stripe_subscription_id: 'sub_new', trial_ends_at: iso(1800000000), current_period_end: iso(1800000000) })
  })
})
