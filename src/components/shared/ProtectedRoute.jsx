import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import LoadingSpinner from './LoadingSpinner'

// Routes that are never valid returnUrl targets (avoids redirect loops)
const AUTH_PATHS = new Set(['/login', '/signup', '/forgot-password', '/reset-password', '/check-email'])

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, profile } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner fullPage />

  if (!isAuthenticated) {
    const returnPath = location.pathname + location.search
    const safeReturn = AUTH_PATHS.has(location.pathname) ? '/' : returnPath
    return (
      <Navigate
        to={`/login?returnUrl=${encodeURIComponent(safeReturn)}`}
        replace
      />
    )
  }

  // Block suspended users from all protected routes
  if (profile?.suspended_at) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="font-bold text-navy text-lg mb-2">Account under review</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your account is temporarily suspended. Please contact{' '}
            <a href="mailto:hello@communio.app" className="text-navy font-semibold hover:underline">
              hello@communio.app
            </a>{' '}
            if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  return children
}
