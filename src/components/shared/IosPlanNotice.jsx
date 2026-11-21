import { CreditCardIcon } from '@heroicons/react/24/outline'

// Shown on iOS in place of plan pickers and checkout buttons (see
// canPurchaseInApp in lib/platform.js). Deliberately neutral: no prices,
// no links and no directions to buy elsewhere (App Store guideline 3.1.1).
export default function IosPlanNotice({ kind = 'parish', compact = false }) {
  const what = kind === 'organization' ? 'Organization' : kind === 'diocese' ? 'Diocese' : 'Parish'
  return (
    <div className={compact ? 'text-sm text-gray-500' : 'text-center py-12 px-4'}>
      {!compact && <CreditCardIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" aria-hidden="true" />}
      {!compact && <h3 className="font-bold text-navy text-lg mb-2">{what} dashboard not active</h3>}
      <p className={compact ? '' : 'text-gray-500 text-sm max-w-sm mx-auto'}>
        {what} plans can't be started or changed in the iOS app.
      </p>
    </div>
  )
}
