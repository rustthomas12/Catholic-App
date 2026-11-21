/* global process */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getRawBody(req) {
  // Try req.rawBody first (some Vercel runtimes expose this)
  if (req.rawBody) {
    return typeof req.rawBody === 'string'
      ? Buffer.from(req.rawBody)
      : req.rawBody
  }
  // Fall back to reading the stream
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    )
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Dates and id we store from a Stripe subscription. Newer Stripe API
// versions moved current_period_end from the subscription to its items.
function subscriptionFields(sub) {
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end
  return {
    stripe_subscription_id: sub.id,
    status: sub.status,
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  }
}

// The subscription a checkout just created. Without this the row kept the
// previous (canceled) subscription's id and trial date until Stripe's next
// "updated" event, so Billing showed a trial end in the past.
async function checkoutSubscription(session) {
  if (!session.subscription) return {}
  try {
    const id = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
    return subscriptionFields(await stripe.subscriptions.retrieve(id))
  } catch (err) {
    console.error('Could not load the new subscription:', err.message)
    return { stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null }
  }
}

const APP_URL = process.env.APP_URL || 'https://app.getinfold.app'

// User-entered text going into an email
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c])
}

async function sendEmail(payload) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey || resendKey === 're_placeholder') return false
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'inFold <noreply@getinfold.app>', ...payload }),
  })
  return r.ok
}

// Records who applied, in what role (migration 096), and for staff signups
// emails the named pastor an invite link. Accepting it only gives the pastor
// provisional access; a platform admin still verifies everyone.
async function recordParishApplication(session, parishName, applicantName) {
  const m = session.metadata || {}
  const role = ['pastor', 'staff', 'clergy'].includes(m.applicant_role) ? m.applicant_role : 'pastor'
  const { data: app, error } = await supabase.from('parish_signups').upsert({
    parish_id: m.parish_id,
    user_id: m.admin_user_id,
    applicant_role: role,
    staff_title: m.staff_title || null,
    pastor_name: m.pastor_name || null,
    pastor_email: m.pastor_email || null,
  }, { onConflict: 'parish_id,user_id' }).select('invite_token, invite_sent_at').single()
  if (error) { console.error('Could not record the application:', error.message); return null }

  if (role === 'staff' && m.pastor_email && !app.invite_sent_at) {
    const link = `${APP_URL}/pastor-invite/${app.invite_token}`
    const sent = await sendEmail({
      to: [m.pastor_email],
      subject: `${applicantName || 'Your parish staff'} set up ${parishName || 'your parish'} on inFold`,
      html:
        '<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1B2A4A">' +
        '<p>Dear ' + esc(m.pastor_name || 'Father') + ',</p>' +
        '<p>' + esc(applicantName || 'A member of your parish staff') + (m.staff_title ? ' (' + esc(m.staff_title) + ')' : '') +
        ' has started setting up <strong>' + esc(parishName || 'your parish') + '</strong> on inFold, the Catholic parish app, ' +
        'and named you as pastor.</p>' +
        '<p>Accept to manage your parish page with them. It is free for 90 days, and no card is needed.</p>' +
        '<p style="margin:28px 0"><a href="' + link + '" style="background:#1B2A4A;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Accept and review your parish</a></p>' +
        '<p style="font-size:13px;color:#666">If you did not expect this, you can ignore this email; nothing changes until our team verifies the parish. ' +
        'The link works for 30 days.</p></div>',
    }).catch(() => false)
    if (sent) {
      await supabase.from('parish_signups').update({ invite_sent_at: new Date().toISOString() })
        .eq('parish_id', m.parish_id).eq('user_id', m.admin_user_id)
    }
  }
  return { role, ...app }
}

// Whether the parish can be billed automatically: a default card on the
// subscription or on the customer. Drives the "add a card" nudges.
async function hasCardOnFile(sub) {
  if (sub?.default_payment_method) return true
  try {
    const customerId = typeof sub?.customer === 'string' ? sub.customer : sub?.customer?.id
    if (!customerId) return false
    const customer = await stripe.customers.retrieve(customerId)
    return !!customer?.invoice_settings?.default_payment_method
  } catch (err) {
    console.error('Could not check the card on file:', err.message)
    return undefined // unknown: leave the stored value alone
  }
}

