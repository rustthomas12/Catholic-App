# inFold: Accessibility & Mobile Layout Plan

_Audit date: 2026-10-21 · Target: **WCAG 2.2 AA** (what the ADA, Apple/Google store reviews and most institutional buyers, such as dioceses and Catholic schools, point to)._

## How it was tested
- **Automated:** axe-core 4.10 (Deque) on 20 screens, signed in, WCAG 2.0/2.1/2.2 A+AA plus best-practice rules.
- **Phone layout:** every main screen rendered at 390×844 (iPhone 14/15). Tap targets, text sizes, navigation and overflow were measured.
- **Large text:** pages re-rendered at 200% text size, the WCAG 1.4.4 equivalent of iOS/Android "Larger Text".
- **Keyboard:** focus checked on the 40 interactive controls of the home screen.
- **Code review:** modal, toast, landmarks, motion, zoom and image alt text.

## Scorecard

| Area | Status |
|---|---|
| Pinch-zoom allowed | ✅ |
| Images have alt text | ✅ |
| Keyboard focus visible (home, 40/40 controls) | ✅ |
| Modals close with Escape, take focus | ✅ (no focus trap or return; see A7) |
| No horizontal scroll at 390px | ✅ (but ❌ at 200% text, see M6) |
| Color contrast | ❌ **471 failures on 20/20 screens** |
| Screen-reader names on icon buttons | ❌ 21 unnamed buttons, 1 link, 1 select, 1 input |
| Page structure (main landmark, h1, skip link) | ❌ no `<main>`, no skip link, 2 pages without h1 |
| Status messages announced (toasts) | ❌ not announced |
| Reduced motion respected | ❌ not handled |
| Tap targets (44×44 Apple / 48×48 Material) | ⚠️ 30–40% of controls per screen are smaller; 32 below even the WCAG 24px minimum |
| Smallest text | ⚠️ 9–10px in nav labels, badges and section headers (37 spots) |

---

## Findings

### A1. Color contrast (serious, every screen)
Almost all of it comes from 5 color choices:

