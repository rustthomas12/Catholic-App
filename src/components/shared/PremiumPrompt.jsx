import { Link } from 'react-router-dom'

/**
 * SupportNudge (exported as PremiumPrompt for backward-compatible imports).
 *
 * A soft, non-blocking "Support the Mission" nudge. Never gates content.
 * Can be optionally placed in contexts where a gentle reminder fits.
 *
 * Props:
 *   title     — headline (optional override)
 *   body      — description (optional override)
 *   className — extra wrapper classes
 */
export default function PremiumPrompt({
  title = 'Support Communio',
  body = 'Communio is free for everyone. If it\'s helped your faith life, consider supporting the mission.',
  className = '',
}) {
  return (
    <div className={`rounded-2xl border border-gold/30 bg-cream p-5 text-center ${className}`}>
      <p className="text-navy font-semibold text-sm mb-1">{title}</p>
      <p className="text-gray-500 text-sm leading-relaxed mb-3">{body}</p>
      <Link
        to="/premium"
        className="inline-block text-sm font-bold text-gold hover:underline"
      >
        Support the Mission →
      </Link>
    </div>
  )
}
