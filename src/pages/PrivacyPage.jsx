import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-bold text-navy mb-2">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  document.title = 'Privacy Policy | Parish App'
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-navy text-sm font-medium mb-6 min-h-[44px]">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h1 className="text-2xl font-bold text-navy mb-1">Privacy Policy</h1>
          <p className="text-xs text-gray-400 mb-6">Last updated: April 4, 2026</p>

          <Section title="1. Who We Are">
            <p>Parish App is built by Thomas Rust in Massachusetts. We are a solo-founded Catholic social network. Our mission is to serve the Catholic community — not to profit from your data.</p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect only what we need to provide the service:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Account information:</strong> your name, email address, parish selection, and vocation state that you provide at signup</li>
              <li><strong>Content you create:</strong> posts, comments, and prayer requests you share</li>
              <li><strong>Usage data:</strong> which features you use and when you log in (collected anonymously via PostHog — no personal identifiers)</li>
              <li><strong>Device information:</strong> browser type, for PWA functionality only</li>
            </ul>
          </Section>

          <Section title="3. Information We Do NOT Collect">
            <ul className="list-disc pl-5 space-y-1">
              <li>We do not collect your location (except voluntarily for parish search)</li>
              <li>We do not track you across other websites</li>
              <li>We do not collect payment information — Stripe handles all payment processing and we never see your card details</li>
              <li>We do not build advertising profiles</li>
            </ul>
          </Section>

          <Section title="4. How We Use Your Information">
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and improve the Parish App service</li>
              <li>To send you notifications you have opted into</li>
              <li>To show you relevant parish and group content</li>
              <li>To send transactional emails (welcome, password reset)</li>
            </ul>
            <p className="mt-2 font-medium text-navy">We never sell your data. We never use your data for advertising.</p>
          </Section>

          <Section title="5. The Confession Tracker: Maximum Privacy">
            <div className="bg-navy/5 border border-navy/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="w-5 h-5 text-navy flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-navy mb-1">This section is critically important.</p>
                  <p>The Confession Tracker is protected by database-level security policies called Row Level Security (RLS). These policies make it <strong>technically impossible</strong> for anyone — including our engineering team, our database administrators, or any automated system — to read your confession records.</p>
                  <p className="mt-2">Only your own account can access this data. This is enforced at the database level, not just as a policy. We designed it this way intentionally because we believe the privacy of your spiritual life is sacred.</p>
                </div>
              </div>
            </div>
          </Section>

          <Section title="6. Data Storage">
            <p>Your data is stored on Supabase (supabase.com) on servers located in the United States. All data is encrypted in transit (HTTPS) and at rest.</p>
          </Section>

          <Section title="7. Your Rights">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Access:</strong> you can view all your data in your profile</li>
              <li><strong>Correction:</strong> edit your profile at any time</li>
              <li><strong>Deletion:</strong> delete your account in Settings — content is soft-deleted immediately and fully removed after 90 days</li>
              <li><strong>Export:</strong> contact us to request a data export</li>
            </ul>
          </Section>

          <Section title="8. Cookies">
            <p>We use session cookies only — to keep you signed in. We use no third-party advertising cookies and no tracking cookies.</p>
          </Section>

          <Section title="9. Children">
            <p>Parish App is not intended for children under 13. We do not knowingly collect data from children. If you believe a child under 13 has created an account, contact us and we will delete it.</p>
          </Section>

          <Section title="10. Changes">
            <p>We will notify you of material changes to this policy by email and in-app notification.</p>
          </Section>

          <Section title="11. Contact">
            <p>Questions about your privacy? Contact us at <span className="text-navy font-medium">hello@parishapp.com</span></p>
            <p className="text-gray-400 mt-1">Parish App · Massachusetts</p>
          </Section>
        </div>
      </div>
    </div>
  )
}
