// Original line emblems in a traditional, engraved style: used for app icons
// (SacredIcon) and the built-in profile pictures (scripts/generate-avatars.mjs).
// Each is SVG markup on a 48 x 48 grid, drawn with stroke="currentColor";
// "dot" elements are small solid fills.
//
// Replaces the emojis that were scattered through the app.

const r1 = (n) => Math.round(n * 10) / 10

function ring(cx, cy, r, count, beadR, skipBottom = false) {
  let out = ''
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2
    if (skipBottom && Math.abs(a - Math.PI / 2) < 0.01) continue
    out += `<circle cx="${r1(cx + r * Math.cos(a))}" cy="${r1(cy + r * Math.sin(a))}" r="${beadR}" class="dot"/>`
  }
  return out
}

function rays(cx, cy, r0, r2, count) {
  let d = ''
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const long = i % 2 === 0
    const rr = long ? r2 : r2 - 3
    d += `M${r1(cx + r0 * Math.cos(a))} ${r1(cy + r0 * Math.sin(a))}L${r1(cx + rr * Math.cos(a))} ${r1(cy + rr * Math.sin(a))}`
  }
  return `<path d="${d}"/>`
}

function star(cx, cy, outer, inner, points) {
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? outer : inner
    d += `${i ? 'L' : 'M'}${r1(cx + r * Math.cos(a))} ${r1(cy + r * Math.sin(a))}`
  }
  return `<path d="${d}Z"/>`
}

