// ── Feature switches ───────────────────────────────────────
// Features that are paused. Why, and what to check before turning one back
// on: docs/REVISIT_LATER.md Their code is kept intact; flip a switch to
// true to bring the feature back (no other change needed). Existing data
// in the database is untouched while a feature is off.
//
// Paused 2026-10 to focus the launch on the parish core:
//   directMessages      — private 1:1 messages (safeguarding / moderation risk)
//   groupChat           — real-time chat inside groups (duplicates group posts)
//   sponsorshipCodes    — parish-sponsored "premium" codes (premium no longer exists)
//   createOrganizations — creating new organizations / chapter requests
//                         (existing organizations keep working)
//   pitchDeckInApp      — investor pitch deck at app.getcommunio.app/pitch
//                         (still available at getcommunio.app/pitch)

export const FEATURES = {
  directMessages: false,
  groupChat: false,
  sponsorshipCodes: false,
  createOrganizations: false,
  pitchDeckInApp: false,
}
