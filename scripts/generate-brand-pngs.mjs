/**
 * Rebuilds the brand kit's raster files from its SVGs (brand/ is the source
 * of truth), so a color change only needs the SVGs edited:
 *   - brand/icon/png/*, brand/icon/favicon.ico
 *   - brand/lockup/*-1200w.png, brand/wordmark/png/*
 *   - the copies the web app serves (public/favicon*, apple-touch-icon,
 *     public/brand/icon/*.png)
 * Then run `npm run mobile:assets` for push, maskable and native icons.
 *
 *   node scripts/generate-brand-pngs.mjs
 */
import sharp from 'sharp'
import { copyFileSync, readFileSync, writeFileSync } from 'fs'

const svg = (p) => readFileSync(`brand/${p}`)
const rounded = svg('icon/svg/infold-icon.svg')       // tile with rounded corners (transparent around it)
const square = svg('icon/svg/infold-icon-square.svg') // full-bleed square tile (opaque)

async function png(input, width, out, { opaque = false, height } = {}) {
  let img = sharp(input, { density: 600 }).resize(width, height ?? width, height ? { fit: 'fill' } : undefined)
  img = opaque ? img.flatten().removeAlpha() : img.ensureAlpha()
  await img.png().toFile(`brand/${out}`)
  console.log(`brand/${out}`)
}

// Icons
for (const size of [1024, 512, 192]) await png(rounded, size, `icon/png/infold-icon-${size}.png`)
await png(rounded, 32, 'icon/png/favicon-32.png')
await png(rounded, 16, 'icon/png/favicon-16.png')
await png(square, 1024, 'icon/png/app-icon-1024.png', { opaque: true }) // stores round the corners
await png(square, 180, 'icon/png/apple-touch-icon.png', { opaque: true }) // iOS rounds the corners

// favicon.ico: 16, 32, 48 and 64 px PNGs in one ICO container
const sizes = [16, 32, 48, 64]
const images = await Promise.all(sizes.map(s => sharp(rounded, { density: 600 }).resize(s, s).png().toBuffer()))
const header = Buffer.alloc(6 + 16 * sizes.length)
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4)
let offset = header.length
sizes.forEach((s, i) => {
  const e = 6 + 16 * i
  header.writeUInt8(s, e); header.writeUInt8(s, e + 1)       // width, height
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6) // planes, bits per pixel
  header.writeUInt32LE(images[i].length, e + 8); header.writeUInt32LE(offset, e + 12)
  offset += images[i].length
})
writeFileSync('brand/icon/favicon.ico', Buffer.concat([header, ...images]))
console.log('brand/icon/favicon.ico')

// Lockups and wordmarks, keeping each SVG's proportions
async function wide(file, width, out) {
  const { width: w, height: h } = await sharp(svg(file)).metadata()
  await png(svg(file), width, out, { height: Math.round(width * h / w) })
}
for (const tone of ['black', 'white']) await wide(`lockup/infold-lockup-${tone}.svg`, 1200, `lockup/infold-lockup-${tone}-1200w.png`)
for (const tone of ['black', 'white', 'navy', 'blue']) {
  for (const width of [1200, 600]) await wide(`wordmark/svg/infold-wordmark-${tone}.svg`, width, `wordmark/png/infold-wordmark-${tone}-${width}w.png`)
}

// Copies the web app serves
const copies = {
  'icon/favicon.ico': 'public/favicon.ico',
  'icon/png/favicon-32.png': 'public/favicon-32.png',
  'icon/png/favicon-16.png': 'public/favicon-16.png',
  'icon/png/apple-touch-icon.png': 'public/apple-touch-icon.png',
  'icon/png/infold-icon-192.png': 'public/brand/icon/infold-icon-192.png',
  'icon/png/infold-icon-512.png': 'public/brand/icon/infold-icon-512.png',
}
for (const [from, to] of Object.entries(copies)) { copyFileSync(`brand/${from}`, to); console.log(to) }
