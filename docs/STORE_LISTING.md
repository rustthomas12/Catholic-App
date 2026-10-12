# Store listing — copy & paste

Everything below is ready to paste into **App Store Connect** and **Google
Play Console**. Images are in `store-assets/`. The App Review demo account's
password is **not** in this repo — it's in
`Documents\Communio-App-Keys\KEEP-SAFE.txt` on the PC this was set up on.

---

## Shared details

| Field | Value |
|---|---|
| App name (App Store, max 30) | `Communio: Catholic Community` |
| App name (Google Play, max 30) | `Communio: Catholic Community` |
| Bundle ID / package | `app.getcommunio` |
| Version | `1.0.0` |
| Primary category | **Lifestyle** |
| Secondary category (Apple) | **Social Networking** |
| Price | Free (no in-app purchases) |
| Privacy Policy URL | `https://app.getcommunio.app/privacy` |
| Terms of Use URL | `https://app.getcommunio.app/terms` |
| Support URL | `https://getcommunio.app/contact` |
| Marketing URL | `https://getcommunio.app` |
| Support email | `info@getcommunio.app` |
| Copyright (Apple) | `2026 Communio` |

## Subtitle (Apple, max 30)
```
Parish, prayer & Mass readings
```

## Short description (Google Play, max 80)
```
Your parish, daily Mass readings, prayer and Catholic community in one place.
```

## Promotional text (Apple, max 170 — can be changed without review)
```
The digital parish hall: follow your parish, pray the Liturgy of the Hours, read today's Mass readings, and stay connected with Catholics near you. Free, no ads.
```

## Keywords (Apple, max 100 characters, comma-separated)
```
catholic,parish,mass readings,rosary,liturgy of the hours,confession,saints,prayer,church,faith
```

## Description (both stores)
```
Communio is the digital parish hall — a free, ad-free home for Catholic life, built to connect you with your parish, your faith and each other.

YOUR PARISH, CLOSER
• Find Catholic parishes near you on a map, with parish details and contact info
• Follow your parish for announcements, events and RSVPs
• Join parish groups and ministries — young adults, men's and women's groups, Bible studies and more — with group posts and chat
• Message other parishioners directly

DAILY PRAYER
• Today's Mass readings, in the Ordinary Form or the Traditional (1962) calendar
• The Liturgy of the Hours: Morning, Evening and Night Prayer
• A guided Rosary with the mysteries of the day and a daily streak
• The Morning Offering and formation programs
• Lives of the saints, with today's feast

PREPARE FOR CONFESSION
• A guided Examination of Conscience
• A completely private Confession tracker — only you can ever see it

PRAY FOR ONE ANOTHER
• Share prayer intentions with your parish and know when others pray for you
• Keep a private prayer journal and personal intentions

BUILT DIFFERENTLY
• No advertising, ever
• Strictly chronological feeds — no algorithm deciding what you see
• Report any post and block any user at any time
• English and Spanish

For parishes and Catholic organizations: Communio gives pastors and staff tools to share announcements, organize groups and grow their community. Learn more at getcommunio.app.
```

## What's new (version 1.0.0)
```
Welcome to Communio on iPhone and Android! Push notifications for parish announcements, messages and prayer responses, plus everything from the web app.
```

---

## Screenshots (`store-assets/screenshots/`)

| Store slot | Folder | Size |
|---|---|---|
| App Store — iPhone 6.9" | `iphone-6.9/` | 1320 × 2868 |
| App Store — iPad 13" | `ipad-13/` | 2064 × 2752 |
| Google Play — Phone | `android-phone/` | 1080 × 2400 |

Upload in numeric order: readings, parish directory, saints, rosary,
examination of conscience, Liturgy of the Hours. Regenerate any time with
`node --env-file=.env.local scripts/store-screenshots.mjs` (see the script
header).

Google Play graphics: `store-assets/play-icon-512.png` (app icon) and
`store-assets/play-feature-graphic-1024x500.png` (feature graphic).

---

## App Review information (Apple) / App access (Google)

- **Sign-in required:** yes
- **Demo account:** `appreview@getcommunio.app` — password in `KEEP-SAFE.txt`
- **Notes for the reviewer** (paste):
```
Communio is a free Catholic community app. Sign in with the demo account above; it follows a parish in Worcester, MA so you can see the parish page, readings, directory and groups.

User-generated content: every post has a "…" menu with "Report post" (reports go to our moderation queue and admins are notified) and "Block user". Profiles also have a Block button, and Settings > Blocked users lets people unblock. Blocked users' content is hidden and they cannot message the blocker. Our Content Policy is at https://app.getcommunio.app/policy and users agree to the Terms when signing up.

Payments: individual users never pay and there are no in-app purchases. Parishes and Catholic organizations can subscribe to administrative tools (B2B, guideline 3.1.3(c)); that checkout happens on our website.

Account deletion: Settings > Delete my account (content is hidden immediately; the account is permanently erased after 90 days). Details: https://app.getcommunio.app/delete-account

Location is used only when the user taps "Near me" in the parish directory, to show nearby parishes.
```

---

## Apple — App Privacy ("nutrition label")

Answer **"Yes, we collect data"**, then for each type below choose:
*Linked to the user: Yes* · *Used for tracking: No* · *Purpose: App Functionality*

| Category | Data type |
|---|---|
| Contact Info | Name, Email Address |
| User Content | Photos or Videos, Emails or Text Messages (direct messages), Other User Content (posts, comments, prayer requests) |
| Identifiers | User ID, Device ID (push notification token) |
| Location | Coarse Location — **not linked**, App Functionality (only sent to find nearby parishes, not stored) |

Not collected: health, financial info, contacts, browsing/search history,
purchases, diagnostics, advertising data.

## Apple — Age rating
New questionnaire answers: no violence, sexual content, profanity, drugs,
gambling or horror. **User-generated content: Yes. Messaging and chat: Yes.**
Expected rating: **13+**.

## Apple — Export compliance
Uses only standard encryption (HTTPS). Already declared in the app
(`ITSAppUsesNonExemptEncryption = NO`), so no questions at upload.

---

## Google Play — Data safety

- Collects data: **Yes**. Shares data with third parties: **No**.
- Encrypted in transit: **Yes**.
- Users can request deletion: **Yes** — in-app (Settings → Delete my account);
  web link: `https://app.getcommunio.app/delete-account`.

| Data type | Collected | Optional? | Purpose |
|---|---|---|---|
| Name | Yes | Required | App functionality, Account management |
| Email address | Yes | Required | App functionality, Account management |
| User IDs | Yes | Required | App functionality, Account management |
| Approximate location | Yes (not stored) | Optional | App functionality |
| Photos | Yes | Optional | App functionality |
| Messages (in-app) | Yes | Optional | App functionality |
| Other user-generated content | Yes | Optional | App functionality |
| Device or other IDs (push token) | Yes | Optional | App functionality |

## Google Play — Content rating (IARC questionnaire)
Category: **Social / Communication**. Violence, sexuality, language,
controlled substances, gambling: **No**. Users can interact/communicate:
**Yes**. Shares user location with other users: **No**. Allows purchases:
**No**. Expected: **Teen / PEGI 12**.

## Google Play — Target audience
Ages **13 and over** (13–15, 16–17, 18+). The app is not designed for
children. Not a news app. No ads (answer **"No, my app does not contain ads"**).
