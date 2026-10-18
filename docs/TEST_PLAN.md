# inFold — Full Feature Test Plan

Three accounts, each signed in on its own local copy of the app (separate origins keep separate sessions):

| Account | Origin | Role during testing |
|---|---|---|
| **A** — Admin | http://localhost:5173 | Site admin **and** parish admin of a test parish. Owns test org + group. |
| **B** — Parishioner | http://localhost:5174 | Regular user who follows A's parish. Main "other person" for social features. |
| **C** — Newcomer | http://localhost:5175 | Fresh account. Covers signup/onboarding, pastor onboarding, org chapter requests, blocking, and (last) account deletion. |

All three local copies use the production database and forward `/api/*` to `https://app.getinfold.app`.
Test content is prefixed **`[TEST]`** so it is easy to find and remove afterwards.

Status key: ⬜ not run · ✅ pass · ❌ fail (see Issues) · 🔧 fixed · ⏭ skipped (reason noted)

---

## 1. Marketing site (getinfold.app) — no login
| ID | Test | Acct | Status |
|---|---|---|---|
| M1 | Home page loads, inFold branding, nav links work | – | ⬜ |
| M2 | /features, /parishes, /about, /contact pages render | – | ⬜ |
| M3 | Contact form submits and email arrives at info@getinfold.app | – | ⬜ |
| M4 | "Open app" / sign-up links go to app.getinfold.app | – | ⬜ |
| M5 | /pitch page loads | – | ⬜ |
| M6 | Unknown path falls back to Home | – | ⬜ |
| M7 | Mobile width (375px) layout — no horizontal scroll | – | ⬜ |

## 2. Public app pages — no login
| ID | Test | Acct | Status |
|---|---|---|---|
| P1 | /terms, /privacy, /policy, /delete-account render with inFold name + correct emails | – | ⬜ |
| P2 | Protected route (e.g. /groups) redirects to /login when signed out | – | ⬜ |
| P3 | 404 page for unknown route | – | ⬜ |
| P4 | PWA manifest/icons load; install prompt doesn't error | – | ⬜ |

## 3. Authentication
| ID | Test | Acct | Status |
|---|---|---|---|
| AU1 | Sign up (email + password) → /check-email | C | ⬜ |
| AU2 | Confirmation email arrives from **inFold <noreply@getinfold.app>**, link works | C | ⬜ |
| AU3 | Log in / log out | A,B | ⬜ |
| AU4 | Wrong password shows friendly error | B | ⬜ |
| AU5 | Forgot password → email arrives (inFold branding) → reset works | B | ⬜ |
| AU6 | Session persists across reload | A | ⬜ |
| AU7 | Suspended user cannot use the app (after A suspends C in admin) | C | ⬜ |

## 4. Onboarding
| ID | Test | Acct | Status |
|---|---|---|---|
| ON1 | New user lands on /onboarding; can search & follow a parish | C | ⬜ |
| ON2 | Onboarding group suggestions — join a group | C | ⬜ |
| ON3 | Finishing onboarding lands on home feed | C | ⬜ |
| ON4 | Location-based parish suggestion (allow/deny browser location) | C | ⬜ |

## 5. Home feed & posts
| ID | Test | Acct | Status |
|---|---|---|---|
| F1 | Feed loads posts from followed parish + groups | B | ⬜ |
| F2 | Feed filters work | B | ⬜ |
| F3 | Create text post (destination: parish / group) | B | ⬜ |
| F4 | Create post with image (≤5 MB); >5 MB rejected | B | ⬜ |
| F5 | Prayer-request toggle on post | B | ⬜ |
| F6 | Character counter / max length | B | ⬜ |
| F7 | Like / react to post; count updates for other user | A,B | ⬜ |
| F8 | Comment on post; other user sees it + gets notification | A,B | ⬜ |
| F9 | Open /post/:id direct link; unavailable post shows message | A | ⬜ |
| F10 | Delete own post | B | ⬜ |
| F11 | Report post → appears in admin moderation queue | B→A | ⬜ |
| F12 | Block user from post menu → their posts hidden | C | ⬜ |
| F13 | Clergy badge shows on verified clergy posts | A | ⬜ |
| F14 | Parish announcement post styling | A | ⬜ |

## 6. Directory & parishes
| ID | Test | Acct | Status |
|---|---|---|---|
| D1 | Directory search by name / city / zip | B | ⬜ |
| D2 | Map view loads, pins clickable | B | ⬜ |
| D3 | "Near me" uses location | B | ⬜ |
| D4 | Discovery banner dismiss persists | B | ⬜ |
| D5 | Parish page tabs: Feed, About, Events, Groups | B | ⬜ |
| D6 | Follow / unfollow parish | B | ⬜ |
| D7 | Mass times / contact info display | B | ⬜ |
| D8 | Send message to parish office | B | ⬜ |
| D9 | "Send a correction" mailto link uses hello@getinfold.app | B | ⬜ |
| D10 | Nearby event suggestions from unfollowed parishes | B | ⬜ |

## 7. Events & RSVP
| ID | Test | Acct | Status |
|---|---|---|---|
| E1 | Parish admin creates event | A | ⬜ |
| E2 | Parishioner sees event, RSVPs (going / maybe / not going) | B | ⬜ |
| E3 | RSVP counts update for admin | A | ⬜ |
| E4 | Admin deletes event | A | ⬜ |
| E5 | Group event create + RSVP | A,B | ⬜ |

