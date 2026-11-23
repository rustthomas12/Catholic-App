// Pre-builds the marketing pages after `vite build`.
//
// Renders each page with React on the build machine and writes the HTML into
// the built marketing.html (home) and dist/m/<page>.html, which vercel.json
// serves on getinfold.app. Visitors see text and the opening animation
// immediately; the JavaScript then takes over (hydrates) the same markup.
// Also preloads the display font and adds per-page titles and descriptions.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { createServer } from 'vite'

const SITE = 'https://getinfold.app'
const template = readFileSync('dist/marketing.html', 'utf8')
if (!template.includes('<div id="root"></div>')) throw new Error('dist/marketing.html: root element not found')

// The two font files the first screen uses (regular and italic, latin)
const fonts = readdirSync('dist/assets').filter((f) => /^cormorant-garamond-latin-wght-(normal|italic)-.*\.woff2$/.test(f))
const preload = fonts.map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin>`).join('\n    ')

// Marks sections already on screen before React starts, so their content
// shows at once instead of waiting for the JavaScript (see Reveal in ui.jsx)
const revealNow = `<script>document.querySelectorAll('[data-reveal]').forEach(function(e){if(e.getBoundingClientRect().top<innerHeight*.9)e.classList.add('is-in')})</script>`

// The stylesheet goes inline (about 14 KB compressed): the first paint needs
// it, and as a separate file it queued behind 200 KB of JavaScript on slow
// phones. Fonts are next in line; the JavaScript (which only takes over
// markup already on screen) is fetched at low priority.
const cssHref = template.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/)
if (!cssHref) throw new Error('dist/marketing.html: stylesheet not found')
const css = readFileSync('dist' + cssHref[1], 'utf8').replace(/<\/style/gi, '<\/style')
function optimiseHead(html) {
  return html
    .replace(cssHref[0], '')
    .replace(/\s*<link rel="manifest"[^>]*>/, '') // the app's install manifest; not for the website
    .replace(/<link rel="modulepreload"/g, '<link rel="modulepreload" fetchpriority="low"')
    .replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />
    <style>${css}</style>
    ${preload}`)
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { render, PAGES } = await vite.ssrLoadModule('/src/marketing/entry-server.jsx')
  mkdirSync('dist/m', { recursive: true })
  for (const [path, meta] of Object.entries(PAGES)) {
    const body = await render(path)
    const url = SITE + (path === '/' ? '/' : path)
    let html = optimiseHead(template)
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(meta.description)}"`)
      .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(meta.title)}"`)
      .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(meta.description)}"`)
      .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
      .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
      .replace('<div id="root"></div>', `<div id="root" data-path="${path}">${body}</div>${revealNow}`)
    const out = path === '/' ? 'dist/marketing.html' : `dist/m${path}.html`
    writeFileSync(out, html)
    console.log(`prerendered ${path} -> ${out} (${Math.round(html.length / 1024)} KB)`)
  }
} finally {
  await vite.close()
}