export const EMBLEMS = {
  cross: {
    label: 'Cross',
    svg: '<path d="M24 5v38M13 15h22"/><path d="M21 5h6M21 43h6M13 12v6M35 12v6" opacity=".55"/>',
  },
  chiRho: {
    label: 'Chi-Rho',
    svg: '<path d="M24 43V7h6a6.5 6.5 0 0 1 0 13h-6"/><path d="M13 17l22 22M35 17L13 39"/>',
  },
  dove: {
    label: 'Dove',
    // Descending dove of the Holy Spirit: tail up, wings spread, head down
    svg: '<path d="M20.5 5l3.5 7 3.5-7"/><path d="M24 12c-3 0-5 3-5 8 0 6 2 10 5 15 3-5 5-9 5-15 0-5-2-8-5-8z"/><path d="M19 18C14 11 8 8 3 8c1 4 3 7 7 9-1.5 1-1.5 2.5 0 3.5 3 1 6 2 9 3M29 18c5-7 11-10 16-10-1 4-3 7-7 9 1.5 1 1.5 2.5 0 3.5-3 1-6 2-9 3"/><circle cx="24" cy="38.5" r="3"/><path d="M24 41.5V45"/>',
  },
  chalice: {
    label: 'Chalice',
    svg: '<circle cx="24" cy="8" r="4"/><path d="M13 15h22c0 9-5 14-11 14s-11-5-11-14zM24 29v8M15 43c2-3 5-6 9-6s7 3 9 6z"/>',
  },
  lily: {
    label: 'Lily',
    svg: '<path d="M24 32c-4-9-4-18 0-26 4 8 4 17 0 26zM24 32c-8-2-13-7-15-15 7 2 12 7 15 15zM24 32c8-2 13-7 15-15-7 2-12 7-15 15zM24 32v12M24 40c-4-1-7-3-8-6M24 40c4-1 7-3 8-6"/>',
  },
  sacredHeart: {
    label: 'Sacred Heart',
    svg: '<path d="M24 43C14 35 8 29 8 22a7.5 7.5 0 0 1 16-3 7.5 7.5 0 0 1 16 3c0 7-6 13-16 21z"/><path d="M24 4v10M20.5 7.5h7"/><path d="M11 25c8 3 18 3 26 0" stroke-dasharray="2 2.5"/>',
  },
  keys: {
    label: 'Keys of Peter',
    svg: '<circle cx="11" cy="11" r="5"/><circle cx="37" cy="11" r="5"/><path d="M14.5 14.5L40 40M33.5 14.5L8 40M36 36l-4 4M40 40l-3 3M12 36l4 4M8 40l3 3"/>',
  },
  anchor: {
    label: 'Anchor',
    svg: '<circle cx="24" cy="8" r="3.5"/><path d="M24 11.5V43M16 18h16M9 30c2 8 8 13 15 13s13-5 15-13M9 30l-3 4M9 30l4 1M39 30l3 4M39 30l-4 1"/>',
  },
  ichthys: {
    label: 'Fish',
    svg: '<path d="M5 33C13 14 31 12 43 24M5 15c8 19 26 21 38 9"/><circle cx="35" cy="22" r="1.4" class="dot"/>',
  },
  crown: {
    label: 'Crown',
    svg: '<path d="M10 37h28M11 31h26M10 37L8 18l8 8 8-14 8 14 8-8-2 19"/><circle cx="8" cy="16" r="1.6" class="dot"/><circle cx="24" cy="10" r="1.6" class="dot"/><circle cx="40" cy="16" r="1.6" class="dot"/>',
  },
  rose: {
    label: 'Rose',
    svg: '<circle cx="24" cy="21" r="9"/><path d="M24 16c3 0 5 2 5 5s-2 4-4 4-3-1.5-3-3 1-2 2-2"/><path d="M15 22c-4 1-5 5-4 8 3 4 8 6 13 6s10-2 13-6c1-3 0-7-4-8"/><path d="M24 36v8M24 40c3-3 6-3 8-2"/>',
  },
  stellaMaris: {
    label: 'Star of the Sea',
    svg: star(24, 22, 15, 6, 8) + '<path d="M10 42c5-3 9-3 14 0s9 3 14 0"/>',
  },
  candle: {
    label: 'Candle',
    svg: '<path d="M24 5c3 4 4.5 7 4.5 9a4.5 4.5 0 0 1-9 0c0-2 1.5-5 4.5-9zM24 18.5V21"/><rect x="19" y="21" width="10" height="19" rx="1"/><path d="M13 40h22M16 44h16"/>',
  },
  shell: {
    label: 'Scallop Shell',
    svg: '<path d="M24 39L8 19c4-8 10-12 16-12s12 4 16 12z"/><path d="M24 39L13 11M24 39V7M24 39l11-28M24 39L9 16M24 39l15-23"/><path d="M19 39h10l-1.5 4h-7z"/>',
  },
  church: {
    label: 'Church',
    svg: '<path d="M10 43V25l14-10 14 10v18zM24 15V4M20 7.5h8M21 43v-8a3 3 0 0 1 6 0v8"/><circle cx="24" cy="25" r="3"/>',
  },
  rosary: {
    label: 'Rosary',
    svg: ring(24, 17, 12, 12, 1.7, true) + '<path d="M24 29v6M24 35v10M20 39h8"/>',
  },
  wheatGrapes: {
    label: 'Wheat and Grapes',
    svg: '<path d="M15 44V12M15 16c-3-1-4.5-3-4.5-6 3 1 4.5 3 4.5 6zM15 16c3-1 4.5-3 4.5-6-3 1-4.5 3-4.5 6zM15 23c-3-1-4.5-3-4.5-6 3 1 4.5 3 4.5 6zM15 23c3-1 4.5-3 4.5-6-3 1-4.5 3-4.5 6zM15 30c-3-1-4.5-3-4.5-6 3 1 4.5 3 4.5 6zM15 30c3-1 4.5-3 4.5-6-3 1-4.5 3-4.5 6z"/><path d="M33 12v7M33 14c3-3 6-3 8-2"/><circle cx="27" cy="22" r="3"/><circle cx="33" cy="22" r="3"/><circle cx="39" cy="22" r="3"/><circle cx="30" cy="28" r="3"/><circle cx="36" cy="28" r="3"/><circle cx="33" cy="34" r="3"/>',
  },
  book: {
    label: 'Gospel Book',
    svg: '<path d="M24 14c-5-3-11-4-16-3v27c5-1 11 0 16 3 5-3 11-4 16-3V11c-5-1-11 0-16 3zM24 14v27"/><path d="M15 19v8M12 22h6" opacity=".7"/>',
  },
  jerusalemCross: {
    label: 'Jerusalem Cross',
    svg: '<path d="M24 8v32M8 24h32M14 10v8M10 14h8M34 10v8M30 14h8M14 30v8M10 34h8M34 30v8M30 34h8"/>',
  },
  monstrance: {
    label: 'Monstrance',
    svg: '<circle cx="24" cy="18" r="6"/>' + rays(24, 18, 9, 15, 16) + '<path d="M24 33v7M17 45l7-5 7 5z"/>',
  },
  // ── UI icons (not offered as profile pictures) ──
  prayingHands: {
    label: 'Prayer',
    // Folded hands: two palms pressed together, fingertips up, cuffs below
    svg: '<path d="M24 6c-1.6 0-2.6 1.4-3 3.5l-2.6 13c-.6 3-.4 5.5 1 7.6L16 36h16l-3.4-5.9c1.4-2.1 1.6-4.6 1-7.6L27 9.5C26.6 7.4 25.6 6 24 6zM24 6v24"/><path d="M19.4 18c-2 1-3.4 3-3.9 6M28.6 18c2 1 3.4 3 3.9 6"/><path d="M14 36h20v6H14z"/>',
  },
  bell: {
    label: 'Bell',
    svg: '<path d="M24 6v4M12 34c3-3 3-7 3-12a9 9 0 0 1 18 0c0 5 0 9 3 12zM9 34h30M21 38a3 3 0 0 0 6 0"/>',
  },
  sunrise: {
    label: 'Morning',
    svg: '<path d="M10 34a14 14 0 0 1 28 0M4 34h40M24 8v6M10.6 15.6l4.2 4.2M37.4 15.6l-4.2 4.2M10 40h28" /><path d="M24 20v10M20 24h8" opacity=".7"/>',
  },
  scroll: {
    label: 'Scroll',
    svg: '<path d="M14 8h22a4 4 0 0 1 0 8h-4v24a4 4 0 0 1-4 4H12a4 4 0 0 1 0-8h4V12a4 4 0 0 0-4-4zM12 8a4 4 0 0 1 4 4M20 20h8M20 26h8M20 32h6"/>',
  },
  megaphone: {
    label: 'Announcement',
    svg: '<path d="M8 20v8h6l14 8V12l-14 8zM14 28l2 10h4l-2-10M34 18a6 6 0 0 1 0 12"/>',
  },
  lock: {
    label: 'Private',
    svg: '<rect x="11" y="21" width="26" height="21" rx="3"/><path d="M16 21v-5a8 8 0 0 1 16 0v5M24 29v6"/>',
  },
  wedding: {
    label: 'Marriage',
    svg: '<circle cx="18" cy="28" r="9"/><circle cx="30" cy="28" r="9"/><path d="M24 6v9M20.5 9.5h7"/>',
  },
  flame: {
    label: 'Flame',
    svg: '<path d="M24 5c6 7 11 13 11 21a11 11 0 0 1-22 0c0-5 2-8 5-11 0 4 2 6 4 7-1-6 0-11 2-17z"/>',
  },
  pin: {
    label: 'Location',
    svg: '<path d="M24 43s-12-12-12-22a12 12 0 0 1 24 0c0 10-12 22-12 22z"/><circle cx="24" cy="21" r="4"/>',
  },
}

