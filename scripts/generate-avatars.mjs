// Writes the built-in profile pictures to public/avatars/<id>.svg from
// src/lib/sacredEmblems.js. Run after changing an emblem or colour:
//   node scripts/generate-avatars.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { AVATAR_PRESETS, avatarSvg } from '../src/lib/sacredEmblems.js'

mkdirSync('public/avatars', { recursive: true })
for (const p of AVATAR_PRESETS) writeFileSync(`public/avatars/${p.id}.svg`, avatarSvg(p) + '\n')
console.log(`wrote ${AVATAR_PRESETS.length} avatars`)
