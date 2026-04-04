import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-bold text-navy mb-2">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  document.title = 'Terms of Service | Parish App'
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-navy text-sm font-medium mb-6 min-h-[44px]">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h1 className="text-2xl font-bold text-navy mb-1">Terms of Service</h1>
          <p className="text-xs text-gray-400 mb-6">Last updated: April 4, 2026</p>

          <Section title="1. Acceptance of Terms">
            <p>By creating an account, you agree to these Terms of Service. If you do not agree, please do not use Parish App.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>Parish App is a social platform for Catholic communities. We connect Catholics with their parish, groups, and daily faith life. Our mission is to be the digital parish hall — a warm, safe, faith-filled space between Sundays.</p>
          </Section>

          <Section title="3. Your Account">
            <p>You are responsible for maintaining the security of your account and password. You must be 13 years of age or older to use this service. Only one account per person is permitted. Keep your password confidential and notify us immediately of any unauthorized use.</p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>By using Parish App, you agree NOT to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Post content that contradicts defined Catholic teaching</li>
              <li>Engage in personal attacks or harassment of any kind</li>
              <li>Post political campaign or election content</li>
              <li>Spam or promote commercial services without permission</li>
              <li>Share adult content of any kind</li>
              <li>Impersonate other people, priests, or clergy</li>
              <li>Use the service to harm others</li>
            </ul>
          </Section>

          <Section title="5. Content You Post">
            <p>You own your content. By posting, you grant us a non-exclusive license to display it on the platform. We may remove content that violates these terms. We do not claim ownership of your posts, photos, or other materials you submit.</p>
          </Section>

          <Section title="6. Premium Subscriptions">
            <p>Premium subscriptions are billed monthly or annually via Stripe. You may cancel at any time — access continues until the end of your current billing period. We do not offer refunds for partial periods. We may change pricing with 30 days notice.</p>
          </Section>

          <Section title="7. Termination">
            <p>We may suspend or terminate accounts that violate these terms. You may delete your account at any time in the Settings page. Upon account deletion, your content is soft-deleted and fully removed after 90 days.</p>
          </Section>

          <Section title="8. Disclaimers">
            <p>Parish App is provided "as is" without warranties of any kind. We are not responsible for user-generated content. Parish App is not a replacement for pastoral guidance, the sacraments, or your relationship with your parish priest.</p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>To the maximum extent permitted by law, Parish App and its founders shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability for any claim shall not exceed the amount you paid us in the past 12 months.</p>
          </Section>

          <Section title="10. Changes to Terms">
            <p>We will notify users of material changes to these terms by email and in-app notification. Continued use of Parish App after changes constitutes acceptance of the updated terms.</p>
          </Section>

          <Section title="11. Contact">
            <p>Questions about these terms? Contact us at <span className="text-navy font-medium">hello@parishapp.com</span></p>
            <p className="mt-1 text-gray-400">Parish App · Massachusetts</p>
          </Section>
        </div>
      </div>
    </div>
  )
}
