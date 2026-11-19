/**
 * Build-time plugin: lets the browser fetch the home screen's code in
 * parallel with the app's own startup code.
 *
 * The home screen is lazy-loaded, so normally its files (and ~35 small
 * shared chunks) are only requested after the main bundle has downloaded
 * and run: a second round trip before the feed can draw. This writes a
 * tiny inline script into index.html that, for signed-in visits to "/",
 * adds <link rel="modulepreload"> hints for those files immediately.
 * Hints only: if anything is off, the app loads exactly as before.
 */
export function preloadHomeScreen() {
  let base = '/'
  return {
    name: 'infold:preload-home-screen',
    apply: 'build',
    configResolved(c) { base = c.base },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        const chunks = Object.values(bundle).filter((c) => c.type === 'chunk')
        const home = chunks.find((c) => c.facadeModuleId?.split(String.fromCharCode(92)).join('/').endsWith('/src/pages/HomePage.jsx'))
        if (!home) return html
        const byFile = Object.fromEntries(chunks.map((c) => [c.fileName, c]))
        const files = new Set()
        const walk = (f) => { if (files.has(f) || !byFile[f]) return; files.add(f); byFile[f].imports.forEach(walk) }
        walk(home.fileName)
        // Skip what index.html already loads
        const urls = [...files].filter((f) => !html.includes(f)).map((f) => base + f)
        if (!urls.length) return html
        const script = `<script>try{if(location.pathname==='/'&&localStorage.getItem('parish-app-auth')){for(const u of ${JSON.stringify(urls)}){const l=document.createElement('link');l.rel='modulepreload';l.href=u;document.head.appendChild(l)}}}catch(e){}</script>`
        return html.replace('</head>', `    ${script}\n  </head>`)
      },
    },
  }
}
