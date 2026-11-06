import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useGoBack from '../hooks/useGoBack'
import { LogoMark } from '../components/shared/Logo'

export default function NotFoundPage() {
  useEffect(() => { document.title = '404 — Page Not Found | inFold' }, [])
  const navigate = useNavigate()
  const goBack = useGoBack()

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
      <LogoMark className="w-16 h-16 rounded-2xl mb-6" alt="" />

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
          onClick={goBack}
          className="flex-1 bg-white border border-gray-200 text-navy text-sm font-semibold py-3 rounded-xl min-h-[44px] hover:bg-lightbg transition-colors"
        >
          Go back
        </button>
      </div>
    </div>
  )
}
