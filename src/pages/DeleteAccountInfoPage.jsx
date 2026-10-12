import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

// Public page explaining account deletion — Google Play requires a web
// link where people can learn how to delete their account and data.
export default function DeleteAccountInfoPage() {
  useEffect(() => { document.title = 'Delete Your Account | Communio' }, [])
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-navy text-sm font-medium mb-6 min-h-[44px]">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 text-sm text-gray-600 leading-relaxed">
          <h1 className="text-2xl font-bold text-navy mb-4">Delete your Communio account</h1>

          <h2 className="text-lg font-bold text-navy mb-2">In the app or on the website</h2>
          <ol className="list-decimal pl-5 space-y-1 mb-6">
            <li>Sign in to Communio.</li>
            <li>Open <strong>More</strong> (your profile picture) → <strong>Settings</strong>.</li>
            <li>Scroll to the bottom and tap <strong>Delete my account</strong>.</li>
            <li>Type <strong>DELETE</strong> to confirm.</li>
          </ol>

          <h2 className="text-lg font-bold text-navy mb-2">Can't sign in?</h2>
          <p className="mb-6">
            Email{' '}
            <a href="mailto:info@getcommunio.app?subject=Delete%20my%20account" className="text-navy font-semibold underline">
              info@getcommunio.app
            </a>{' '}
            from the address you signed up with and ask us to delete your account. We'll confirm within 7 days.
          </p>

          <h2 className="text-lg font-bold text-navy mb-2">What gets deleted</h2>
          <ul className="list-disc pl-5 space-y-1 mb-6">
            <li>Immediately: you're signed out everywhere, your profile, posts, comments and prayer requests are
              hidden, notifications stop, and your email address and username are freed.</li>
            <li>After 90 days: your account and all of its data — including messages, group memberships, and your
              private Confession tracker, prayer journal and intentions — are permanently erased.</li>
            <li>Billing records for parish or organization subscriptions may be kept as required by law.</li>
          </ul>

          <p>
            See our <Link to="/privacy" className="text-navy font-semibold underline">Privacy Policy</Link> for details.
          </p>
        </div>
      </div>
    </div>
  )
}
