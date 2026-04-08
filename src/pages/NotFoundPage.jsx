import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  document.title = '404 — Page Not Found | Parish App'
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
      {/* Gold cross */}
      <svg viewBox="0 0 40 56" className="w-10 h-14 mb-6 fill-gold" aria-hidden="true">
        <path d="M17 0h6v16h16v6H23v34h-6V22H0v-6h17z" />
      </svg>

      <p className="text-6xl font-bold text-navy mb-3">404</p>
      <p className="text-xl font-semibold text-navy mb-2">Page not found</p>
      <p className="text-sm text-gray-500 mb-8 max-w-xs">
        This page does not exist or has been moved.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={() => navigate('/')}
          className="flex-1 bg-navy text-white text-sm font-semibold py-3 rounded-xl min-h-[44px] hover:bg-opacity-90 transition-colors"
        >
          Go home
        </button>
        <button
          onClick={() => navigate(-1)}
          className="flex-1 bg-white border border-gray-200 text-navy text-sm font-semibold py-3 rounded-xl min-h-[44px] hover:bg-lightbg transition-colors"
        >
          Go back
        </button>
      </div>
    </div>
  )
}