| Count | Color pair | Ratio (need 4.5) | Where |
|---|---|---|---|
| 84 | `text-gray-400` (#9ca3af) on white/cream | 2.4–2.5 | timestamps, "@username", hints, empty states |
| 42 | `text-gray-300` on cream | 1.4 | secondary labels |
| 21 | **gold `#c9a84c` text** on white/cream | 2.0–2.3 | "🙏 Prayer Request", announcement labels, links |
| 8 | `text-white/40` on navy sidebar | 3.5 | "ADMIN" and section headers |
| 8 | white on `bg-red-500` badges | 3.8 | unread counts |

**Fix:**
- Swap `text-gray-400`/`text-gray-300` for `text-gray-500` (4.8:1 on white, 4.6:1 on cream).
- Add a **`gold-ink` (#8a6a1c)** token for gold *text*; keep #c9a84c for fills, borders and icons. This keeps the brand look.
- Use `text-white/70` for sidebar labels and `bg-red-600` for badges.

This is a mechanical change.

### A2. Unnamed controls (critical)
Screen readers announce these as just "button":
- every **notification-settings switch** (17)
- the Messages compose/back icons
- the parish page action icons
- the profile camera and settings icons
- group header icons
- the saints/rosary icon buttons
- the org-admin icon buttons

**Fix:** add `aria-label` to each, and `aria-checked` plus a label on the switches.

### A3. Page structure
- There is no `<main>` element, so 375 content blocks sit outside any landmark.
- There's no "Skip to content" link, so keyboard and VoiceOver users go through about 15 sidebar links on every page.
- Two screens (Home, Org admin) have no `<h1>`.

**Fix:**
- Wrap route content in `<main id="main">`.
- Add a visually hidden skip link as the first focusable element.
- Give every screen one `<h1>`; it can be visually hidden on Home.

### A4. Toasts aren't announced
"Message sent", "Could not save" and similar messages are silent for screen-reader users.

**Fix:** a `role="status"` + `aria-live="polite"` region in `Toast.jsx`, using `role="alert"` for errors.

### A5. Motion
Skeleton pulses, slide-in sheets and the like ignore the OS "Reduce Motion" setting.

**Fix:** a global `@media (prefers-reduced-motion: reduce)` rule that disables animations and transitions, plus Tailwind `motion-reduce:` where needed.

### A6. Small targets and small text
- **Under the WCAG 24px minimum:** post-header author/parish links (20px tall), "See all" (16px), and the 14px icon buttons on the parish page.
- **Under 44px (Apple guideline):** feed filter chips (37px), group category chips (29px), the List/Map toggle (28px), Back (36px) and the notification switches (24px tall).
- **Text:** the bottom-nav labels and badges are 9–10px.

### A7. Modals
They lack a focus trap, and focus isn't returned to the trigger when they close, so keyboard and switch users can tab "behind" an open dialog. The report sheet is also not full width on phones (issue from the earlier test pass).

---

## Mobile layout: what major apps do and where inFold differs

I compared against apps your users already know: **Facebook (Groups), Instagram, WhatsApp, Nextdoor, Hallow** (the closest Catholic app), plus Apple's Human Interface Guidelines and Google's Material 3.

| Pattern | Facebook / Instagram / WhatsApp / Hallow | inFold today | Recommendation |
|---|---|---|---|
| **Top app bar** | Every screen has a sticky top bar: title or logo on the left, 1–2 actions on the right (search, compose, messages) | Only Notifications has one; elsewhere the title scrolls away, and Back appears only on some screens | **M1.** One reusable sticky top bar: title, Back on detail screens, up to 2 actions |
| **Messages** | Instagram and Facebook put DMs as a **top-right icon with a badge**; WhatsApp makes chats the home | Hidden in **More**; the badge appears only inside the sheet | **M2.** Messages icon + unread badge in the top bar of Home |
| **Bottom tab bar** | 4–5 tabs, **24–28px icons**, 10–11pt labels that **don't grow** with large text, filled icon when active | 5 tabs (Home, Groups, Faith, Alerts, More), 10px labels; at 200% text it grows to 129px | **M3.** Cap tab-bar height and label size; at least 44px targets; keep "More" (Facebook's "Menu" pattern) |
| **Compose** | Facebook: "What's on your mind?" at the top of the feed; Instagram: "+" in the top bar | Composer card at the top of the feed ✅ | Keep it, and add "+" to the top bar on Groups/Org pages |
| **Action menus** | **Bottom sheets** on mobile (iOS action sheet / Material modal bottom sheet), full width, large rows | Small dropdowns ("Post options"); the report modal isn't full width | **M4.** Post options, report, share and the block confirmation become full-width bottom sheets with 48px rows |
| **Filter chips** | Horizontally scrolling, 32–36px tall, but each with a **48px tap area** | 29–37px with no extra tap area | **M5.** Keep the look; enlarge the tap area with padding or a pseudo-element |
| **Large text (Dynamic Type)** | Content reflows; navigation chrome stays fixed | Home scrolls sideways at 200% text, and the nav doubles in height | **M6.** Fix the home overflow; cap chrome sizes; test at 200% |
| **Chat input** | WhatsApp/Messenger: the input sticks above the keyboard and respects the safe area | Input is in normal flow | **M7.** Sticky composer with `env(safe-area-inset-bottom)`, plus the iOS keyboard viewport fix |
| **Pull to refresh** | Universal on feeds | Not present | **M8.** Pull-to-refresh on Feed, Notifications and Messages |
| **Back gesture** | iOS swipe-back; Android back | Works through browser/Capacitor history ✅ | Keep it; make sure every detail screen has a visible Back (M1) |
| **Calm, readable faith content** | Hallow: large type, generous spacing, one action per card | Readings card is good; rosary and examination screens are dense | **M9.** Faith screens: body text 17px, line height 1.6, one primary action per card |

---

## Plan

### Phase 1: accessibility quick wins (about 1–2 days, low risk)
1. **Contrast tokens** (A1): the gray swap, a `gold-ink` text color, sidebar label opacity, badge red.
2. **Names** (A2): aria-labels on every icon button, plus accessible switches.
3. **Structure** (A3): `<main>`, skip link, one `<h1>` per screen.
4. **Announcements** (A4): a live region in Toast.
5. **Motion** (A5): honor the global reduce-motion setting.
6. **Minimum targets** (A6): fix everything under 24px; bring nav labels to 11px.
7. **Automated guard:** an axe test in CI (Playwright + `@axe-core/playwright`) on the 20 screens. The build fails on any *serious* or *critical* violation, so regressions can't ship.

**Phase 1 status (done, 2026-10-22):** axe on the same 20 screens went from 471 contrast failures, 24 unnamed controls and missing landmarks to **0 serious/critical violations**. Done: contrast tokens (gray, gold ink, red, navy-aware overrides), names on 56 icon buttons and every form field and switch, `<main>`, skip link, one `<h1>` per screen, announced toasts, reduced motion, 24px minimum targets, 11px nav labels, and `npm run test:a11y` in CI. It also found and fixed a real bug: on short laptop screens the desktop sidebar ran off the bottom and couldn't scroll, so Sign out was unreachable.

### Phase 2: mobile layout (about 3–5 days)
1. **M1** shared sticky top bar (title, Back, actions) on all screens.
2. **M2** Messages icon with badge in the Home top bar.
3. **M4** bottom sheets for post options, report, share and confirmations.
4. **M3/M6** tab bar sizing, the large-text overflow fix, and a check at 200% text.
5. **M5** 44–48px tap areas on chips, Back and switches.
6. **M7** sticky chat composer with safe-area and keyboard handling.
7. **A7** focus trap and focus return in Modal.

### Phase 3: verification and polish (ongoing)
1. **Real devices:** a VoiceOver (iPhone) and TalkBack (Android) walkthrough of the five core journeys: sign up, find my parish, post, message, prayer.
2. **Large text and dark mode:** iOS "Larger Text" at maximum, Android font scale 2.0, and the OS dark mode on Faith screens.
3. **M8** pull-to-refresh and **M9** typography for the Faith screens.
4. **An accessibility statement page** with a contact for problems, which many dioceses ask vendors for.

### Success criteria
- **Automated:** axe reports 0 serious/critical issues on all 20 screens, enforced in CI.
- **Tap targets:** every one at least 24px (WCAG 2.2), and 44px for primary actions.
- **Large text:** no horizontal scroll at 200% text on any screen.
- **Screen readers:** all five core journeys can be completed with VoiceOver and TalkBack alone.
