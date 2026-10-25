# inFold — complete function inventory

Every user-facing action, background job and server piece, built from the code
(54 routes, 51 pages, 52 components, 19 hooks, 15 API files, 4 edge functions,
47 triggers, 5 cron jobs, 36 RPCs). Each line is one thing to test.

Status: ✅ verified working · 🔧 fixed this pass · ⚠️ issue noted · ⬜ not yet run ·
🚫 can't be automated here (needs a real phone / email inbox / third-party account)

## 1. Accounts & auth
| ID | Function | Status |
|---|---|---|
| A1 | Sign up (email, password strength meter, vocation, parish search, terms checkbox) | 🚫 creates a real account |
| A2 | Confirmation email + resend from Check Email page | 🚫 email |
| A3 | Log in / wrong password message / suspended-account handling | ⬜ |
| A4 | Forgot password → email → reset page (strength meter, same-password error) | 🚫 email |
| A5 | Session restore after reload / expired token refresh | ⬜ |
| A6 | Sign out clears cached profile, feed, groups | ✅ code + previous run |
| A7 | Protected routes redirect signed-out visitors to /login | ⬜ |
| A8 | Delete account (type DELETE) → content hidden, purge after 90 days | 🚫 destroys an account |
| A9 | Track return (welcome-back tracking) | ⬜ |

## 2. Onboarding
| ID | Function | Status |
|---|---|---|
| O1 | Search & follow a parish / set home parish | ⬜ |
| O2 | Group suggestions → join | ⬜ |
| O3 | Finish / skip → home | ⬜ |
| O4 | Pastor onboarding: ask → parish → size → trial (checkout) / skip | ⬜ |
| O5 | Pastor verification pending page | ⬜ |
| O6 | Org invite link /join/:code (lookup, expired, used up, redeem, already member, signed-out resume) | ✅ invalid, already member, redeem (+ use count) |

## 3. Home & feed
| ID | Function | Status |
|---|---|---|
| F1 | Home loads: readings card, my groups row, feed filters, admin quick access, welcome card (new users) | ⬜ |
| F2 | Feed filters: My Feed / My Parish / My Groups / Prayer / Events | ⬜ |
| F3 | Infinite scroll / load more; new-posts pill; pull to top | ⬜ |
| F4 | Create post: text, photo (type/size checks), destination picker (parish / group / org), prayer-request toggle | ⬜ |
| F5 | Word filter on posts & comments | ✅ |
| F6 | Like / unlike; counts; notification to author | ✅ |
| F7 | Comment / delete own comment; notification | ✅ |
| F8 | Edit own post | ✅ (word filter applies to edits) |
| F9 | Delete own post (confirm) | ✅ |
| F10 | Report post / block author from post menu | ✅ (report) ⬜ (block from post) |
| F11 | Share post (native share / copy link) | ✅ |
| F12 | Fullscreen photo viewer (Escape, close) | 🔧 |
| F13 | Post page /post/:id (found / not found / back) | ✅ |
| F14 | Announcement styling (title + body, badge) | ⬜ |
| F15 | Home top bar: Search → directory, Messages badge | ⬜ |

## 4. Parishes & directory
| ID | Function | Status |
|---|---|---|
| D1 | Search by name/diocese, city/zip, state; sorted; "first 50" hint | ✅ |
| D2 | Near me (location permission) | ⬜ |
| D3 | Map view (clustered markers, org markers) | ⬜ |
| D4 | Follow / unfollow / set as my parish | ⬜ |
| D5 | Parish page tabs: Feed, Events, Groups, About (mass times, contact) | ⬜ |
| D6 | Contact parish (message to admin inbox) | ✅ (earlier round) |
| D7 | Send a correction (mailto) | ⬜ |
| D8 | Nearby event suggestions from unfollowed parishes (+ dismiss, follow & view) | ⬜ |
| D9 | Directory discovery banner (dismiss) | ⬜ |

## 5. Parish dashboard (admin)
| ID | Function | Status |
|---|---|---|
| PA1 | Dashboard stats | ✅ |
| PA2 | Announcements: publish, schedule, send now, delete | ✅ (publish, schedule) 🔧 delete asks first, checks result |
| PA3 | Scheduled delivery cron | ✅ |
| PA4 | Events: create (validation), delete, attendee list | ✅ (create) 🔧 delete asks first, checks result |
| PA5 | Mass times editor | ⬜ |
| PA6 | Parishioners list + CSV export | ✅ (list) |
| PA7 | Messages inbox: read, mark read, mark all read, reply | ✅ |
| PA8 | Billing: tier picker, start trial, manage (portal), history | ✅ (status) |
| PA9 | Integrations: Facebook start, Flocknote, website webhook, custom email; toggle; disconnect | ✅ (Facebook start) ⬜ (others) |
| PA10 | Settings: edit details (validation) | ✅ |
| PA11 | Access check (non-admin redirected, retry on failure) | ✅ |

