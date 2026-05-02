import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Side-effect: initialize i18n
import './utils/i18n'

import MarketingRouter from './marketing/MarketingRouter'

import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import ErrorBoundary from './components/shared/ErrorBoundary'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Navigation from './components/shared/Navigation'
import { Toaster, toast } from './components/shared/Toast'
import InstallPrompt from './components/shared/InstallPrompt'
import PushPrompt from './components/shared/PushPrompt'
import RouteErrorBoundary from './components/shared/RouteErrorBoundary'
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
const GroupSettingsPage        = lazy(() => import('./pages/GroupSettingsPage'))
const DirectoryPage            = lazy(() => import('./pages/DirectoryPage'))
const ParishPage               = lazy(() => import('./pages/ParishPage'))
const FaithPage                = lazy(() => import('./pages/FaithPage'))
const PrayerRequestsPage       = lazy(() => import('./pages/PrayerRequestsPage'))
const PremiumPage              = lazy(() => import('./pages/PremiumPage'))
const ExaminationPage          = lazy(() => import('./pages/ExaminationPage'))
const ConfessionTrackerPage    = lazy(() => import('./pages/ConfessionTrackerPage'))
const PremiumSuccessPage       = lazy(() => import('./pages/PremiumSuccessPage'))
const SaintsPage               = lazy(() => import('./pages/SaintsPage'))
const SaintPage                = lazy(() => import('./pages/SaintPage'))
const NotificationsPage        = lazy(() => import('./pages/NotificationsPage'))
const SettingsPage             = lazy(() => import('./pages/SettingsPage'))
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'))
const CheckEmailPage           = lazy(() => import('./pages/CheckEmailPage'))
const ForgotPasswordPage       = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage        = lazy(() => import('./pages/ResetPasswordPage'))
const AdminPage                = lazy(() => import('./pages/AdminPage'))
const ParishAdminPage          = lazy(() => import('./pages/ParishAdminPage'))
const OrganizationsPage        = lazy(() => import('./pages/OrganizationsPage'))
const OrganizationPage         = lazy(() => import('./pages/OrganizationPage'))
const CreateOrganizationPage   = lazy(() => import('./pages/CreateOrganizationPage'))
const OrgAdminPage             = lazy(() => import('./pages/OrgAdminPage'))
const JoinPage                 = lazy(() => import('./pages/JoinPage'))
const MessagesPage             = lazy(() => import('./pages/MessagesPage'))
const TermsPage                = lazy(() => import('./pages/TermsPage'))
const PrivacyPage              = lazy(() => import('./pages/PrivacyPage'))
const PolicyPage               = lazy(() => import('./pages/PolicyPage'))
const NotFoundPage             = lazy(() => import('./pages/NotFoundPage'))
const PitchDeckPage            = lazy(() => import('./pages/PitchDeckPage'))
const RosaryTrackerPage        = lazy(() => import('./pages/RosaryTrackerPage'))
const PrayerJournalPage        = lazy(() => import('./pages/PrayerJournalPage'))
const LiturgyOfHoursPage       = lazy(() => import('./pages/LiturgyOfHoursPage'))
const FormationPage            = lazy(() => import('./pages/FormationPage'))

// ── Last-active updater ────────────────────────────────────
// Fires once on mount (app opened) then every 10 minutes.
// Previously triggered on every route change which was unnecessary.
const ACTIVE_INTERVAL_MS = 10 * 60 * 1000

function LastActiveUpdater() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const update = () => {
      supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {})
    }

    update() // fire immediately on mount / user change
    const interval = setInterval(update, ACTIVE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [user])

  return null
}

// ── Offline detector ───────────────────────────────────────
function OfflineDetector() {
  useEffect(() => {
    const handleOffline = () => toast.offline()
    const handleOnline = () => toast.online()
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])
  return null
}

// ── Suspended user banner ─────────────────────────────────
function SuspendedBanner() {
  const { profile } = useAuth()
  if (!profile?.suspended_at) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] bg-amber-500 text-white text-sm font-medium text-center px-4 py-2.5 shadow-md">
      Your account is currently under review. Some features are temporarily limited.
    </div>
  )
}

