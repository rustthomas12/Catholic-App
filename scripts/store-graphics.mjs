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

const cross = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect x="209.9" y="51.2" width="92.2" height="409.6" rx="18.4" fill="${GOLD}"/>
    <rect x="71.7" y="163.8" width="368.6" height="92.2" rx="18.4" fill="${GOLD}"/>
  </g>`

const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${NAVY}"/>
  ${cross(70, 120, 0.5)}
  <text x="370" y="225" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="84" font-weight="700" fill="${CREAM}">Communio</text>
  <text x="372" y="292" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="34" fill="${GOLD}">The digital parish hall</text>
  <text x="372" y="345" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="24" fill="${CREAM}" fill-opacity="0.75">Your parish, daily readings, prayer and community</text>
</svg>`
await sharp(Buffer.from(feature)).png().toFile('store-assets/play-feature-graphic-1024x500.png')
console.log('store-assets/play-icon-512.png\nstore-assets/play-feature-graphic-1024x500.png')