## 6. Groups
| ID | Function | Status |
|---|---|---|
| G1 | Groups page: search, category chips, my groups, suggested, all | ⬜ |
| G2 | Create group (3 steps, photo, public/private) | ✅ |
| G3 | Join public / request private / leave (confirm) / cancel request | ✅ 🔧 a request couldn't be withdrawn (new Cancel request) |
| G4 | Admin approves/denies join requests (+ notifications) | ✅ 🔧 results unchecked; pending dot only appeared after opening Members |
| G5 | Group feed posts | ✅ |
| G6 | Group chat live; delete own; report others; word filter | ✅ |
| G7 | Group events: create, RSVP | ✅ 🔧 private-group events readable by everyone (077) |
| G8 | Members: promote, remove (header count) | ✅ ⚠️ "Moderator" role grants nothing; private rosters were public (077) |
| G9 | Settings: edit, delete (type name) | ✅ 🔧 notifications left pointing at deleted groups (078) |
| G10 | Report group | ✅ (UI) |

## 7. Organizations
| ID | Function | Status |
|---|---|---|
| OR1 | Organizations list: search, category, state filters | 🔧 chapters saved as 'other' matched no filter (075) |
| OR2 | Create organization (standalone / chapter request) | ⬜ |
| OR3 | Org page: join, announcements, events, chapters, about, contact | 🔧 visitors saw "0 members" (076); join/leave ✅ |
| OR4 | Org admin overview, members (roles, remove, last-admin guard) | ✅ 🔧 remove now asks first; named buttons |
| OR5 | Org announcements: publish, schedule, send now, delete (+ cron) | ✅ publish, notify, delete 🔧 delete asks first |
| OR6 | Org events + attendees | ✅ create, validation, RSVP, attendees, delete 🔧 delete asks first |
| OR7 | Invites: create, copy link, delete | ✅ 🔧 delete asks first |
| OR8 | Chapters: approve/deny requests, provision chapter | ✅ list 🔧 chapter counts (076), category inherited ⬜ provision (creates a real org) |
| OR9 | Org settings (hours editor, validation) | ✅ |
| OR10 | Org billing (trial, manage, tier upgrade banner) | ✅ status + banner 🚫 Stripe portal |

## 8. Messages
| ID | Function | Status |
|---|---|---|
| M1 | Conversation list, unread badges, new conversation picker | ⬜ |
| M2 | Send / receive live; mark read; notification; deep link ?to= | ✅ |
| M3 | Report conversation / block from conversation | ✅ |

## 9. Faith
| ID | Function | Status |
|---|---|---|
| FA1 | Faith hub, readings (Ordinary / Traditional toggle), share readings | ✅ 🔧 toggle state for screen readers |
| FA2 | Prayer requests: post (anonymous), pray, load more, report; anonymity | ✅ |
| FA3 | Prayer journal (end-to-end encrypted) | ✅ |
| FA4 | Rosary tracker: log, streak, mysteries of the day | ✅ |
| FA5 | Liturgy of the Hours (hour tabs, current hour) | ✅ 🔧 tab state for screen readers |
| FA6 | Formation programs (Advent / Lent): mark day complete / incomplete | 🔧 button nested in button; ✅ after |
| FA7 | Morning offering: mark prayed | 🔧 stored a new key every day; ✅ after |
| FA8 | Examination of conscience (sections toggle) | ✅ 🔧 expanded state for screen readers |
| FA9 | Private intentions: add, prayed, answered, back to praying, remove (confirm) | ✅ |
| FA10 | Confession tracker: log, history, clear (confirm), reminder interval | ✅ 🔧 reminder save errors were ignored |
| FA11 | Saints: today's saint, library, search, saint page, favourite, share | ✅ |

