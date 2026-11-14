/**
 * Google Play listing graphics: 512×512 icon and 1024×500 feature graphic.
 *   node scripts/store-graphics.mjs
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'

const NAVY = '#1B2A4A'
const GOLD = '#C9A84C'
const CREAM = '#FAF7F2'
mkdirSync('store-assets', { recursive: true })

await sharp('assets/icon-only.png').resize(512, 512).png().toFile('store-assets/play-icon-512.png')

// Feature graphic: the brand-kit white lockup (icon + "inFold") on navy,
// with the tagline underneath
const lockup = await sharp('public/brand/lockup/infold-lockup-white.svg', { density: 300 })
  .resize({ height: 190 }).png().toBuffer()
const { width: lw } = await sharp(lockup).metadata()
const tagline = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="80">
  <text x="512" y="52" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="36" fill="${GOLD}">The digital parish hall</text>
</svg>`
const feature = await sharp({ create: { width: 1024, height: 500, channels: 3, background: NAVY } })
  .composite([
    { input: lockup, left: Math.round((1024 - lw) / 2), top: 115 },
    { input: Buffer.from(tagline), left: 0, top: 330 },
  ])
  .png().toBuffer()
void CREAM
await sharp(feature).png().toFile('store-assets/play-feature-graphic-1024x500.png')
console.log('store-assets/play-icon-512.png\nstore-assets/play-feature-graphic-1024x500.png')