// Built-in profile pictures: emblem + liturgical colour ground
export const AVATAR_PRESETS = [
  { id: 'cross',          emblem: 'cross',          bg: '#1B2A4A', fg: '#E9D7A1' },
  { id: 'chi-rho',        emblem: 'chiRho',         bg: '#7A1F2B', fg: '#F1E3BC' },
  { id: 'dove',           emblem: 'dove',           bg: '#2E5E9E', fg: '#FFFFFF' },
  { id: 'chalice',        emblem: 'chalice',        bg: '#C9A84C', fg: '#1B2A4A' },
  { id: 'lily',           emblem: 'lily',           bg: '#2F5D46', fg: '#F4EEDD' },
  { id: 'sacred-heart',   emblem: 'sacredHeart',    bg: '#9B1C2C', fg: '#F7E3B5' },
  { id: 'keys',           emblem: 'keys',           bg: '#24324F', fg: '#D9B96A' },
  { id: 'anchor',         emblem: 'anchor',         bg: '#355C7D', fg: '#F3EBD8' },
  { id: 'fish',           emblem: 'ichthys',        bg: '#2C6E6A', fg: '#F2EAD3' },
  { id: 'crown',          emblem: 'crown',          bg: '#4B2E5E', fg: '#E8C96B' },
  { id: 'rose',           emblem: 'rose',           bg: '#B5596B', fg: '#FFF4EC' },
  { id: 'stella-maris',   emblem: 'stellaMaris',    bg: '#1F4E8C', fg: '#F4E6B8' },
  { id: 'candle',         emblem: 'candle',         bg: '#5B3A6E', fg: '#F6E7C1' },
  { id: 'shell',          emblem: 'shell',          bg: '#EFE6D2', fg: '#7A5A2E' },
  { id: 'church',         emblem: 'church',         bg: '#3D5A3F', fg: '#F0E6CF' },
  { id: 'rosary',         emblem: 'rosary',         bg: '#26324A', fg: '#E3CF95' },
  { id: 'wheat-grapes',   emblem: 'wheatGrapes',    bg: '#D8C08A', fg: '#4A2F4F' },
  { id: 'gospel-book',    emblem: 'book',           bg: '#7D2E2E', fg: '#F3E2B8' },
  { id: 'jerusalem',      emblem: 'jerusalemCross', bg: '#F3ECDD', fg: '#8E1B22' },
  { id: 'monstrance',     emblem: 'monstrance',     bg: '#B8913C', fg: '#FFF8E6' },
]

export const presetAvatarUrl = (id) => `/avatars/${id}.svg`
export const isPresetAvatar = (url) => typeof url === 'string' && url.startsWith('/avatars/')

// Full profile-picture SVG for one preset: colour ground, a fine inner
// ring like an engraved medallion, and the emblem
export function avatarSvg({ emblem, bg, fg }) {
  const e = EMBLEMS[emblem]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">` +
    `<rect width="200" height="200" fill="${bg}"/>` +
    `<circle cx="100" cy="100" r="88" fill="none" stroke="${fg}" stroke-opacity=".28" stroke-width="2"/>` +
    `<circle cx="100" cy="100" r="82" fill="none" stroke="${fg}" stroke-opacity=".16" stroke-width="1"/>` +
    `<g transform="translate(46 46) scale(2.25)" fill="none" stroke="${fg}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">` +
    e.svg.replace(/class="dot"/g, `fill="${fg}" stroke="none"`) +
    `</g></svg>`
}
