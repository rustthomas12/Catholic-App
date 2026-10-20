# inFold — Full Feature Test Plan

**Resume point:** PO1–PO3 (needs Fr. Michael signed back in on :5175), S8 sign-out last, PA* (after Stripe test checkout), Z2 cleanup. Migrations 035–040 applied to prod; code fixes on `test-fixes` (not deployed).

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
| M4 | "Open app" / sign-up links go to app.getinfold.app | – | ⬜ |
| M5 | /pitch page loads | – | ✅ |
| M6 | Unknown path falls back to Home | – | ✅ |
| M7 | Mobile width (375px) layout — no horizontal scroll | – | ✅ |

## 2. Public app pages — no login
| ID | Test | Acct | Status |
|---|---|---|---|
| P1 | /terms, /privacy, /policy, /delete-account render with inFold name + correct emails | – | ✅ |
| P2 | Protected route (e.g. /groups) redirects to /login when signed out | – | ✅ |
| P3 | 404 page for unknown route | – | ⬜ |
| P4 | PWA manifest/icons load; install prompt doesn't error | – | ✅ |

## 3. Authentication
| ID | Test | Acct | Status |
|---|---|---|---|
| AU1 | Sign up (email + password) → /check-email | C | ⏭ |
| AU2 | Confirmation email arrives from **inFold <noreply@getinfold.app>**, link works | C | ⏭ |
| AU3 | Log in / log out | A,B | ✅ |
| AU4 | Wrong password shows friendly error | B | ⬜ |
| AU5 | Forgot password → email arrives (inFold branding) → reset works | B | ⬜ |
| AU6 | Session persists across reload | A | ✅ |
| AU7 | Suspended user cannot use the app (after A suspends C in admin) | C | ⬜ |

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
| F14 | Parish announcement post styling | A | ⬜ |

## 6. Directory & parishes
| ID | Test | Acct | Status |
|---|---|---|---|
| D1 | Directory search by name / city / zip | B | 🔧 |
| D2 | Map view loads, pins clickable | B | ✅ |
| D3 | "Near me" uses location | B | ⏭ |
| D4 | Discovery banner dismiss persists | B | ⬜ |
| D5 | Parish page tabs: Feed, About, Events, Groups | B | ✅ |
| D6 | Follow / unfollow parish | B | 🔧 |
| D7 | Mass times / contact info display | B | ✅ |
| D8 | Send message to parish office | B | 🔧 |
| D9 | "Send a correction" mailto link uses hello@getinfold.app | B | ⬜ |
| D10 | Nearby event suggestions from unfollowed parishes | B | ⬜ |

## 7. Events & RSVP
| ID | Test | Acct | Status |
|---|---|---|---|
| E1 | Parish admin creates event | A | ⬜ |
| E2 | Parishioner sees event, RSVPs (going / maybe / not going) | B | ✅ |
| E3 | RSVP counts update for admin | A | ⬜ |
| E4 | Admin deletes event | A | ⬜ |
| E5 | Group event create + RSVP | A,B | 🔧 |

## 8. Groups
| ID | Test | Acct | Status |
|---|---|---|---|
| G1 | Groups list / search | B | ✅ |
| G2 | Create group (name, description, image upload, public/private) | A | 🔧 |
| G3 | Join public group | B | ✅ |
| G4 | Request to join private group → admin approves / denies → notification | C→A | ✅ |
| G5 | Group tabs: Feed, Chat, Events, Members, About | B | ✅ |
| G6 | Group chat: send message, other member sees it live | A,B | 🔧 |
| G7 | Group settings: edit details, remove member | A | 🔧 |
| G8 | Leave group | B | ✅ |
| G9 | Delete group | A | ⬜ |

## 9. Direct messages
| ID | Test | Acct | Status |
|---|---|---|---|
| DM1 | Start conversation, send message | A→B | 🔧 |
| DM2 | Recipient sees message + notification; reply | B | 🔧 |
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
| S4 | Profile visibility (Public / Members only) respected by other user | B,C | ⬜ |
| S5 | Language switcher (English / Spanish) — UI translates, persists | B | 🔧 |
| S6 | Notification settings toggles save | B | 🔧 |
| S7 | Blocked users list → unblock | C | 🔧 |
| S8 | Sign out from settings | B | ⬜ |
| S9 | Contact page (/contact) form submits | B | ✅ |

## 12. Notifications
| ID | Test | Acct | Status |
|---|---|---|---|
| N1 | In-app notifications list; mark read; tap opens target | B | 🔧 |
| N2 | Unread badge in navigation updates | B | 🔧 |
| N3 | Browser push: enable prompt, receive push from another user's action | B | ⏭ |
| N4 | Push dismissed state persists | B | ⏭ |

## 13. Parish admin (/parish-admin/:id)
| ID | Test | Acct | Status |
|---|---|---|---|
| PA1 | Dashboard stats load | A | ⬜ |
| PA2 | Announcements: post + schedule a future post | A | ⬜ |
| PA3 | Scheduled post publishes (deliver-scheduled-posts function) | A | ⬜ |
| PA4 | Events tab (see §7) | A | ⬜ |
| PA5 | Messages tab: read parishioner message, mark handled | A | ⬜ |
| PA6 | Parishioners list | A | ⬜ |
| PA7 | Settings: edit name/address/phone/website/mass times, saves | A | ⬜ |
| PA8 | Billing: tier picker shows $59/$119/$229/$389; Stripe **test** checkout; customer portal | A | 🔧 |
| PA9 | Integrations tab: Facebook connect flow reaches Facebook | A | ⬜ |

## 14. Pastor / clergy onboarding
| ID | Test | Acct | Status |
|---|---|---|---|
| PO1 | /pastor-setup: claim a parish, submit | C | ⬜ |
| PO2 | Verification pending page | C | ⬜ |
| PO3 | Site admin approves clergy → C gets parish admin + badge | A | ⬜ |

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
| O10 | Org billing: tiers $50/$100/$300/$500 + national; Stripe test checkout | A | ⏭ |

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
| BG3 | distribute-post / send-push / send-form-email functions — no errors in logs during tests | – | ⬜ |
| BG4 | Stripe webhook receives test checkout events, subscription saved | – | ⬜ |

## 18. Cross-cutting
| ID | Test | Acct | Status |
|---|---|---|---|
| X1 | No console errors on each page visited | all | ✅ |
| X2 | No leftover "Communio" text anywhere in the UI | all | ✅ |
| X3 | Mobile width layout of main screens | B | ✅ |
| X4 | Loading / error / empty states | all | ⬜ |
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
| 45 | D7 | "Is this your parish? Contact us to set up…" still shown on parishes that already have an admin | Not changed | open |
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
| 62 | — | `trigger_distribute_post` has an API token hard-coded in the function body — check which key it is and move it to Vault/secret | **You** | open |
| 63 | AD3/AD5 | Suspend and cluster delete act immediately, no confirmation | Not changed | open |
| 64 | S6 | **Notification settings were ignored** for anything caused by another user (actor's browser can't read recipient's prefs) | Mig. 040: enforced in DB for all sources | ✅ |
| 65 | N3/N4 | Web push can't be tested until VAPID keys are set in Vercel (see your to-do) | **You** | ⏭ |
