import { markup } from './emblemData'

// Engraved line emblems for the marketing site. Reuses the app's sacred
// emblems (src/lib/sacredEmblems.js) and adds the ones the site needs, drawn
// on the same 48 x 48 grid in the same style. "dot" elements are solid.
//
// Every stroke gets class="ln" and pathLength="1" so CSS can draw it in (.emb-draw in
// marketing.css) when its section scrolls into view.

/**
 * <Emblem name="chalice" className="w-8 h-8" />
 * Inherits text colour. Inside an element with .emb-draw (marketing.css),
 * the lines draw themselves in once an ancestor gets .is-in (Reveal).
 */
export default function Emblem({ name, className = 'w-8 h-8', strokeWidth = 1.9, title }) {
  const html = markup(name)
  if (!html) return null
  return (
    <svg
      viewBox="0 0 48 48"
      className={`inline-block flex-shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
