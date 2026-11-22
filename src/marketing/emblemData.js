import { EMBLEMS } from '../lib/sacredEmblems'

// Emblem drawings for the marketing site (see Emblem.jsx).

const r1 = (n) => Math.round(n * 10) / 10

function ticks(cx, cy, r0, r2, count) {
  let d = ''
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const rr = i % 3 === 0 ? r0 - 2 : r0
    d += `M${r1(cx + rr * Math.cos(a))} ${r1(cy + rr * Math.sin(a))}L${r1(cx + r2 * Math.cos(a))} ${r1(cy + r2 * Math.sin(a))}`
  }
  return `<path d="${d}"/>`
}

export const EXTRA = {
  calendar:
    '<rect x="8" y="11" width="32" height="30" rx="2"/><path d="M8 19h32M16 7v8M32 7v8"/><path d="M24 24v12M19.5 28.5h9"/>',
  hourglass:
    '<path d="M13 6h22M13 42h22M16 6c0 10 8 12 8 18s-8 8-8 18M32 6c0 10-8 12-8 18s8 8 8 18M24 26v8"/>' +
    '<path class="dot" d="M19 40.5c1.5-3.5 3.3-5 5-5s3.5 1.5 5 5z"/><path class="dot" d="M20 12h8c-1 2.6-2.4 4-4 5-1.6-1-3-2.4-4-5z"/>',
  clock:
    `<circle cx="24" cy="24" r="18"/>${ticks(24, 24, 15, 17, 12)}<path d="M24 24V13M24 24l7 4"/><circle cx="24" cy="24" r="1.6" class="dot"/>`,
  quill:
    '<path d="M39 6C28 8 19 16 15 29l-3 9"/><path d="M39 6c-1.5 4-3.5 7-6 9 2 .2 3.6 0 5-.5-2.5 4-6 7-10 8.5 1.2.5 2.6.6 4 .3C27 27 21 29.5 15 29"/><path d="M7 42h16"/>',
  letter:
    '<rect x="6" y="12" width="36" height="25" rx="2"/><path d="M6 14l18 13 18-13"/><circle cx="24" cy="28" r="4.6"/><path d="M24 25.6v4.8M21.6 28h4.8"/>',
  ledger:
    '<rect x="9" y="6" width="30" height="36" rx="2"/><path d="M15 6v36M20 13h13"/><path d="M21 35v-7M27 35V21M33 35v-10"/>',
  register:
    '<rect x="9" y="6" width="30" height="36" rx="2"/><circle cx="17" cy="15" r="2.6"/><circle cx="17" cy="24" r="2.6"/><circle cx="17" cy="33" r="2.6"/><path d="M23 15h10M23 24h10M23 33h10"/>',
  shield:
    '<path d="M24 5l15 5v11c0 10-6.5 17-15 22-8.5-5-15-12-15-22V10z"/><path d="M24 13v20M17 20h14"/>',
  links:
    '<path d="M20 28l8-8"/><path d="M18 23l-4.5 4.5a6.4 6.4 0 0 0 9 9L27 32"/><path d="M30 25l4.5-4.5a6.4 6.4 0 0 0-9-9L21 16"/>',
  orb:
    '<circle cx="24" cy="30" r="13"/><path d="M11 29h26M24 17v12M24 17V5M19.5 9.5h9"/><path d="M14 36.5c6 2.5 14 2.5 20 0"/>',
  temple:
    '<path d="M6 16L24 7l18 9z"/><path d="M9 19.5h30M12 23v13M20 23v13M28 23v13M36 23v13M8 38.5h32M6 42h36"/>',
  fellowship:
    '<circle cx="14" cy="21" r="3.6"/><circle cx="24" cy="16.5" r="4.2"/><circle cx="34" cy="21" r="3.6"/>' +
    '<path d="M7.5 37v-3a6.5 6.5 0 0 1 9-6M40.5 37v-3a6.5 6.5 0 0 0-9-6M15.5 37v-4a8.5 8.5 0 0 1 17 0v4"/><path d="M5 41h38"/>',
  cameo:
    '<ellipse cx="24" cy="24" rx="14" ry="18.5"/><circle cx="24" cy="19" r="5"/><path d="M15.2 37.2c1.3-5.6 4.6-8.7 8.8-8.7s7.5 3.1 8.8 8.7"/>',
  phone:
    '<rect x="14" y="5" width="20" height="38" rx="3.5"/><path d="M21 9h6M24 16v12M19.5 20.5h9"/><circle cx="24" cy="37.5" r="1.6" class="dot"/>',
  moon:
    '<path d="M29 7a16 16 0 1 0 12 25 13 13 0 0 1-12-25z"/><circle cx="37" cy="10" r="1.4" class="dot"/><circle cx="42" cy="18" r="1" class="dot"/><circle cx="33" cy="16" r="1" class="dot"/>',
  reach:
    '<path d="M7 41h34M13 41V31M21 41V25M29 41V19M37 41V12"/><path d="M33 9l4-4 4 4"/>',
  spires:
    '<path d="M5 42V29l7-6 7 6v13M29 42V29l7-6 7 6v13M12 23v-7M9.5 18.5h5M36 23v-7M33.5 18.5h5"/><path d="M19 33c3-3 7-3 10 0M3 42h42"/><path d="M10.5 42v-4a1.5 1.5 0 0 1 3 0v4M34.5 42v-4a1.5 1.5 0 0 1 3 0v4"/>',
  herald:
    '<path d="M6 13v6M8 14h22M8 18h22M30 14l10-6v16l-10-6"/><path d="M12 18v14l4.5-3 4.5 3 4.5-3 4.5 3V18"/><path d="M21 21.5v5.5M18.5 24h5"/>',
  lamp:
    '<path d="M7 29c0-3.5 6-5.5 13-5.5h9L40 19c-1 6-5 10.5-12 11.5H14C10 30.5 7 30 7 29z"/><path d="M40 16.5c-2.6-2.6-2.2-6 0-9.5 2.2 3.5 2.6 6.9 0 9.5z"/>' +
    '<path d="M9.5 26c-4-1.2-4.6-5.6-1-7.5M15 30.5l-2 6h16l-2-6M11 40h20"/>',
  family:
    '<circle cx="15" cy="13" r="4"/><circle cx="33" cy="13" r="4"/><circle cx="24" cy="25" r="3"/>' +
    '<path d="M8 41V28a7 7 0 0 1 14 0M26 28a7 7 0 0 1 14 0v13M18.5 41v-4.5a5.5 5.5 0 0 1 11 0V41"/>',
  check:
    '<path d="M12 25l8 8 16-17"/>',
}

export const EMBLEM_NAMES = [...Object.keys(EXTRA), ...Object.keys(EMBLEMS)]

export function markup(name) {
  const svg = EXTRA[name] ?? EMBLEMS[name]?.svg
  if (!svg) return null
  return svg
    .replace(/class="dot"/g, 'class="emb-dot" fill="currentColor" stroke="none"')
    .replace(/<(path|circle|rect|ellipse|line|polyline)(?![^>]*emb-dot)/g, '<$1 class="ln" pathLength="1"')
}