## 8. Groups
| ID | Test | Acct | Status |
|---|---|---|---|
| G1 | Groups list / search | B | ⬜ |
| G2 | Create group (name, description, image upload, public/private) | A | ⬜ |
| G3 | Join public group | B | ⬜ |
| G4 | Request to join private group → admin approves / denies → notification | C→A | ⬜ |
| G5 | Group tabs: Feed, Chat, Events, Members, About | B | ⬜ |
| G6 | Group chat: send message, other member sees it live | A,B | ⬜ |
| G7 | Group settings: edit details, remove member | A | ⬜ |
| G8 | Leave group | B | ⬜ |
| G9 | Delete group | A | ⬜ |

## 9. Direct messages
| ID | Test | Acct | Status |
|---|---|---|---|
| DM1 | Start conversation, send message | A→B | ⬜ |
| DM2 | Recipient sees message + notification; reply | B | ⬜ |
| DM3 | Blocked user cannot message | C | ⬜ |
| DM4 | Empty states ("No connections yet") | C | ⬜ |

## 10. Faith tools
| ID | Test | Acct | Status |
|---|---|---|---|
| FA1 | Faith hub page; daily readings card loads (/api/readings) | B | ⬜ |
| FA2 | Saint of the day card; /saints list + /saints/:id detail | B | ⬜ |
| FA3 | Prayer requests: post, anonymous option, others can "pray" | B,A | ⬜ |
| FA4 | Prayer journal: add / edit / delete entry (private) | B | ⬜ |
| FA5 | Rosary tracker: log a rosary, streak updates | B | ⬜ |
| FA6 | Liturgy of the Hours page loads | B | ⬜ |
| FA7 | Formation programs (Advent / Lent): mark day complete | B | ⬜ |
| FA8 | Morning Offering page | B | ⬜ |
| FA9 | Private intentions: add / remove | B | ⬜ |
| FA10 | Examination of Conscience (vocation-specific) | B | ⬜ |
| FA11 | Confession tracker: log confession | B | ⬜ |

## 11. Profile & settings
| ID | Test | Acct | Status |
|---|---|---|---|
| S1 | View own profile; view another user's profile | B | ⬜ |
| S2 | Edit profile: name, username, vocation, parish, avatar upload | B | ⬜ |
| S3 | Unsaved-changes "Discard / Keep editing" prompt | B | ⬜ |
| S4 | Profile visibility (Public / Members only) respected by other user | B,C | ⬜ |
| S5 | Language switcher (English / Spanish) — UI translates, persists | B | ⬜ |
| S6 | Notification settings toggles save | B | ⬜ |
| S7 | Blocked users list → unblock | C | ⬜ |
| S8 | Sign out from settings | B | ⬜ |
| S9 | Contact page (/contact) form submits | B | ⬜ |

## 12. Notifications
| ID | Test | Acct | Status |
|---|---|---|---|
| N1 | In-app notifications list; mark read; tap opens target | B | ⬜ |
| N2 | Unread badge in navigation updates | B | ⬜ |
| N3 | Browser push: enable prompt, receive push from another user's action | B | ⬜ |
| N4 | Push dismissed state persists | B | ⬜ |

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
| PA8 | Billing: tier picker shows $59/$119/$229/$389; Stripe **test** checkout; customer portal | A | ⬜ |
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
| O1 | Organizations list / search | B | ⬜ |
| O2 | Create organization / chapter request | C | ⬜ |
| O3 | Org page tabs: Feed, About, Chapters; contact org | B | ⬜ |
| O4 | Org admin: overview, members (add / role / remove) | A | ⬜ |
| O5 | Org admin: invites → /join/:code link joins | A→B | ⬜ |
| O6 | Org admin: announcements create / delete | A | ⬜ |
| O7 | Org admin: events | A | ⬜ |
| O8 | Org admin: chapter requests approve | A | ⬜ |
| O9 | Org admin: settings save | A | ⬜ |
| O10 | Org billing: tiers $50/$100/$300/$500 + national; Stripe test checkout | A | ⬜ |

## 16. Site admin (/admin)
| ID | Test | Acct | Status |
|---|---|---|---|
| AD1 | Only admins can open /admin (B is refused) | A,B | ⬜ |
| AD2 | User list / search; filters (all, clergy, suspended, admin) | A | ⬜ |
| AD3 | Suspend / unsuspend user | A | ⬜ |
| AD4 | Grant parish admin / org membership | A | ⬜ |
| AD5 | Parish clusters create / delete | A | ⬜ |
| AD6 | Moderation queue: reported post review | A | ⬜ |

## 17. Background jobs & server
| ID | Test | Acct | Status |
|---|---|---|---|
| BG1 | /api/readings returns today's readings | – | ⬜ |
| BG2 | Readings + Morning Offering cron endpoints respond (dry check) | – | ⬜ |
| BG3 | distribute-post / send-push / send-form-email functions — no errors in logs during tests | – | ⬜ |
| BG4 | Stripe webhook receives test checkout events, subscription saved | – | ⬜ |

## 18. Cross-cutting
| ID | Test | Acct | Status |
|---|---|---|---|
| X1 | No console errors on each page visited | all | ⬜ |
| X2 | No leftover "Communio" text anywhere in the UI | all | ⬜ |
| X3 | Mobile width layout of main screens | B | ⬜ |
| X4 | Loading / error / empty states | all | ⬜ |
| X5 | Supabase security advisors — no critical RLS gaps | – | ⬜ |

## 19. Last — destructive
| ID | Test | Acct | Status |
|---|---|---|---|
| Z1 | Delete account (type DELETE) → signed out, data removed | C | ⬜ |
| Z2 | Clean up all `[TEST]` content | A | ⬜ |

---

## Not covered here (need real devices / store accounts)
- iOS / Android native app (push via Firebase, deep links, camera) — needs app builds + store accounts.
- Real-money Stripe payments — Stripe live mode isn't activated.

## Issues found
| # | Test ID | Problem | Fix | Status |
|---|---|---|---|---|