function cardField(value) {
  return value === undefined ? {} : { has_payment_method: value }
}

// A parish admin saved a card (Checkout in setup mode, action 'add-card').
// Make it the default for autopay, and resume the plan if the free trial
// ended without a card and Stripe paused it.
async function handleParishCardAdded(session) {
  const parishId = session.metadata?.parish_id
  const subId    = session.metadata?.subscription_id
  if (!parishId || !subId || !session.setup_intent) return
  const setupIntent = await stripe.setupIntents.retrieve(
    typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent.id)
  const pm = typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method?.id
  if (!pm) return

  await stripe.customers.update(session.customer, { invoice_settings: { default_payment_method: pm } })
  let sub = await stripe.subscriptions.update(subId, { default_payment_method: pm })
  if (sub.status === 'paused') {
    // Billing starts today; the trial is already over
    sub = await stripe.subscriptions.resume(subId, { billing_cycle_anchor: 'now', proration_behavior: 'none' })
  }

  await supabase.from('parish_subscriptions').update({
    ...subscriptionFields(sub),
    has_payment_method: true,
    updated_at: new Date().toISOString(),
  }).eq('parish_id', parishId)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  const rawBody = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody.toString('utf8'),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature error:', err.message, '| Body length:', rawBody.length)
    return res.status(400).json({ error: err.message })
  }

  try {
    switch (event.type) {

      // ── Checkout completed ──────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId       = session.metadata?.user_id
        const parishId     = session.metadata?.parish_id
        const billingType  = session.metadata?.billing_type
        const donationType = session.metadata?.donation_type
        const tier         = session.metadata?.tier
        const customerId   = session.customer

        if (session.mode === 'setup' && session.metadata?.purpose === 'parish_add_card') {
          await handleParishCardAdded(session)
          break
        }

        // Parish subscription checkout
        if (parishId && billingType?.startsWith('parish_')) {
          const adminUserId = session.metadata?.admin_user_id

          const checkoutSub = await checkoutSubscription(session)
          // Trials can now start without a card (payment_method_collection: if_required)
          const card = checkoutSub.stripe_subscription_id
            ? await hasCardOnFile(await stripe.subscriptions.retrieve(checkoutSub.stripe_subscription_id)).catch(() => undefined)
            : undefined
          await supabase.from('parish_subscriptions').upsert({
            parish_id: parishId,
            stripe_customer_id: customerId,
            status: 'trialing',
            ...checkoutSub,
            ...cardField(card),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'parish_id' })

          // An existing admin renewing / reactivating needs no verification
          let alreadyAdmin = false
          if (adminUserId) {
            const { data: adminRow } = await supabase.from('parish_admins')
              .select('role').eq('parish_id', parishId).eq('user_id', adminUserId).maybeSingle()
            alreadyAdmin = !!adminRow && adminRow.role !== 'pending'
          }

          // New pastor: provisional access right away (role 'pending': parish
          // page, Mass times, settings, billing). Announcements, pushes,
          // followers, messages and integrations unlock once a platform admin
          // verifies them (migration 095). The profile flag drives the
          // "verifying" banner and the admin review list.
          if (adminUserId && !alreadyAdmin) {
            await supabase.from('parish_admins').upsert(
              { parish_id: parishId, user_id: adminUserId, role: 'pending' },
              { onConflict: 'parish_id,user_id', ignoreDuplicates: true })
            await supabase.from('profiles')
              .update({ pending_pastor_parish_id: parishId })
              .eq('id', adminUserId)
          }

          // Send verification email to info@getinfold.app for review.
          if (adminUserId && !alreadyAdmin) {
            try {
              const [profileRes, parishRes] = await Promise.all([
                supabase.from('profiles').select('full_name').eq('id', adminUserId).single(),
                supabase.from('parishes').select('name, city, state').eq('id', parishId).single(),
              ])
              const priest = profileRes.data
              const parish = parishRes.data
              const tierName = billingType.replace('parish_', '')
              const meta = session.metadata || {}
              await recordParishApplication(session, parish?.name, priest?.full_name)
              const roleLabel = { pastor: 'Pastor', staff: 'Parish staff', clergy: 'Other clergy' }[meta.applicant_role] || 'Pastor'
              const resendKey = process.env.RESEND_API_KEY
              if (resendKey && resendKey !== 're_placeholder') {
                const approvalSQL =
                  "INSERT INTO parish_admins (parish_id, user_id, role)\nVALUES ('" +
                  parishId + "', '" + adminUserId + "', 'admin')\nON CONFLICT (parish_id, user_id) DO UPDATE SET role = 'admin';\n\n" +
                  "UPDATE profiles SET pending_pastor_parish_id = NULL WHERE id = '" + adminUserId + "';"
                await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    from: 'inFold <noreply@getinfold.app>',
                    to: ['info@getinfold.app'],
                    subject: '[Verification Needed] ' + roleLabel + ' Application — ' + (parish?.name || parishId),
                    html:
                      '<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto">' +
                      '<div style="background:#1B2A4A;padding:20px;border-radius:8px 8px 0 0">' +
                      '<h2 style="color:#C9A84C;margin:0">Pastor Application — Verification Needed</h2></div>' +
                      '<div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px">' +
                      '<table style="width:100%;border-collapse:collapse">' +
                      '<tr><td style="padding:6px 0;color:#888;width:140px">Applicant</td><td>' + esc(priest?.full_name || 'Unknown') + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">Role</td><td>' + roleLabel + (meta.staff_title ? ' · ' + esc(meta.staff_title) : '') + '</td></tr>' +
                      (meta.applicant_role === 'staff'
                        ? '<tr><td style="padding:6px 0;color:#888">Named pastor</td><td>' + esc(meta.pastor_name || 'Not given') +
                          (meta.pastor_email ? ' &lt;' + esc(meta.pastor_email) + '&gt; (invite sent)' : ' (no email: confirm with the parish office)') + '</td></tr>'
                        : '') +
                      '<tr><td style="padding:6px 0;color:#888">User ID</td><td style="font-family:monospace;font-size:12px">' + adminUserId + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">Parish</td><td>' + esc(parish?.name || parishId) + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">Parish ID</td><td style="font-family:monospace;font-size:12px">' + parishId + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">Location</td><td>' + [parish?.city, parish?.state].filter(Boolean).join(', ') + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">Plan</td><td>' + tierName + '</td></tr>' +
                      '<tr><td style="padding:6px 0;color:#888">Stripe Customer</td><td>' + customerId + '</td></tr>' +
                      '</table>' +
                      '<hr style="border:none;border-top:1px solid #C9A84C;margin:20px 0"/>' +
                      '<p style="font-size:13px;color:#555"><strong>Approve or decline in Platform Admin, Role Management</strong> (' + APP_URL + '/admin). ' +
                      'Staff are approved without the clergy badge. Fallback SQL:</p>' +
                      '<pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:12px;white-space:pre-wrap">' + approvalSQL + '</pre>' +
                      '</div></div>',
                  }),
                })
              }
            } catch (emailErr) {
              console.error('Verification email failed:', emailErr.message)
            }
          }
          break
        }

        // Org subscription checkout
        if (billingType === 'org_base') {
          const orgId       = session.metadata?.org_id
          const billingTrack = session.metadata?.billing_track || 'standalone'
          const orgTier     = session.metadata?.tier || 'starter'
          if (orgId) {
            await supabase.from('org_subscriptions').upsert({
              org_id: orgId,
              stripe_customer_id: customerId,
              status: 'trialing',
              ...(await checkoutSubscription(session)),
              tier: orgTier,
              billing_track: billingTrack,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id' })
            // Update org_type to match billing track
            await supabase.from('organizations').update({
              org_type: billingTrack === 'national' ? 'national' : 'standalone',
            }).eq('id', orgId)
          }
          break
        }

        if (!userId) break

        if (donationType === 'one_time') {
          const amountCents = parseInt(session.metadata?.amount_cents || '0', 10)
          await supabase
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              donation_tier: 'benefactor',
              donation_tier_since: new Date().toISOString(),
            })
            .eq('id', userId)

          // Atomic increment (migration 044)
          const { error: incErr } = await supabase.rpc('increment_donation_total', {
            p_user_id: userId,
            p_amount: amountCents,
          })
          if (incErr) console.error('increment_donation_total failed:', incErr.message)

        } else if (tier) {
          // Recurring subscription — subscription events handle ongoing status
          // but we set initial state here in case webhook arrives before sub event
          await supabase
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              donation_tier: tier,
              donation_tier_since: new Date().toISOString(),
              subscription_status: 'active',
            })
            .eq('id', userId)
        }

        await logBillingEvent(userId, customerId, event.type, {
          status: 'completed',
          amount_cents: session.amount_total,
        })
        break
      }

      // ── Subscription created / updated ──────────────────────
      // paused / resumed: a no-card trial that ends is paused; adding a card resumes it
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed': {
        const sub        = event.data.object
        const customerId = sub.customer
        const status     = sub.status  // active, past_due, canceled, trialing, etc.
        const tier       = sub.metadata?.tier
        const parishId   = sub.metadata?.parish_id
        const billingType = sub.metadata?.billing_type
        const interval   = sub.items?.data?.[0]?.price?.recurring?.interval

        // Parish subscription
        if (parishId) {
          await supabase.from('parish_subscriptions').upsert({
            parish_id: parishId,
            stripe_customer_id: customerId,
            ...subscriptionFields(sub),
            ...cardField(await hasCardOnFile(sub)),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'parish_id' })
          break
        }

        // Org subscription
        if (sub.metadata?.billing_type === 'org_base') {
          const orgId        = sub.metadata?.org_id
          const billingTrack = sub.metadata?.billing_track || 'standalone'
          const orgTier      = sub.metadata?.tier || 'starter'
          if (orgId) {
            await supabase.from('org_subscriptions').upsert({
              org_id: orgId,
              stripe_customer_id: customerId,
              ...subscriptionFields(sub),
              tier: orgTier,
              billing_track: billingTrack,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id' })
          }
          break
        }

        // Personal subscription
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        const updates = {
          subscription_status: status,
          subscription_interval: interval || null,
        }
        if (tier) {
          updates.donation_tier = status === 'active' ? tier : null
        }
        if (status === 'canceled' || status === 'unpaid') {
          updates.donation_tier = null
        }

        await supabase.from('profiles').update(updates).eq('id', profile.id)
        await logBillingEvent(profile.id, customerId, event.type, { status, interval })
        break
      }

      // ── Subscription deleted (canceled) ────────────────────
      case 'customer.subscription.deleted': {
        const sub        = event.data.object
        const customerId = sub.customer
        const parishId   = sub.metadata?.parish_id

        // Parish subscription
        if (parishId) {
          await supabase.from('parish_subscriptions').update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }).eq('parish_id', parishId)
          break
        }

        // Personal subscription
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase.from('profiles').update({
          donation_tier: null,
          subscription_status: 'inactive',
          subscription_interval: null,
        }).eq('id', profile.id)

        await logBillingEvent(profile.id, customerId, event.type, { status: 'canceled' })
        break
      }

      // ── Payment failed ──────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice    = event.data.object
        const customerId = invoice.customer

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase.from('profiles').update({
          subscription_status: 'past_due',
        }).eq('id', profile.id)

        await logBillingEvent(profile.id, customerId, event.type, { status: 'past_due' })
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    res.status(500).json({ error: err.message })
  }
}

async function logBillingEvent(userId, customerId, eventType, extras = {}) {
  // Query builders have no .catch(); check the returned error instead
  const { error } = await supabase.from('billing_events').insert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_event_id: null,
    event_type: eventType,
    ...extras,
  })
  if (error) console.error('Failed to log billing event:', error.message)
}
