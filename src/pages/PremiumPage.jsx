import { HeartIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid'

const TIERS = [
  {
    label: 'One-Time Gift',
    amounts: ['$5', '$10', '$25', '$50'],
    icon: HeartIcon,
    description: 'Help cover server costs and keep the app free for everyone.',
  },
  {
    label: 'Monthly Patron',
    amounts: ['$3 / mo', '$5 / mo', '$10 / mo'],
    icon: SparklesIcon,
    description: 'Sustain the mission with a small recurring gift. Cancel anytime.',
  },
]

const PERKS = [
  'Keep the app free for all Catholics',
  'Support new features and content',
  'Fund Catholic content partnerships',
  'Help reach more parishes across the US',
]

export default function SupportPage() {
  document.title = 'Support the Mission | Parish App'

  function handleDonate(amount) {
    // Placeholder: open Stripe/Ko-fi/Donorbox link
    alert(`Thank you! Donation link for ${amount} coming soon.`)
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <HeartSolid className="w-7 h-7 text-gold" />
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">Support the Mission</h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
            Parish App is a free, ad-free Catholic community built to help you grow in faith.
            Your generosity makes it possible.
          </p>
        </div>

        {/* Why it matters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">Why your gift matters</p>
          <ul className="space-y-2">
            {PERKS.map(perk => (
              <li key={perk} className="flex items-center gap-2.5 text-sm text-navy">
                <span className="w-5 h-5 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 12 12" className="w-3 h-3 fill-gold">
                    <path d="M10 3L5 9 2 6" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        {/* Donation tiers */}
        {TIERS.map(({ label, amounts, icon: Icon, description }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-gold" />
              <p className="font-bold text-navy text-sm">{label}</p>
            </div>
            <p className="text-xs text-gray-500 mb-4">{description}</p>
            <div className="flex flex-wrap gap-2">
              {amounts.map(amt => (
                <button
                  key={amt}
                  onClick={() => handleDonate(amt)}
                  className="px-4 py-2 border-2 border-gold text-gold font-bold text-sm rounded-xl hover:bg-gold hover:text-navy transition-colors"
                >
                  {amt}
                </button>
              ))}
              <button
                onClick={() => handleDonate('custom')}
                className="px-4 py-2 border border-gray-200 text-gray-500 font-semibold text-sm rounded-xl hover:border-navy hover:text-navy transition-colors"
              >
                Custom
              </button>
            </div>
          </div>
        ))}

        {/* Scripture */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-400 italic leading-relaxed">
            "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion,
            for God loves a cheerful giver."
          </p>
          <p className="text-xs text-gray-300 mt-1">— 2 Corinthians 9:7</p>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          Parish App is not a registered 501(c)(3). Gifts are not tax-deductible.
        </p>
      </div>
    </div>
  )
}
