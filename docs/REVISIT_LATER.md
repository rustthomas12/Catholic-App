# Revisit later: paused features and deferred ideas

Written October 2026, just before the App Store / Google Play launch. It
records what was switched off, what was deliberately left unbuilt, and the
reasoning, so these decisions can be revisited with real usage data.

**Where things are**
- On/off switches: `src/config/features.js`
- Full app as it was before anything was paused: git tag
  `archive/before-feature-blocking` (on GitHub)
- The pull request that paused them: #3

---

## 1. Why we paused features

At launch inFold had a handful of real users and no paying parishes yet.
The business depends on one thing: **parishes paying because their
parishioners actually use the app**. Everything that didn't serve that, or
that added risk for app-store review or diocese sales, was paused so the
launch stays focused on the parish core: announcements, events, push
notifications, the directory, daily prayer content, groups and prayer
requests.

Nothing was deleted. Database tables and existing data are untouched.

---

## 2. Paused features

### Direct messages (`directMessages`)
**Why paused**
- Only 2 messages had ever been sent.
- It's the highest-risk feature for a Catholic app. Dioceses have
  safe-environment policies (e.g. VIRTUS) about private adult–minor
  communication, and a diocese reviewing inFold may refuse a contract
  because of open 1:1 messaging.
- Apple and Google look hard at private messaging during review (abuse
  reporting, moderation, minors).

**What's hidden:** the Messages screen and menu links, the unread badge, the
organization "Contact" button (it sent a DM to the org admin), and the
direct-message notification setting. `/messages` redirects to Home.

**Before turning it back on, consider:**
- Limit it to **messaging parish staff only** (parishioner → parish office),
  or adults only, rather than open 1:1 messaging.
- Add report and block on individual messages, not just users.
- Check the diocese safe-environment policy for your first diocese partners.
- Update the store answers (see §5).

### Group chat (`groupChat`)
**Why paused:** zero messages ever sent. It duplicates group posts, and
real-time chat needs much more moderation than posts.
**What's hidden:** the Chat tab inside groups.
**Revisit if:** groups are active and members ask for faster back-and-forth.
Moderation (report, block, admin delete) must be in place first.

### Parish-sponsored "premium" codes (`sponsorshipCodes`)
**Why paused:** left over from an old individual "premium" tier that no
longer exists. inFold is free for every Catholic. The redeem screen was
already gone, and only a background "return visit" tracker still ran.
**What's hidden:** that tracker. `/api/claim-sponsorship-code` and
`/api/track-return` return 404.
**Revisit if:** you ever add paid features for individuals that a parish
could buy for its people. Probably never; it conflicts with "free for
Catholics, parishes pay."

### Creating new organizations (`createOrganizations`)
**Why paused:**
- The organizations system (chapters, national networks, org billing tiers)
  is the largest admin area in the app (about 1,500 lines) and served 7
  organizations with 1 subscription.
- It's a second market (Knights of Columbus, FOCUS, etc.) before the first
  one (parishes) is proven.

**What's hidden:** the "New" organization button and `/organizations/new`,
which also stops new chapter requests. **Existing organizations, including
the paying one, keep working fully.**

**Revisit when:** parishes are paying and a specific organization (e.g. a
Knights of Columbus council) asks to join.

### Pitch deck inside the app (`pitchDeckInApp`)
**Why paused:** the investor deck was a public page inside the live app,
reachable by parishioners and app reviewers.
**What's hidden:** `app.getinfold.app/pitch` and the same path in the phone
apps. It still lives at **getinfold.app/pitch** (marketing site).
**Revisit:** no need. Keep investor material on the marketing site.

---

## 3. How to turn a feature back on

1. In `src/config/features.js`, change the switch to `true`.
2. If it's `directMessages` or `groupChat`, update the store answers first
   (§5).
3. Merge to `main`. The website updates automatically.
4. Ship a new app version through the stores (see `docs/MOBILE.md` →
   "Releasing updates"). The phone apps only change with a new build.

Code you need is still in place. For the exact pre-pause app, compare against
the `archive/before-feature-blocking` tag.

---

## 4. Ideas considered but not built yet

These came out of the business review. They were deliberately **not**
implemented, to keep the launch simple.

### Pricing
Current: $59 / $119 / $229 / $389 per month by parish size, 90-day free trial.

| Idea | Why | What it would take |
|---|---|---|
| **30-day trial** instead of 90 | 90 days delays every dollar by a quarter | Change the copy in about 15 places, set `STRIPE_PARISH_TRIAL_DAYS=30` in Vercel, change `trial_period_days` in `api/create-org-checkout-session.js` |
| **Annual billing** (about 2 months free) | Locks in a year; less churn when budgets are reviewed | Create annual prices in Stripe, add a monthly/annual toggle on the billing screens, pass the price to checkout |
| **Free parish tier** | Fixes the chicken-and-egg problem: parishes join free, then pay for push and integrations once parishioners are on it | Pastors need a verification path that doesn't require checkout; gate push, integrations, events and scheduled posts behind paid; limit free announcements per month |
| **Diocese license** | One contract covers every parish in a diocese: fewer sales calls, and protection from pastor turnover | A contract or pricing page plus "contact us"; later, a diocese dashboard |

### "My Prayer" consolidation
Rosary tracker, prayer journal, private intentions, Morning Offering and
formation programs overlap with Hallow and Laudate. Idea: group them into
one "My Prayer" area on the Faith tab and **stop adding to them**.
The daily readings, Liturgy of the Hours, saints, Examination of
Conscience and the private Confession tracker are distinctive and stay as
they are.

### Facebook page posting
The integrations hub can auto-post announcements to a parish Facebook page.
For any parish other than your own test page, Meta has to approve the app
(App Review for `pages_manage_posts`). Do this before selling integrations
as a feature.

---

## 5. Store answers to change if messaging or chat comes back

The store listings currently say the app has **no messaging**. If
`directMessages` or `groupChat` is turned on:

- **Apple age rating** → Messaging and chat: **Yes**
- **Apple App Privacy** → add *User Content → Emails or Text Messages*
  (linked to user, App Functionality)
- **iOS privacy manifest** `ios/App/App/PrivacyInfo.xcprivacy` → re-add the
  `NSPrivacyCollectedDataTypeEmailsOrTextMessages` entry (see the
  `archive/before-feature-blocking` tag for the exact block)
- **Google data safety** → add *Messages (in-app)*
- **Store description** (`docs/STORE_LISTING.md`) → mention messaging or chat
  again if you want

---

## 6. The numbers behind these decisions (October 2026)

**Usage at the time (live database):** 4 real users, 2 active in the past
month, 5 posts total, 2 canceled parish trials, 7 organizations with 1
active subscription.

**Income estimate** (parish subscriptions only, about $100/month blended):

| Scenario | Paying parishes | Annual revenue |
|---|---|---|
| Slow | 10–25 by end of Year 2 | $12K–$30K |
| Base (one diocese relationship) | 50–100 by Year 3 | $60K–$120K |
| Strong (several dioceses) | 200–400 by Year 4–5 | $240K–$480K |

Replacing a salary takes about 40 paying parishes. The main number to watch
is **the share of a parish's households using inFold**; pastors renew when
their people are on it.

**When to revisit this document:** after the first 10 paying parishes, after
the first diocese conversation, or 6 months after launch, whichever comes
first. Compare actual usage against the reasons above before turning
anything back on.
