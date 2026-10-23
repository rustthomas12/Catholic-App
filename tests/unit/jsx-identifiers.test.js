// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ESLint here doesn't check JSX tag names, so a component used without an
// import only fails at runtime (blank screen behind the error boundary).
// Catch that statically: every <Capitalized> tag must be declared in its file.
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.jsx') ? [p] : []
  })
}

function declared(src) {
  const names = new Set()
  for (const m of src.matchAll(/import\s+([^'";]*?)\s+from\s/g)) {
    for (const n of m[1].replace(/[{}*]/g, ',').split(',')) {
      const name = n.trim().split(/\s+as\s+/).pop()
      if (name) names.add(name)
    }
  }
  for (const m of src.matchAll(/(?:function|class|const|let|var)\s+([A-Z]\w*)/g)) names.add(m[1])
  // destructured params / props renamed to components: { icon: Icon }, ({ Icon }), [Icon]
  for (const m of src.matchAll(/[:{,([]\s*([A-Z]\w*)\s*(?=[,})\]=])/g)) names.add(m[1])
  for (const m of src.matchAll(/:\s*([A-Z]\w*)\s*(?:=|[,}])/g)) names.add(m[1])
  return names
}

describe('JSX components are imported or defined', () => {
  for (const file of files('src')) {
    it(file, () => {
      const src = readFileSync(file, 'utf8')
      const known = declared(src)
      const used = new Set([...src.matchAll(/<([A-Z]\w*)[\s/>]/g)].map((m) => m[1]))
      const missing = [...used].filter((n) => !known.has(n))
      expect(missing).toEqual([])
    })
  }
})
