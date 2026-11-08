/**
 * Builds every app icon from the inFold brand kit in brand/ (the source of
 * truth — replace those files to rebrand, then rerun):
 *   - web: public/icons/icon-*.png|svg (manifest, push notifications),
 *     maskable icon
 *   - iOS / Android source images in assets/, which
 *     `npm run mobile:assets` turns into every size the stores need
 *
 *   node scripts/generate-app-assets.mjs
 */
import sharp from 'sharp'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'

const BLUE = '#6FCDFF' // inFold Blue (brand/README.md)
const OUT = 'assets'
mkdirSync(OUT, { recursive: true })

const roundedIcon = readFileSync('brand/icon/svg/infold-icon.svg')        // steeple on rounded tile
const squareIcon = readFileSync('brand/icon/svg/infold-icon-square.svg')  // full-bleed tile
const logo = readFileSync('brand/lockup/infold-lockup-black.svg')         // tile + wordmark

// The steeple alone on transparent: the square icon without its tile
const steeple = Buffer.from(squareIcon.toString().replace(/<rect[^>]*\/>/, ''))

// ── Web icons (same paths as before, so every reference keeps working) ──
for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
  await sharp(roundedIcon, { density: 300 }).resize(size, size).png().toFile(`public/icons/icon-${size}.png`)
  writeFileSync(`public/icons/icon-${size}.svg`, roundedIcon)
  console.log(`public/icons/icon-${size}.png|svg`)
}
// Maskable (Android home screen crops to a circle): full-bleed tile
await sharp(squareIcon, { density: 300 }).resize(512, 512).png().toFile('public/icons/maskable-512.png')
console.log('public/icons/maskable-512.png')

// ── Native source images ──
async function onCanvas(art, { size, share, background }) {
  const inner = Math.round(size * share)
  const artPng = await sharp(art, { density: 600 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4,
    background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: artPng, gravity: 'center' }])
    .png()
}

// App icon: the kit's store icon, square and opaque (the OS rounds the corners)
await sharp('brand/icon/png/app-icon-1024.png').resize(1024, 1024).flatten({ background: BLUE }).png().toFile(`${OUT}/icon-only.png`)
// Android adaptive icon: steeple inside the 66% safe zone over a blue layer
await (await onCanvas(steeple, { size: 1024, share: 0.7 })).toFile(`${OUT}/icon-foreground.png`)
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: BLUE } }).png().toFile(`${OUT}/icon-background.png`)
// Splash screens: logo on inFold Blue
await (await onCanvas(logo, { size: 2732, share: 0.3, background: BLUE })).toFile(`${OUT}/splash.png`)
await (await onCanvas(logo, { size: 2732, share: 0.3, background: BLUE })).toFile(`${OUT}/splash-dark.png`)
for (const f of ['icon-only', 'icon-foreground', 'icon-background', 'splash', 'splash-dark']) console.log(`${OUT}/${f}.png`)
