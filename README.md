# inFold — The Digital Parish Hall

A national Catholic social network connecting Catholics
to their parish community, groups, and daily faith life.

## Tech Stack
- React + Vite (frontend)
- Supabase (backend, auth, database, storage)
- Tailwind CSS (styling)
- Vercel (hosting)
- Capacitor (iOS & Android apps — see [docs/MOBILE.md](docs/MOBILE.md))
- Mapbox (parish directory map)

## Development Setup
1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in values
3. `npm install`
4. `npm run dev`
5. `npm test` — unit tests

## Mobile apps
The App Store / Google Play apps wrap this same codebase with Capacitor.
Setup, building without a Mac, testing and releasing: [docs/MOBILE.md](docs/MOBILE.md).
- `npm run mobile:build` — build web + sync into ios/ and android/
- `npm run mobile:android` — open in Android Studio
- `npm run mobile:ios` — open in Xcode (Mac only)

## Paused features & deferred ideas
Some features are switched off in `src/config/features.js` (code kept). Why, how to turn them back on, and ideas we chose not to build yet: [docs/REVISIT_LATER.md](docs/REVISIT_LATER.md).

## Build Phases
- Phase 1: Foundation ✓
- Phase 2: Auth & Profiles
- Phase 3: Core Feed
- Phase 4: Parish Directory
- Phase 5: Daily Faith Layer
- Phase 6: Groups
- Phase 7: Notifications & Email
- Phase 8: Polish & PWA
- Phase 9: Premium & Payments
- Phase 10: Parish B2B Dashboard

## Important Decisions
- No advertising, ever
- No Mass livestreaming
- Strictly chronological feeds (no algorithm)
- Confession tracker is 100% private, no exceptions
- Web PWA first; native iOS/Android apps via Capacitor from the same codebase
