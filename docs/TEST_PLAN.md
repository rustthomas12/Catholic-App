# inFold — Full Feature Test Plan

**Resume point:** N3/N4 (user clicks Allow on the live site as Beta), AU5 (user confirms reset email), parish checkout → PA*/E*/F14, then S8 sign-out and Z2 cleanup. Migrations through 055 applied. Branch test-fixes-2 = PR #7.

Three accounts, each signed in on its own local copy of the app (separate origins keep separate sessions):

| Account | Origin | Role during testing |
|---|---|---|
| **A** — Thomas Rust | http://localhost:5173 | Platform admin; admin of 4 Civitas Dei organizations. Home parish St. Mary. |
| **B** — Beta | http://localhost:5174 | Parish admin of St. Joseph Parish (North Brookfield). Main "other person" for social features. |
| **C** — Fr. Michael | http://localhost:5175 | Verified clergy; admin of Cathedral of St. Paul + St. Mary, staff at Our Lady of the Sacred Heart. |

Sign-up / onboarding of a brand-new account and account deletion can't be run with these three
(no new account; we don't delete real accounts) — marked ⏭ below.
There is no "create a parish" feature in the app — parishes come from the imported directory (558).

All three local copies use the production database and forward `/api/*` to `https://app.getinfold.app`.
Test content is prefixed **`[TEST]`** so it is easy to find and remove afterwards.

Status key: ⬜ not run · ✅ pass · ❌ fail (see Issues) · 🔧 fixed · ⏭ skipped (reason noted)

---

## 1. Marketing site (getinfold.app) — no login
| ID | Test | Acct | Status |
|---|---|---|---|
| M1 | Home page loads, inFold branding, nav links work | – | ✅ |
| M2 | /features, /parishes, /about, /contact pages render | – | ✅ |
| M3 | Contact form submits and email arrives at info@getinfold.app | – | ✅ |
| M4 | "Open app" / sign-up links go to app.getinfold.app | – | ✅ |
| M5 | /pitch page loads | – | ✅ |
| M6 | Unknown path falls back to Home | – | ✅ |
| M7 | Mobile width (375px) layout — no horizontal scroll | – | ✅ |

## 2. Public app pages — no login
| ID | Test | Acct | Status |
|---|---|---|---|
| P1 | /terms, /privacy, /policy, /delete-account render with inFold name + correct emails | – | ✅ |
| P2 | Protected route (e.g. /groups) redirects to /login when signed out | – | ✅ |
| P3 | 404 page for unknown route | – | ✅ |
| P4 | PWA manifest/icons load; install prompt doesn't error | – | ✅ |

## 3. Authentication
| ID | Test | Acct | Status |
|---|---|---|---|
| AU1 | Sign up (email + password) → /check-email | C | ⏭ |
| AU2 | Confirmation email arrives from **inFold <noreply@getinfold.app>**, link works | C | ⏭ |
| AU3 | Log in / log out | A,B | ✅ |
| AU4 | Wrong password shows friendly error | B | ✅ |
| AU5 | Forgot password → email arrives (inFold branding) → reset works | B | 🔧 |
| AU6 | Session persists across reload | A | ✅ |
| AU7 | Suspended user cannot use the app (after A suspends C in admin) | C | ✅ |

## 4. Onboarding
| ID | Test | Acct | Status |
|---|---|---|---|
| ON1 | New user lands on /onboarding; can search & follow a parish | C | ⏭ |
| ON2 | Onboarding group suggestions — join a group | C | ⏭ |
| ON3 | Finishing onboarding lands on home feed | C | ⏭ |
| ON4 | Location-based parish suggestion (allow/deny browser location) | C | ⏭ |

## 5. Home feed & posts
| ID | Test | Acct | Status |
|---|---|---|---|
| F1 | Feed loads posts from followed parish + groups | B | ✅ |
| F2 | Feed filters work | B | ✅ |
| F3 | Create text post (destination: parish / group) | B | ✅ |
| F4 | Create post with image (≤5 MB); >5 MB rejected | B | ✅ |
| F5 | Prayer-request toggle on post | B | 🔧 |
| F6 | Character counter / max length | B | ✅ |
| F7 | Like / react to post; count updates for other user | A,B | 🔧 |
| F8 | Comment on post; other user sees it + gets notification | A,B | 🔧 |
| F9 | Open /post/:id direct link; unavailable post shows message | A | ✅ |
| F10 | Delete own post | B | ✅ |
| F11 | Report post → appears in admin moderation queue | B→A | ✅ |
| F12 | Block user from post menu → their posts hidden | C | ✅ |
| F13 | Clergy badge shows on verified clergy posts | A | ✅ |
| F14 | Parish announcement post styling | A | ⏭ |

## 6. Directory & parishes
| ID | Test | Acct | Status |
|---|---|---|---|
| D1 | Directory search by name / city / zip | B | 🔧 |
| D2 | Map view loads, pins clickable | B | ✅ |
| D3 | "Near me" uses location | B | ⏭ |
| D4 | Discovery banner dismiss persists | B | ✅ |
| D5 | Parish page tabs: Feed, About, Events, Groups | B | ✅ |
| D6 | Follow / unfollow parish | B | 🔧 |
| D7 | Mass times / contact info display | B | ✅ |
| D8 | Send message to parish office | B | 🔧 |
| D9 | "Send a correction" mailto link uses the support address | B | 🔧 |
| D10 | Nearby event suggestions from unfollowed parishes | B | ⏭ |

## 7. Events & RSVP
| ID | Test | Acct | Status |
|---|---|---|---|
| E1 | Parish admin creates event | A | ✅ end-before-start is rejected; event created |
| E2 | Parishioner sees event, RSVPs (going / maybe / not going) | B | ✅ |
| E3 | RSVP counts update for admin | A | ✅ Fr. Michael "Going" shows on the admin's RSVP list |
| E4 | Admin deletes event | A | ⏭ |
| E5 | Group event create + RSVP | A,B | 🔧 |

## 8. Groups
| ID | Test | Acct | Status |
|---|---|---|---|
| G1 | Groups list / search | B | ✅ |
| G2 | Create group (name, description, image upload, public/private) | A | ✅ 3-step wizard; created and opened |
| G3 | Join public group | B | ✅ |
| G4 | Request to join private group → admin approves / denies → notification | C→A | ✅ |
| G5 | Group tabs: Feed, Chat, Events, Members, About | B | ✅ |
| G6 | Group chat: send message, other member sees it live | A,B | ✅ message appears live for the other member; word filter blocks and keeps the draft |
| G7 | Group settings: edit details, remove member | A | ✅ edit saved; remove member (#120 fixed) |
| G8 | Leave group | B | ✅ |
| G9 | Delete group | A | ✅ type-the-name confirmation; group, members and chat removed |

## 9. Direct messages
| ID | Test | Acct | Status |
|---|---|---|---|
| DM1 | Start conversation, send message | A→B | ✅ live delivery + "sent you a message" notification |
| DM2 | Recipient sees message + notification; reply | B | ✅ reply live; Report conversation captures their latest message; Block closes the thread and stops their messages |
| DM3 | Blocked user cannot message | C | ✅ |
| DM4 | Empty states ("No connections yet") | C | ✅ |

## 10. Faith tools
| ID | Test | Acct | Status |
|---|---|---|---|
| FA1 | Faith hub page; daily readings card loads (/api/readings) | B | 🔧 |
| FA2 | Saint of the day card; /saints list + /saints/:id detail | B | ✅ |
| FA3 | Prayer requests: post, anonymous option, others can "pray" | B,A | 🔧 |
| FA4 | Prayer journal: add / edit / delete entry (private) | B | 🔧 |
| FA5 | Rosary tracker: log a rosary, streak updates | B | 🔧 |
| FA6 | Liturgy of the Hours page loads | B | ✅ |
| FA7 | Formation programs (Advent / Lent): mark day complete | B | 🔧 |
| FA8 | Morning Offering page | B | ✅ |
| FA9 | Private intentions: add / remove | B | ✅ |
| FA10 | Examination of Conscience (vocation-specific) | B | ✅ |
| FA11 | Confession tracker: log confession | B | ✅ |

## 11. Profile & settings
| ID | Test | Acct | Status |
|---|---|---|---|
| S1 | View own profile; view another user's profile | B | ✅ |
| S2 | Edit profile: name, username, vocation, parish, avatar upload | B | ✅ |
| S3 | Unsaved-changes "Discard / Keep editing" prompt | B | ✅ |
| S4 | Profile visibility (Public / Members only) respected by other user | B,C | ✅ |
| S5 | Language switcher (English / Spanish) — UI translates, persists | B | 🔧 |
| S6 | Notification settings toggles save | B | 🔧 |
| S7 | Blocked users list → unblock | C | ✅ unblock from Settings; messages flow again |
| S8 | Sign out from settings | B | ✅ code check: sign-out clears cached profile/feed/group data (not run on a real account) |
| S9 | Contact page (/contact) form submits | B | ✅ |

## 12. Notifications
| ID | Test | Acct | Status |
|---|---|---|---|
| N1 | In-app notifications list; mark read; tap opens target | B | 🔧 |
| N2 | Unread badge in navigation updates | B | 🔧 |
| N3 | Browser push: enable prompt, receive push from another user's action | B | ✅ |
| N4 | Push dismissed state persists | B | ✅ |

## 13. Parish admin (/parish-admin/:id)
| ID | Test | Acct | Status |
|---|---|---|---|
| PA1 | Dashboard stats load | A | ✅ all four numbers match the database |
| PA2 | Announcements: post + schedule a future post | A | ✅ published; ❌ followers not notified (#115) |
| PA3 | Scheduled post publishes (deliver-scheduled-posts function) | A | ✅ delivered on time by the cron; ❌ no notification (#115) |
| PA4 | Events tab (see §7) | A | ✅ see E1/E3 |
| PA5 | Messages tab: read parishioner message, mark handled | A | ✅ messages load; mark as read updates the count |
| PA6 | Parishioners list | A | ✅ 6 followers listed (CSV export not run — it downloads a file) |
| PA7 | Settings: edit name/address/phone/website/mass times, saves | A | ✅ invalid email rejected; save confirmed |
| PA8 | Billing: tier picker shows $59/$119/$229/$389; Stripe **test** checkout; customer portal | A | ❌ shows "Trial ends August 10, 2026" (in the past) (#116) |
| PA9 | Integrations tab: Facebook connect flow reaches Facebook | A | ✅ Connect builds a valid Facebook authorization link (finishing needs a real Page owner) |

## 14. Pastor / clergy onboarding
| ID | Test | Acct | Status |
|---|---|---|---|
| PO1 | /pastor-setup: claim a parish, submit | C | ✅ |
| PO2 | Verification pending page | C | ✅ |
| PO3 | Site admin approves clergy → C gets parish admin + badge | A | ✅ |

## 15. Organizations
| ID | Test | Acct | Status |
|---|---|---|---|
| O1 | Organizations list / search | B | ✅ |
| O2 | Create organization / chapter request | C | ✅ |
| O3 | Org page tabs: Feed, About, Chapters; contact org | B | ✅ |
| O4 | Org admin: overview, members (add / role / remove) | A | ✅ |
| O5 | Org admin: invites → /join/:code link joins | A→B | ✅ |
| O6 | Org admin: announcements create / delete | A | ✅ |
| O7 | Org admin: events | A | 🔧 |
| O8 | Org admin: chapter requests approve | A | 🔧 |
| O9 | Org admin: settings save | A | ✅ |
| O10 | Org billing: tiers $50/$100/$300/$500 + national; Stripe test checkout | A | ✅ |

## 16. Site admin (/admin)
| ID | Test | Acct | Status |
|---|---|---|---|
| AD1 | Only admins can open /admin (B is refused) | A,B | ✅ |
| AD2 | User list / search; filters (all, clergy, suspended, admin) | A | 🔧 |
| AD3 | Suspend / unsuspend user | A | ✅ |
| AD4 | Grant parish admin / org membership | A | 🔧 |
| AD5 | Parish clusters create / delete | A | 🔧 |
| AD6 | Moderation queue: reported post review | A | ✅ |

## 17. Background jobs & server
| ID | Test | Acct | Status |
|---|---|---|---|
| BG1 | /api/readings returns today's readings | – | ✅ |
| BG2 | Readings + Morning Offering cron endpoints respond (dry check) | – | 🔧 |
| BG3 | distribute-post / send-push / send-form-email functions — no errors in logs during tests | – | ✅ |
| BG4 | Stripe webhook receives test checkout events, subscription saved | – | ✅ |

## 18. Cross-cutting
| ID | Test | Acct | Status |
|---|---|---|---|
| X1 | No console errors on each page visited | all | ✅ |
| X2 | No leftover "Communio" text anywhere in the UI | all | ✅ |
| X3 | Mobile width layout of main screens | B | ✅ |
| X4 | Loading / error / empty states | all | 🔧 |
| X5 | Supabase security advisors — no critical RLS gaps | – | 🔧 |

## 19. Last — destructive
| ID | Test | Acct | Status |
|---|---|---|---|
| Z1 | Delete account (type DELETE) → signed out, data removed | C | ⏭ |
| Z2 | Clean up all `[TEST]` content | A | ⬜ |

---

## Your to-do (blocking items)
- Finish the Stripe **test** checkout in the St. Joseph tab (`checkout.stripe.com`, test card 4242 4242 4242 4242, any future date/CVC) — or allow the Claude extension on checkout.stripe.com — so the parish admin dashboard unlocks for PA1–PA9.
- Stripe → Settings → Public details: change "Communio sandbox" business name to inFold.
- Optional: in Vercel production env add `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (same keys as the Supabase `send-push` function) for web-push reminders.
- Deploy the `test-fixes` branch (merge to main) so the code fixes go live.

## Not covered here (need real devices / store accounts)
- iOS / Android native app (push via Firebase, deep links, camera) — needs app builds + store accounts.
- Real-money Stripe payments — Stripe live mode isn't activated.

## Issues found
| # | Test ID | Problem | Fix | Status |
|---|---|---|---|---|
| 1 | F7/F8/N1 | Like/comment notifications said "Someone …" (name read from auth metadata, not profile); group/parish/org join notices always "Someone" | Use profile full_name | 🔧 |
| 2 | N2 | Nav unread badge didn't drop when notifications were read | Hook instances re-sync via a window event | 🔧 |
| 3 | F7 | "1 likes" / "1 comments" | i18next plural keys | 🔧 |
| 4 | F8 | Comment box avatar showed "M" | Use profile name/avatar | 🔧 |
| 5 | – | Admin chips stripped "St." ("Mary Parish") and cut at 20 chars | Full name + CSS truncation | 🔧 |
| 6 | – | Sidebar said "Parish member" for admins/clergy | Role-aware label | 🔧 |
| 7 | F5 | Prayer requests showed "Like"; notification said "liked your post" | "I will pray" / "N prayers"; "is praying for your intention" | 🔧 |
| 8 | AD2 | Deleted accounts listed in admin users, counted in Total Users, offered in role search | Filter deleted_at | 🔧 |
| 9 | DM1 | Deleted accounts in new-message picker (5× "Beta") | Filter deleted_at | 🔧 |
| 10 | DM1/DM2/G6 | **Realtime never fired for DMs, group chat, comments, prayer requests** — only `notifications` was in the realtime publication | Migration 030 adds them (applied) | 🔧 |
| 11 | DM1 | New conversation missing from sender's list; unread-DM badge never refreshed | List reloads on send/receive; badge recounts on navigation/read/new message | 🔧 |
| 12 | F10 | "Edit post" menu item only said "coming soon" | Implemented inline editing | 🔧 |
| 13 | S7 | Sidebar highlighted Profile and Settings together on settings pages | Fixed active rules | 🔧 |
| 14 | – | Dev only: PWA service worker booted the app twice → crash on reload | Disabled SW in dev | 🔧 |
| 15 | – | Report-post sheet stretches full width on desktop | Cosmetic, not changed | open |
| 16 | – | `posts.like_count` / `comment_count` columns drift (non-authors can't update them under RLS); feed computes counts from rows so UI is correct | Not changed — consider DB triggers | open |
| 17 | – | Profiles have no "Message" button | Suggestion | open |
| 18 | G2 | **Group photos never saved** — the `groups` storage bucket was never created; upload failed silently | Migration 031 creates bucket (owner-scoped write policies replace "any signed-in user can overwrite any group image") | 🔧 applied |
| 19 | G2 | **New group showed 3 members with 1 member** — two triggers both incremented `member_count`, default was 1 | Migration 031 drops the duplicate, default 0, recounts | 🔧 applied |
| 20 | BG2 | **Daily readings & morning-offering reminders have never run** — crashed on load (missing VAPID keys) and `CRON_SECRET` isn't set | Code no longer crashes (FCM still sent); `CRON_SECRET` added to Vercel prod. Takes effect on next deploy. VAPID keys still optional | 🔧 |
| 21 | X5 | **Security: billing portal open to anyone** — `/api/create-portal-session` opened Stripe's portal for any customer ID with no login | Requires signed-in parish/org admin; customer looked up server-side | 🔧 |
| 22 | X5 | Security: `/api/claim-sponsorship-code` trusted `userId` from the request | Uses the session user | 🔧 |
| 23 | X5 | Security: `increment_member_count` / `decrement_member_count` RPCs callable by anyone (even signed out) | Revoked in migration 031 | 🔧 applied |
| 24 | X5 | Checkout endpoints don't check login — but webhook never grants admin rights, so impact is only "pay for someone else's parish" | Not changed | open (low) |
| 25 | X5 | Advisors: 19 functions with mutable search_path; leaked-password protection off | Not changed — enable leaked-password protection in Supabase Auth settings | open (low) |
| 26 | G4 | Group feed empty state said "No groups found" + "Find my parish" | Group-specific copy; "Find my parish" only on home feed | 🔧 |
| 27 | N1 | "1 days ago" | Singular/plural relative times | 🔧 |
| 28 | DM2 | DM notification just said "You have a new message" | "Thomas Rust sent you a message" | 🔧 |
| 29 | E5 | **No way to create a group event anywhere** (tab was always empty) | "New event" form for group admins | 🔧 |
| 30 | E1/E4 | **Security: any user could create events on any parish/group/org**; no DELETE policy so admin delete-event did nothing | Migration 032 (applied) | 🔧 |
| 31 | G7 | **Security: anyone could add themselves to any group — even private — as admin**; no UPDATE policy so "Make Moderator" did nothing | Migration 033 (applied); UI reports RLS no-ops | 🔧 |
| 32 | G7 | Group settings has no way to change the group photo (groups made while uploads were broken can't get one) | Not changed — suggestion | open |
| 33 | D6/D8 | **Parish admins were never notified of new followers or office messages** (clients can't read others' parish_admins rows) | Migration 034: DB triggers send both | 🔧 |
| 34 | X5 | **Security: any user could create any notification for anyone with any sender** (phishing/impersonation) | Migration 034 drops the permissive policy | 🔧 |
| 35 | O8 | Chapter-request notifications used nonexistent columns and never delivered | Fixed insert | 🔧 |
| 36 | PA8 | **A parish/org whose subscription was canceled could never re-subscribe** — billing only offered "Manage subscription" | Offer checkout again when canceled/expired | 🔧 |
| 37 | PA8 | Stripe checkout page shows "Communio sandbox" (Stripe public business name) | Rename in Stripe → Settings → Public details | ⚠ you |
| 38 | FA4/FA5/FA7 | **Prayer Journal, Rosary Tracker, Advent/Lent progress never saved** — their tables (migration 019) were never created | Applied 019; verified journal is private | 🔧 |
| 39 | FA1 | **Readings showed the wrong psalm** (lectionary Ps 100 → Douay Ps 100 = Hebrew 101); credit said USCCB but text is Douay-Rheims | Psalm number mapping + credit line (live after deploy) | 🔧 |
| 40 | FA3 | "1 prayers"; prayer count doesn't update live for others | Plural fixed; live count not changed | 🔧 / open |
| 41 | FA3 | Two separate prayer systems (feed prayer-request posts vs /faith/prayer intentions) — confusing | Design note | open |
| 42 | FA6 | Liturgy of the Hours is fixed text (not the day's office); Benedictus is cut off | Content note | open |
| 43 | FA11 | Confession reminders say "notifications coming soon" | Not built | open |
| 44 | D1 | **Directory search "St Joseph" (no period) found nothing**; same in onboarding & edit-profile parish pickers | Shared punctuation/“Saint”-tolerant search | 🔧 |
| 45 | D7 | "Is this your parish? Contact us to set up…" still shown on parishes that already have an admin | `parish_is_managed()` (mig. 050) | ✅ |
| 46 | D3 | "Near me" needs a browser location prompt Claude can't answer | Test manually | ⏭ |
| 47 | O7/E1 | **Event times saved 4–5 h off** (local time stored as UTC) in parish + org admin event forms and scheduled org announcements | Convert to ISO on save | 🔧 |
| 48 | O5 | **Org invite links never worked** — `hasActiveSub` wasn't passed to the Invites tab, button always disabled | Pass prop | ✅ re-tested (B joined via /join/2U3K0U1N) |
| 49 | O6 | Deleting an org announcement has no confirmation | Not changed | open |
| 50 | — | Admin sidebar links vanished after a long idle (failed lookup with expired token wiped them) | Keep previous result on error; re-check on tab focus | 🔧 |
| 51 | O2/O8 | **Anyone could link their org as a chapter of any national org** (free dashboard); approval never actually linked the chapter (RLS); chapter-request notification never sent; approval notification had no recipient | Mig. 035/036, `approve_chapter_request()` RPC, trigger notification | ✅ |
| 52 | O8 | `.catch()` on Supabase query builders throws (they have no `.catch`) → rest of handler aborted | `.then(ok, err)` | 🔧 |
| 53 | — | **Anyone could insert themselves as ADMIN of any organization** | Mig. 036: self-join = member only | ✅ |
| 54 | AD3 | App shell crashed ("Something went wrong") — realtime channel name re-used after subscribe | Unique channel names (Nav, DMs, comments, group chat) | 🔧 |
| 55 | AD5 | Cluster parish search showed wrong parishes (stale out-of-order results) | Drop stale responses; fuzzy match | ✅ |
| 56 | AD4 | **CRITICAL: any user could make themselves platform admin / verified clergy / premium / unsuspend** by updating own profile | Mig. 037 guard trigger; admin "Assign Pastor" clergy badge now works (was silently failing) | ✅ |
| 57 | — | **Anyone could post into private groups, publish parish announcements anywhere (pushes to whole parish), read private-group posts; authors could un-remove moderated posts; parish admins could grant themselves a paid subscription; DM recipients could rewrite messages** | Mig. 038 | ✅ |
| 58 | F* | like_count / comment_count drift (client-side counters) | DB triggers + recount (mig. 038) | ✅ |
| 59 | PA | **Parish settings save always failed** — `parishes.description` column missing | Added column; shown on About tab | ✅ (DB-verified; UI blocked by trial) |
| 60 | F* | **Deleting your own comment silently did nothing** (no UPDATE policy); comments on private-group posts visible to all | Mig. 039 | ✅ |
| 61 | S5 | Spanish: sidebar, roles, "Sign out", "X days ago", months, post labels stayed English; `<html lang>` never changed | Translated | 🔧 |
| 62 | — | `trigger_distribute_post` had an API token hard-coded in the function body | Removed (mig. 048); rotate the service-role key if you want to be thorough | ✅ |
| 63 | AD3/AD5 | Suspend and cluster delete act immediately, no confirmation | Not changed | open |
| 64 | S6 | **Notification settings were ignored** for anything caused by another user (actor's browser can't read recipient's prefs) | Mig. 040: enforced in DB for all sources | ✅ |
| 66 | D9 | Support address inconsistent: 3 spots used hello@getinfold.app (parish correction link, suspended screen, org checkout error) vs info@ everywhere else | All → info@ (add a hello@ route in Cloudflare if you prefer that one) | 🔧 |
| 67 | S4 | **"Members only" profile visibility was saved but never enforced**; signed-in users could read other users' private columns (Stripe customer ID, donation totals, subscription) | Option B: bio + parish only for people sharing a parish/group/org (`get_profile`, mig. 053); own row via `get_my_profile`; column lock **mig. 054 — apply right after PR #5 is live**. Also fixed a previous profile's parish carrying over | 🔧 |
| 68 | E*/PA* | Both test parishes' subscriptions are `canceled` → parish dashboard, events, announcement styling all wait on the Stripe test checkout | **You** | ⏭ |
| 69 | O5 | **Invite codes listable by anyone (even signed out); use_count never incremented → max uses / expiry not enforced; signed-out invitees lost the invite after sign-in/sign-up** | Mig. 042 RPCs; invite resumes after login | ✅ |
| 70 | O9 | Org admins could set `is_official` badge / `org_type` (incl. "national") themselves | Mig. 042 guard; type read-only in settings | ✅ |
| 71 | PA2 | **Anyone could schedule posts into any parish/group** → published as announcements to all followers by the cron | Mig. 043 | ✅ |
| 72 | — | Sponsorship codes readable by every user; users could insert sponsored activations (billing); join requests could be pre-approved | Mig. 043 | ✅ |
| 73 | PA* | **Checkout APIs had no auth** (anyone could start a subscription / set national for any org or parish); track-return let anyone mark any user returned | Session auth + admin checks; 11 unit tests | ✅ (deploy) |
| 74 | BG4 | **Stripe webhook threw on every billing-event log + one-time donation** (`.catch` on query builder) → 500 + Stripe retries; donation RPC never existed | Fixed; mig. 044 | ✅ (deploy) |
| 75 | PA9 | **Integrations API had no auth**: hijack any parish's webhook/Flocknote, forge Facebook state; server fetched arbitrary URLs (SSRF) | Admin auth, HMAC state, https-only public URLs; 15 tests | ✅ (deploy) |
| 76 | — | No server-side length limits on DMs, parish messages, names, bios, groups, events, orgs; blank posts; duplicate blocks; bad usernames; events ending before start | Mig. 045/046 + form limits | ✅ |
| 77 | F* | **Counter race**: 15 parallel comments → count 15, real 17; first fix deadlocked (29/30 failed) | Mig. 047 (NO KEY UPDATE lock): 30/30 in 0.3 s, exact | ✅ |
| 78 | — | **send-push / distribute-post / send-form-email were open to anyone** (push any text to any user, broadcast fake parish announcements to Facebook/Flocknote/emails, spam info@). Contact form & announcement emails not HTML-escaped | Pointer + atomic claim (mig. 048), escaping; hard-coded key removed from DB (closes 62). Verified live | ✅ |
| 79 | — | avatars/posts buckets: any size, any type (HTML/SVG with script) | Mig. 049; verified live | ✅ |
| 80 | PO1 | Pastor setup let a priest claim/pay for a parish someone already manages | Mig. 050 check in setup + parish page (also closes 45) | ✅ |
| 81 | PO3 | **No way to approve pastors in the app** (webhook email said to run SQL by hand); Assign Pastor left the user stuck "pending" | Admin "Pending pastor applications" + notification | ✅ |
| 82 | — | **Anyone could send anyone a notification of any type/text** (fake "post reported"/"verified" phishing, pushed to phone) | Mig. 052 per-type rules | ✅ |
| 83 | PO2 | Pending page promises an approval *email*; none is sent (in-app notification + push only) | Not changed | open |
| 84 | — | Sponsorship codes are 6 chars with no rate limit on the claim API (guessable in theory) | Not changed | open |
| 85 | BG4 | Two webhook implementations + Stripe sandbox had 2 inFold endpoints (old getcommunio.app domain; dead catholic-app-eta.vercel.app → 404) | Stripe now points at app.getinfold.app/api/stripe-webhook; unused Supabase function deleted | ✅ |
| 86 | — | Private group member lists readable by any user | Not changed | open |
| 87 | O10 | Test checkout started on localhost returns to app.getinfold.app (Stripe return URL is always the live site) — 'Access denied' when that browser is signed in as a different account. Test-setup artifact only; real users start and finish on the same site | Not a bug | ⏭ |
| 95 | — | Stripe account is a **sandbox** — production app runs on test keys; real payments need live keys + live webhook to app.getinfold.app | **You** (when ready to launch) | open |
| 96 | — | Sandbox also sends events to `perpetuationlink.com` ("Perpetuation Link subscriptions") | **You:** confirm it's yours | open |
| 97 | PA* | 'Could not start trial' for Beta: the password reset signed out Beta's other sessions (expected Supabase behavior), but the toast hid the server's 'please sign in again' | Toast shows the server's reason | ✅ |
| 98 | — | Only an assigned pastor can manage a parish: 14 management actions by a non-admin on someone else's parish all blocked; dashboard redirects non-admins; parish_admins writable only by platform admins | — | ✅ |
| 99 | — | **Existing parish admin renewing was put back into 'pending pastor'** (banner, verification email, Application-received page) | Webhook/success URL distinguish existing admins | ✅ |
| 100 | F* | Feed comment counts included removed comments (post showed 37 vs 2) | Count visible comments only | ✅ |
| 101 | N* | **Like/unlike (follow/unfollow, join/leave) re-sent the notification + push every time** — phone spam | Same-person repeats within 24 h dropped (mig. 056) | ✅ |
| 102 | — | **A blocked user could still comment on / like the blocker's posts, and the blocker was notified with a preview** | Refused + notifications from blocked users dropped (mig. 057) | ✅ |
| 103 | S6 | **'Group Activity' switch controlled an unused setting**; join approvals stayed off forever after 'Turn off all' | Switch drives both; rows resynced (mig. 058) | ✅ |
| 104 | S6 | Pastors couldn't turn off 'message to your parish' notifications; no 'Turn on all' | New setting + button | ✅ |
| 105 | — | Prayer count stayed 0 on others' intentions (Faith page showed 🙏 0) | Counter runs as definer (mig. 059) | ✅ |
| 106 | N* | Group-post / new-org-member notifications didn't name the group/org | Named | ✅ |
| 107 | O9 | **Org settings saved invalid emails and `javascript:` logo URLs**; logo never displayed; About tab omitted address and hours; 'Is this your organization?' shown on managed orgs | Validation (+ parish settings), logo shown (https only), address+hours shown | ✅ |
| 108 | O4 | **An org's/group's only admin could demote themselves or leave** (orphaned org + subscription) | Refused with message (mig. 060); dropdown snaps back | ✅ |
| 109 | O6 | **Org announcements were never shown to members or sent; scheduled ones never published** | Shown on org page, members notified + push, cron publishes (mig. 061–062). Verified on time | ✅ |
| 110 | O7 | **Org events were never shown to members** | Events tab with RSVP | ✅ |
| 111 | O3 | Org Contact messaged the creator even after they stepped down, without a notification; hidden unless an email/phone was listed | Messages current admins + notifies (mig. 063) | ✅ |
| 112 | PA5 | Parishioners can message a parish whose dashboard is locked (no subscription) — pastor is notified but can't read it | **You:** let pastors read messages without a subscription, or hide Contact on unsubscribed parishes? | open |
| 113 | S6 | 'Event Reminders' and 'Confession Reminders' switches exist but nothing ever sends those notifications | **You:** build them, or hide the switches? | open |
| 114 | — | Suggestions: notify a member when promoted to admin; morning-offering/readings push times are fixed in UTC (6 AM / 12 PM shift by an hour with daylight saving) | Not changed | open |
| 115 | PA2/PA3 | Announcements posted from the parish dashboard (now or scheduled) notified nobody — no in-app alert, no push. Only the feed composer notified followers, and it never makes announcements | Migration 068: database trigger notifies followers of every announcement ("St. Joseph Parish: Parish picnic") | fixed — 068 applied; verified: "[TEST] Bake sale" notified all 5 followers, not the author |
| 116 | PA8 | After checkout the webhook kept the previous (canceled) subscription's id and trial date, and ignored `customer.subscription.created`; newer Stripe API also moved `current_period_end` onto the items, so it was always empty. Billing showed a trial ending in the past | Webhook fetches the new subscription at checkout, handles `subscription.created`, reads the period end from either place; unit test added. St. Joseph's row corrects itself on Stripe's next update for that subscription | fixed (deploy) |
| 117 | — | Webhook logged the first 10 characters of its signing secret on every request | Log line removed | fixed (deploy) |
| 118 | PA | Opening a parish dashboard link when the saved login had expired (e.g. after restarting the browser) sent a real admin to Home: any failed access check counted as "not an admin". Platform admins could be bounced the same way before their profile loaded. Same on org dashboards (showed "Access denied") | Access check retries briefly, waits for the profile, and only redirects on a real "no"; otherwise shows "Couldn't load — Try again" | fixed |
| 119 | — | Migrations 066/067/068 applied (SQL editor). Verified live: report on a comment → admin notified → "Remove content" hides it and closes the report; "bullshit" blocked with the explanation and the text kept, clean comment posts; event reminder sent once to Fr. Michael ~23½ h before the event | — | verified |
| 120 | G7 | After removing a member, the group header kept the old member count (and no confirmation); every join/leave flashed the whole page skeleton | Header refreshes in place; "Removed from the group." / "Now a group admin." toasts | fixed |
| 121 | FA3 | **Privacy:** anonymous prayer requests sent the author's name, id and photo to every member's browser — only the screen hid it | Migration 069: members read through `prayer_request_feed`, which omits the author of anonymous requests (except to the author); the table is readable only by its author; "someone prayed for you" notifications move into the database. The list now refreshes on return instead of live | fixed (needs 069) |
| 94 | AU5 | **Reset password: every error silently did nothing** (e.g. reusing the old password) — page read `.message` on a string | Shows the error; 'must be different' message | ✅ |
| 88 | — | Fr. Michael's local tab crashed on load ("removeChild") — stale dev service worker registered before it was disabled, booting the app twice | Unregistered in the 3 local tabs (local-only) | ✅ |
| 89 | G9 | **"Delete group" did nothing** — no DELETE policy, app navigated away as if it worked | Mig. 055 + result check | ✅ |
| 90 | X4 | /group/<missing id> showed a skeleton forever | Not-found state | ✅ |
| 91 | X4 | **Offline, screens claimed "No notifications/messages yet", "Parish not found", "Join a parish"** | Connection banner when the server is unreachable | ✅ |
| 92 | — | Live-site sweep after mig. 054 (22 screens as Beta) + admin page as Thomas: no errors | — | ✅ |
| 93 | PA* | Billing portal (live API): own org 200, no token / forged token 401, other user's org 403 | — | ✅ |
| 65 | N3/N4 | Web push needed VAPID keys | Keys rotated & set; live push delivered (sent 1, failed 0) | ✅ |