// ── Routes (needs Router context) ─────────────────────────
function AppInner() {
  return (
    <>
      <OfflineDetector />
      <LastActiveUpdater />
      <SuspendedBanner />
      <InstallPrompt />
      <PushPrompt />
      <Navigation />
      <Suspense fallback={<div className="min-h-screen bg-cream" />}>
        <Routes>
          {/* Public */}
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/signup"          element={<SignupPage />} />
          <Route path="/onboarding"      element={<OnboardingPage />} />
          <Route path="/check-email"      element={<CheckEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/terms"           element={<TermsPage />} />
          <Route path="/privacy"         element={<PrivacyPage />} />
          <Route path="/policy"          element={<PolicyPage />} />
          <Route path="/pitch"           element={<PitchDeckPage />} />

          {/* Protected */}
          <Route path="/"                          element={<ProtectedRoute><RouteErrorBoundary><HomePage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/groups"                    element={<ProtectedRoute><RouteErrorBoundary><GroupsPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/groups/new"                element={<ProtectedRoute><RouteErrorBoundary><CreateGroupPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/group/:id"                 element={<ProtectedRoute><RouteErrorBoundary><GroupPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/group/:id/settings"        element={<ProtectedRoute><RouteErrorBoundary><GroupSettingsPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/directory"                 element={<ProtectedRoute><RouteErrorBoundary><DirectoryPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/parish/:id"                element={<ProtectedRoute><RouteErrorBoundary><ParishPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/faith"                         element={<ProtectedRoute><RouteErrorBoundary><FaithPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/faith/prayer"                  element={<ProtectedRoute><RouteErrorBoundary><PrayerRequestsPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/faith/journal"                 element={<ProtectedRoute><RouteErrorBoundary><PrayerJournalPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/faith/rosary"                  element={<ProtectedRoute><RouteErrorBoundary><RosaryTrackerPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/faith/hours"                   element={<ProtectedRoute><RouteErrorBoundary><LiturgyOfHoursPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/faith/formation/:program"      element={<ProtectedRoute><RouteErrorBoundary><FormationPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/profile"                   element={<ProtectedRoute><RouteErrorBoundary><ProfilePage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/profile/:id"               element={<ProtectedRoute><RouteErrorBoundary><ProfilePage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/settings"                  element={<ProtectedRoute><RouteErrorBoundary><SettingsPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/settings/profile"          element={<ProtectedRoute><RouteErrorBoundary><EditProfilePage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/settings/notifications"    element={<ProtectedRoute><RouteErrorBoundary><NotificationSettingsPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/notifications"             element={<ProtectedRoute><RouteErrorBoundary><NotificationsPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/premium"                   element={<RouteErrorBoundary><PremiumPage /></RouteErrorBoundary>} />
          <Route path="/premium/success"           element={<ProtectedRoute><RouteErrorBoundary><PremiumSuccessPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/premium/examination"       element={<ProtectedRoute><RouteErrorBoundary><ExaminationPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/premium/confession-tracker" element={<ProtectedRoute><RouteErrorBoundary><ConfessionTrackerPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/saints"                    element={<ProtectedRoute><RouteErrorBoundary><SaintsPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/saints/:id"                element={<ProtectedRoute><RouteErrorBoundary><SaintPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/admin"                     element={<ProtectedRoute><RouteErrorBoundary><AdminPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/parish-admin/:parishId"    element={<ProtectedRoute><RouteErrorBoundary><ParishAdminPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/organizations"             element={<ProtectedRoute><RouteErrorBoundary><OrganizationsPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/organizations/new"         element={<ProtectedRoute><RouteErrorBoundary><CreateOrganizationPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/organization/:id"          element={<ProtectedRoute><RouteErrorBoundary><OrganizationPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/org-admin/:orgId"          element={<ProtectedRoute><RouteErrorBoundary><OrgAdminPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/messages"                  element={<ProtectedRoute><RouteErrorBoundary><MessagesPage /></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/join/:inviteCode"          element={<JoinPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  )
}

// Serve the marketing site when accessed from the main domain
const isMarketingDomain =
  window.location.hostname === 'getcommunio.app' ||
  window.location.hostname === 'www.getcommunio.app'

export default function App() {
  if (isMarketingDomain) {
    return (
      <ErrorBoundary>
        <BrowserRouter>
          <MarketingRouter />
        </BrowserRouter>
      </ErrorBoundary>
    )
  }

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
