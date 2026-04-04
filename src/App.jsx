import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'

// Side-effect: initialize i18n
import './utils/i18n'

import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import ErrorBoundary from './components/shared/ErrorBoundary'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Navigation from './components/shared/Navigation'
import LoadingSpinner from './components/shared/LoadingSpinner'
import { Toaster, toast } from './components/shared/Toast'
import { supabase } from './lib/supabase'

// ── Lazy page imports ──────────────────────────────────────
const HomePage                 = lazy(() => import('./pages/HomePage'))
const LoginPage                = lazy(() => import('./pages/LoginPage'))
const SignupPage               = lazy(() => import('./pages/SignupPage'))
const OnboardingPage           = lazy(() => import('./pages/OnboardingPage'))
const ProfilePage              = lazy(() => import('./pages/ProfilePage'))
const EditProfilePage          = lazy(() => import('./pages/EditProfilePage'))
const GroupsPage               = lazy(() => import('./pages/GroupsPage'))
const GroupPage                = lazy(() => import('./pages/GroupPage'))
const CreateGroupPage          = lazy(() => import('./pages/CreateGroupPage'))
const DirectoryPage            = lazy(() => import('./pages/DirectoryPage'))
const ParishPage               = lazy(() => import('./pages/ParishPage'))
const FaithPage                = lazy(() => import('./pages/FaithPage'))
const PrayerRequestsPage       = lazy(() => import('./pages/PrayerRequestsPage'))
const PremiumPage              = lazy(() => import('./pages/PremiumPage'))
const ExaminationPage          = lazy(() => import('./pages/ExaminationPage'))
const ConfessionTrackerPage    = lazy(() => import('./pages/ConfessionTrackerPage'))
const SaintsPage               = lazy(() => import('./pages/SaintsPage'))
const SaintPage                = lazy(() => import('./pages/SaintPage'))
const NotificationsPage        = lazy(() => import('./pages/NotificationsPage'))
const SettingsPage             = lazy(() => import('./pages/SettingsPage'))
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'))
const ForgotPasswordPage       = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage        = lazy(() => import('./pages/ResetPasswordPage'))
const AdminPage                = lazy(() => import('./pages/AdminPage'))
const ParishAdminPage          = lazy(() => import('./pages/ParishAdminPage'))
const TermsPage                = lazy(() => import('./pages/TermsPage'))
const PrivacyPage              = lazy(() => import('./pages/PrivacyPage'))
const PolicyPage               = lazy(() => import('./pages/PolicyPage'))
const NotFoundPage             = lazy(() => import('./pages/NotFoundPage'))

// ── Last-active updater ────────────────────────────────────
const ACTIVE_INTERVAL_MS = 5 * 60 * 1000

function LastActiveUpdater() {
  const { user } = useAuth()
  const lastUpdateRef = useRef(0)
  const location = useLocation()

  useEffect(() => {
    if (!user) return
    const now = Date.now()
    if (now - lastUpdateRef.current < ACTIVE_INTERVAL_MS) return
    lastUpdateRef.current = now
    supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id)
      .then(() => {})
  }, [location, user])

  return null
}

// ── Offline detector ───────────────────────────────────────
function OfflineDetector() {
  useEffect(() => {
    const handleOffline = () => toast.offline()
    const handleOnline = () => {}
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])
  return null
}

// ── Routes (needs Router context) ─────────────────────────
function AppInner() {
  return (
    <>
      <OfflineDetector />
      <LastActiveUpdater />
      <Navigation />
      <Suspense fallback={<LoadingSpinner fullPage />}>
        <Routes>
          {/* Public */}
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/signup"          element={<SignupPage />} />
          <Route path="/onboarding"      element={<OnboardingPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/terms"           element={<TermsPage />} />
          <Route path="/privacy"         element={<PrivacyPage />} />
          <Route path="/policy"          element={<PolicyPage />} />

          {/* Protected */}
          <Route path="/"                          element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/groups"                    element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
          <Route path="/groups/new"                element={<ProtectedRoute><CreateGroupPage /></ProtectedRoute>} />
          <Route path="/group/:id"                 element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
          <Route path="/directory"                 element={<ProtectedRoute><DirectoryPage /></ProtectedRoute>} />
          <Route path="/parish/:id"                element={<ProtectedRoute><ParishPage /></ProtectedRoute>} />
          <Route path="/faith"                     element={<ProtectedRoute><FaithPage /></ProtectedRoute>} />
          <Route path="/faith/prayer"              element={<ProtectedRoute><PrayerRequestsPage /></ProtectedRoute>} />
          <Route path="/profile"                   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/:id"               element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/settings"                  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/settings/profile"          element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
          <Route path="/settings/notifications"    element={<ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>} />
          <Route path="/notifications"             element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/premium"                   element={<ProtectedRoute><PremiumPage /></ProtectedRoute>} />
          <Route path="/premium/examination"       element={<ProtectedRoute><ExaminationPage /></ProtectedRoute>} />
          <Route path="/premium/confession-tracker" element={<ProtectedRoute><ConfessionTrackerPage /></ProtectedRoute>} />
          <Route path="/saints"                    element={<ProtectedRoute><SaintsPage /></ProtectedRoute>} />
          <Route path="/saints/:id"                element={<ProtectedRoute><SaintPage /></ProtectedRoute>} />
          <Route path="/admin"                     element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/parish-admin/:parishId"    element={<ProtectedRoute><ParishAdminPage /></ProtectedRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Toaster />
          <AppInner />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
