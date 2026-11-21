import { EMBLEMS } from '../../lib/sacredEmblems'

// Line emblem in the app's traditional style (see src/lib/sacredEmblems.js).
// Inherits the text colour; size with className, e.g. "w-5 h-5".
export default function SacredIcon({ name, className = 'w-5 h-5', strokeWidth = 2.4, title }) {
  const e = EMBLEMS[name]
  if (!e) return null
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
      dangerouslySetInnerHTML={{ __html: e.svg.replace(/class="dot"/g, 'fill="currentColor" stroke="none"') }}
    />
  )
}
