# inFold logo pack

## Files

### svg/ (vector files that scale to any size; use these first)
| File | Use it for |
|---|---|
| `infold-logo.svg` | Main logo: blue tile with the steeple and "inFold" |
| `infold-icon.svg` | Steeple only on the blue tile, with rounded corners |
| `infold-icon-square.svg` | Steeple on a square tile with no rounded corners, for app stores (the OS rounds the corners itself) |
| `infold-logo-no-background.svg` | Steeple and wordmark on a transparent background, for light backgrounds (headers, login screens) |
| `infold-logo-no-background-dark.svg` | Same, for dark backgrounds |

### png/ (raster files)
| File | Use it for |
|---|---|
| `infold-logo-1024/512/256.png` | Main logo at those sizes |
| `infold-icon-1024/512/192.png` | Rounded icon, e.g. for the PWA manifest (192 and 512) |
| `app-icon-1024.png` | iOS App Store and Android store icon (full-bleed square) |
| `apple-touch-icon.png` | 180×180 icon for iOS home screens |
| `favicon-32.png`, `favicon-16.png` | Browser tab icons |
| `infold-logo-no-background(-dark)-1024w.png` | Transparent logo, 1024 px wide |

### favicon.ico
Multi-size browser favicon (16, 32, 48 and 64 px).

## Brand colors
| Name | Hex |
|---|---|
| inFold Blue (tile) | `#03A6FF` |
| Fold Navy (shaded half) | `#005C96` |
| Ink | `#000000` |
| Light shade (dark-mode logo) | `#8FD3FF` |

The wordmark font is **Montserrat SemiBold (600)**, free from Google Fonts. The SVGs already contain the text as shapes, so they don't need the font installed.

## Prompt to paste into Claude Code
Put this whole folder in your project, then paste:

> I've added an `infold-logo-pack` folder to this project. Integrate it as the app's branding:
> 1. Copy the assets into the right public/static assets folder for this framework.
> 2. Set up the favicon (`favicon.ico`, `favicon-32.png`, `favicon-16.png`), `apple-touch-icon.png`, and the PWA/web manifest icons (`infold-icon-192.png`, `infold-icon-512.png`) if the app has a manifest.
> 3. If this is a native or Expo/React Native app, use `app-icon-1024.png` as the app icon.
> 4. Replace any existing logo in the header/navbar with `svg/infold-logo-no-background.svg`, using the `-dark` version in dark mode if the app supports it.
> 5. Add the brand colors from the README (`#03A6FF`, `#005C96`, `#000000`) as theme variables or design tokens.
> Show me the changes before committing.
