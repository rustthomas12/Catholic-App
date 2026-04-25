import { Link } from 'react-router-dom'
import { LockClosedIcon } from '@heroicons/react/24/solid'

/**
 * PremiumPrompt — shown in place of premium-gated content.
 *
 * Props:
 *   title      — headline (default: "Premium feature")
 *   body       — description (default: generic)
 *   className  — extra wrapper classes
 */
export default function PremiumPrompt({
  title = 'Support the Mission',
  body = 'This feature is available to supporters of Communio. Your gift keeps the platform ad-free.',
  className = '',
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center ${className}`}>
      <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <LockClosedIcon className="w-7 h-7 text-gold" />
      </div>
      <h3 className="font-bold text-navy mb-1">{title}</h3>
      <p className="text-gray-500 text-sm mb-4">{body}</p>
      <Link
        to="/premium"
        className="inline-flex items-center gap-2 bg-gold text-navy text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gold/90 transition-colors"
      >
        Support Communio
      </Link>
    </div>
  )
}
