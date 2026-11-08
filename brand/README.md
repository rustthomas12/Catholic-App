# inFold brand kit

## What's here
| Folder | Contents |
|---|---|
| `icon/svg/` | `infold-icon.svg` (rounded tile) and `infold-icon-square.svg` (square, for app stores) |
| `icon/png/` | `infold-icon-1024/512/192.png`, `app-icon-1024.png` (store icon), `apple-touch-icon.png` (180×180), `favicon-32.png`, `favicon-16.png` |
| `icon/favicon.ico` | Multi-size favicon |
| `wordmark/svg/` | "inFold" text on its own in black, white, navy and blue (text already built in as shapes) |
| `wordmark/png/` | The same wordmarks as PNGs, 600 and 1200 px wide |
| `lockup/` | Icon and wordmark side by side, for headers and navbars (`-black` for light backgrounds, `-white` for dark) |
| `fonts/` | Inknut Antiqua Regular, SemiBold and Bold (.ttf), with its license (`OFL.txt`, free for commercial use) |

## Brand colors
| Name | Hex |
|---|---|
| inFold Blue (tile) | `#6FCDFF` |
| Fold Navy | `#005C96` |
| Ink | `#000000` |

## Brand font
**Inknut Antiqua.** Use Bold for the wordmark and big headings, and SemiBold for smaller headings. It's a heavy display font, so keep your existing font for body text and UI controls.

## How the app uses it
- **Web copies** live in `public/brand/` (icon, lockups, wordmarks, fonts with `OFL.txt`) and are shown through `src/components/shared/Logo.jsx` (`LogoMark`, `LogoLockup`, `LogoWordmark`).
- **Favicons and the iOS home-screen icon** are copied to `public/` (`favicon.ico`, `favicon-16/32.png`, `apple-touch-icon.png`).
- **Font:** `@font-face` in `src/index.css`. h1–h2 use Bold and h3–h4 use SemiBold; everything else keeps the system font.
- **Colors:** `--brand-blue`, `--brand-navy` and `--brand-ink` in `src/index.css`, and `brand-*` in Tailwind.
- **To rebrand:** replace the files here, re-copy them into `public/`, then run `npm run mobile:assets`. That rebuilds `public/icons/` (push notifications), the maskable icon, and the iOS/Android icons and splash screens.
