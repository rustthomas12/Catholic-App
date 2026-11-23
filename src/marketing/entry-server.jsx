/* eslint-disable react-refresh/only-export-components -- server entry, never hot-reloaded */
// Build-time rendering of the marketing pages (scripts/prerender-marketing.mjs).
// The HTML ships with the text already in it, so a visitor sees the page
// before any JavaScript runs; main.jsx then hydrates it.
import { StrictMode } from 'react'
import { prerenderToNodeStream } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import MarketingRouter from './MarketingRouter'
import { PAGES } from './pages'

export { PAGES }

export async function render(url) {
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <StaticRouter location={url}>
        <MarketingRouter />
      </StaticRouter>
    </StrictMode>
  )
  let html = ''
  for await (const chunk of prelude) html += chunk
  return html
}
