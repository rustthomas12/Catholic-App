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

export default function PolicyPage() {
  document.title = 'Content Policy | Parish App'
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-navy text-sm font-medium mb-6 min-h-[44px]">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h1 className="text-2xl font-bold text-navy mb-1">Content Policy</h1>
          <p className="text-xs text-gray-400 mb-6">Last updated: April 4, 2026</p>

          <Section title="Our Mission">
            <p>Parish App exists to be the digital parish hall — a warm, safe, faith-filled space for Catholics to connect with their community between Sundays. Our content policy exists to protect that mission.</p>
          </Section>

          <Section title="The Standard We Hold Ourselves To">
            <p>We apply the standard of the Catechism of the Catholic Church on matters of defined Catholic doctrine, while welcoming authentic discussion of matters of legitimate theological debate. We are a Catholic community, not a political one.</p>
          </Section>

          <Section title="What Is Welcome">
            <ul className="list-disc pl-5 space-y-1">
              <li>Sharing reflections on Scripture or the liturgy</li>
              <li>Parish announcements and community updates</li>
              <li>Prayer requests and thanksgiving</li>
              <li>Questions about the Catholic faith</li>
              <li>Discussion of Catholic theology and tradition (charitable and respectful)</li>
              <li>Sharing news from Catholic media sources</li>
              <li>Celebrating sacraments and milestones</li>
              <li>Organizing community events and service</li>
            </ul>
          </Section>

          <Section title="What Is Not Permitted">
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-navy">Political content</p>
                <p>Posts supporting or opposing political candidates, parties, or elections are not permitted. Discussing Catholic social teaching and its application to public life is welcome — campaigning is not.</p>
              </div>
              <div>
                <p className="font-semibold text-navy">Content contradicting Catholic teaching</p>
                <p>Content that contradicts defined Catholic doctrine will be removed. Authentic questions and respectful theological discussion are always welcome.</p>
              </div>
              <div>
                <p className="font-semibold text-navy">Personal attacks</p>
                <p>Attacks on individuals — whether fellow members, clergy, or public figures — are not permitted. Disagree with ideas, never with persons.</p>
              </div>
              <div>
                <p className="font-semibold text-navy">Spam and self-promotion</p>
                <p>Unsolicited commercial promotion is not permitted. Sharing genuinely useful Catholic resources is welcome.</p>
              </div>
              <div>
                <p className="font-semibold text-navy">Adult content</p>
                <p>No adult content of any kind. This is a family platform.</p>
              </div>
              <div>
                <p className="font-semibold text-navy">Hateful content</p>
                <p>Content that demeans any person based on race, ethnicity, gender, or any other characteristic is not permitted and contradicts Catholic teaching on human dignity.</p>
              </div>
            </div>
          </Section>

          <Section title="How Moderation Works">
            <p>Posts reported by members are reviewed by our team. Posts that violate this policy are removed. Repeated violations result in account suspension. We aim to moderate firmly but charitably.</p>
          </Section>

          <Section title="How to Report Content">
            <p>Tap the three-dot menu on any post and select "Report this post." Our team reviews all reports, typically within 24 hours.</p>
          </Section>

          <Section title="Appeals">
            <p>If your post was removed and you believe it was a mistake, contact us at <span className="text-navy font-medium">hello@parishapp.com</span>. We will review and respond within 48 hours.</p>
          </Section>

          <Section title="A Note on Tone">
            <div className="bg-cream rounded-xl p-4 border-l-4 border-gold">
              <p>We ask all members to engage online as they would in their parish hall — with charity, respect, and the knowledge that every person here is a fellow Catholic seeking to live their faith.</p>
              <p className="mt-2 italic text-gray-500">"Let your speech always be gracious, seasoned with salt." — Colossians 4:6</p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