## 10. Notifications
| ID | Function | Status |
|---|---|---|
| N1 | List, grouping (today / yesterday / this week), tap → destination | ✅ |
| N2 | Mark all read, swipe to dismiss, unread badges | ⬜ |
| N3 | Preferences: each switch saves and is honoured server-side; turn all off/on | ✅ (earlier rounds) |
| N4 | Web push subscribe / unsubscribe; native push token | 🚫 needs a device |
| N5 | Push prompt (after 3rd session), install prompt | ⬜ |

## 11. Profile & settings
| ID | Function | Status |
|---|---|---|
| P1 | Me tab: profile, "You manage", shortcuts | ✅ |
| P2 | Other profile: limited/private view, message, block, report | ✅ (report, block) |
| P3 | Edit profile: name, username (availability), bio, avatar, vocation, parish | ⬜ |
| P4 | Settings: visibility, blocked users, language, about links, sign out (confirm) | ✅ (language, blocked) ⬜ (visibility) |
| P5 | Contact us form | ⬜ |

## 12. Platform admin
| ID | Function | Status |
|---|---|---|
| AD1 | Stats | ✅ 🔧 "Posts today" counted deleted posts |
| AD2 | Users search/filter, suspend/unsuspend (self/admin guarded) | ✅ |
| AD3 | Flagged posts: dismiss, hide, suspend author | 🔧 Hide Post silently did nothing and closed the flag (079) |
| AD4 | Other reports: dismiss, remove, suspend | ✅ |
| AD5 | Assign parish pastor / org admin | ⬜ |
| AD6 | Pending pastors approve / decline | ⬜ |
| AD7 | Parish clusters: create, add/remove parish, delete | ✅ 🔧 delete had no confirmation; remove button was labelled "Close" |

## 13. Marketing site & public pages
| ID | Function | Status |
|---|---|---|
| W1 | Marketing home, features, for parishes (application form), about, contact form | ✅ pages, images, links 🚫 form submit sends real email |
| W2 | Terms, privacy, content policy, delete-account info, 404 | ⬜ |
| W3 | Pitch deck page | ✅ |

## 14. Server: API endpoints (Vercel)
| ID | Function | Status |
|---|---|---|
| S1 | Unauthenticated requests refused (all) | ✅ |
| S2 | create-parish/org-checkout-session, create-portal-session (auth + ownership) | ✅ (unit tests) |
| S3 | stripe-webhook (signature, checkout, created/updated/deleted, payment failed) | ✅ (unit tests + live resend) |
| S4 | delete-account | 🚫 |
| S5 | integrations (facebook start/callback, flocknote, webhook — SSRF guarded) | ✅ |
| S6 | readings (date validation, caching) | ✅ 🔧 impossible dates (2026-13-99) went to the upstream sites; now 400 |
| S7 | morning-offering / readings reminders (cron secret) | ✅ refuse callers without the secret (401) |
| S8 | claim-sponsorship-code, track-return, native-return | ✅ auth enforced; native-return can't redirect off-site |

## 15. Server: edge functions, cron, triggers
| ID | Function | Status |
|---|---|---|
| E1 | send-push (routes, titles, atomic claim) | ✅ deployed v13 |
| E2 | distribute-post (integrations, webhook re-check) | ✅ deployed v9 |
| E3 | deliver-scheduled-posts | ✅ |
| E4 | send-form-email (contact / parish application emails) | ⬜ |
| E5 | Cron: event reminders, confession reminders, org announcements, scheduled posts, purge deleted accounts | ✅ (event, scheduled) ⬜ (others) |
| E6 | Triggers: word filter, counts (likes, comments, members, RSVPs, prayers), guards (post/comment/DM/group/org/parish/profile updates), notification preferences / repeats / blocked, last-admin guards, deleted-profile content hiding, notification cleanup | ⬜ systematic check |

## 16. Cross-cutting
| ID | Function | Status |
|---|---|---|
| X1 | Speed: time to content on every main screen; slow queries; bundle sizes | 🔧 data loaded twice at startup + hourly; screens < ~350 ms |
| X2 | Accessibility (axe) on every screen | ✅ (24 screens) |
| X3 | Phone layout at 390px, 200% text | ✅ |
| X4 | Offline banner / reconnect | 🔧 two offline messages, one promising changes would sync (nothing is queued) |
| X5 | Error boundaries (route crash shows recovery) | ✅ all 45 routes open with no crash or failed request |
| X6 | Spanish translation coverage | ⚠️ all 516 keys translated, but ~30 screens don't use translations (decision for owner) |
| X7 | Unused code removal (verified) | 🔧 6 files, 9 functions, 5 packages, 7 DB functions (074, unapplied) |
