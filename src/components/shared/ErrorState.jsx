import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function ErrorState({
  title = 'Something went wrong',
  body = 'Please try again.',
  onRetry,
  icon: Icon = ExclamationTriangleIcon,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Icon className="w-10 h-10 text-gold mb-4" />
      <p className="text-base font-semibold text-navy mb-1">{title}</p>
      <p className="text-sm text-gray-500 mb-5">{body}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-white border border-gray-200 text-navy text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px] hover:bg-lightbg transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}
