import { useEffect } from 'react'

export default function PremiumPage() {
  useEffect(() => { document.title = 'Support the Mission | Communio' }, [])

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-gold">
              <path d="M10.5 3h3v6h6.5v3H13.5v9h-3V12H3.5V9h7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">Support the Mission</h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            Communio is free for every Catholic. If it has blessed your faith life,
            consider supporting the mission with a one-time gift.
          </p>
        </div>

        {/* CTA */}
        <div className="flex justify-center mb-8">
          <a
            href="#"
            className="inline-block bg-gold text-navy font-bold px-8 py-4 rounded-2xl text-base hover:bg-gold/90 transition-colors"
          >
            Make a Gift →
          </a>
        </div>

        {/* Scripture */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-400 italic leading-relaxed">
            "Each of you should give what you have decided in your heart to give, not reluctantly
            or under compulsion, for God loves a cheerful giver."
          </p>
          <p className="text-xs text-gray-300 mt-1">— 2 Corinthians 9:7</p>
        </div>

      </div>
    </div>
  )
}
