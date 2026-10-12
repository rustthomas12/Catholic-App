/**
 * Builds the source images for the iOS / Android app icons and splash
 * screens from the Communio brand mark (public/icons/icon-512.svg), then
 * `npm run mobile:assets` turns them into every size the stores need.
 *
 *   node scripts/generate-app-assets.mjs
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'

const NAVY = '#1B2A4A'
const GOLD = '#C9A84C'
const OUT = 'assets'
mkdirSync(OUT, { recursive: true })

// The cross from icon-512.svg, in its own 512×512 coordinate space
const cross = `
  <rect x="209.9" y="51.2" width="92.2" height="409.6" rx="18.4" fill="${GOLD}"/>
  <rect x="71.7" y="163.8" width="368.6" height="92.2" rx="18.4" fill="${GOLD}"/>`

// size: canvas px, scale: share of the canvas the 512 artwork occupies
function svg({ size, scale, background }) {
  const art = size * scale
  const offset = (size - art) / 2
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
  <g transform="translate(${offset} ${offset}) scale(${art / 512})">${cross}</g>
</svg>`)
}

const jobs = [
  // iOS app icon: square, opaque, no rounded corners (iOS applies the mask)
  ['icon-only.png', { size: 1024, scale: 0.8, background: NAVY }],
  // Android adaptive icon layers: keep the mark inside the 66% safe zone
  ['icon-foreground.png', { size: 1024, scale: 0.55 }],
  ['icon-background.png', { size: 1024, scale: 0, background: NAVY }],
  // Splash screens
  ['splash.png', { size: 2732, scale: 0.2, background: NAVY }],
  ['splash-dark.png', { size: 2732, scale: 0.2, background: NAVY }],
]

for (const [name, opts] of jobs) {
  const img = opts.scale === 0
    ? sharp({ create: { width: opts.size, height: opts.size, channels: 3, background: NAVY } })
    : sharp(svg(opts))
  await img.png().toFile(`${OUT}/${name}`)
  console.log(`${OUT}/${name}`)
}
