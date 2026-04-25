# Changelog

All notable changes to Communio are documented here.

## [Phase 2] — 2026-04-04

### Authentication & Profiles

**Core auth system**
- `useAuth.jsx` — AuthProvider context with `signIn`, `signUp`, `signOut`, `updateProfile`, `refreshProfile`; i18n-mapped error messages; `onAuthStateChange` handles all session events
- Auto-inserts `parish_follows` row on signup if parish selected

**Auth pages**
- `LoginPage` — real form with error display, forgot-password link, redirect if already authenticated
- `SignupPage` — debounced parish search (400ms), password strength bar (3 levels), confirm password icons, vocation 2×2 grid, terms checkbox
- `ForgotPasswordPage` — `resetPasswordForEmail()`, always shows success card regardless of email existence
- `ResetPasswordPage` — `updateUser({ password })`, strength indicator, 3-second countdown redirect
- `OnboardingPage` — 3-step flow (welcome + parish, suggested groups, daily readings); sets `onboarding_completed` on finish

**Profile pages**
- `ProfilePage` — view by `:id` or current user; skeleton loader; deleted/not-found states; banner, avatar with badges, bio, stats
- `EditProfilePage` — pre-fills all fields; avatar upload with preview; parish search; unsaved-changes modal on back
- `SettingsPage` — profile visibility toggle; delete account modal (requires typing "DELETE"); sign out modal; app version

**Navigation**
- `Navigation.jsx` rebuilt — real avatar with initials fallback, liturgical season dot on Faith tab, active path detection for nested routes, sign out in desktop sidebar

**Legal pages**
- `TermsPage`, `PrivacyPage`, `PolicyPage` — full content with confession tracker privacy callout, Colossians 4:6 quote

**Database migrations**
- `003_onboarding_flag.sql` — adds `onboarding_completed boolean DEFAULT false`
- `004_profile_extras.sql` — adds `profile_visibility text DEFAULT 'public'` with check constraint

**Seed scripts**
- `scripts/seed-parishes.js` — 50 Massachusetts parishes with name, city, diocese, zip, lat/lng
- `scripts/seed-test-accounts.js` — 2 dev test accounts (layperson + verified clergy)

---

## [Phase 1] — Initial Release

### Project Foundation

- Vite 8 + React 18 SPA with code splitting (React.lazy on all routes)
- 23-table Supabase schema with RLS policies
- Tailwind CSS v3 with brand tokens: navy, gold, cream, lightbg
- vite-plugin-pwa with Workbox (offline support, PWA manifest)
- react-router-dom v6 with ProtectedRoute
- react-i18next with 8 namespaces
- Shared components: Avatar, Button, Input, Modal, LoadingSpinner, Navigation
- .npmrc with legacy-peer-deps=true for Vercel compatibility
- Supabase client with placeholder fallback (prevents white screen without env vars)
