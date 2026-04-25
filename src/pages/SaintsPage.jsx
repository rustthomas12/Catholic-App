import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, XMarkIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth.jsx'
import { useSaintLibrary, useTodaySaint, useSaintFavorites } from '../hooks/useSaints'
import SaintCard from '../components/faith/SaintCard'

const MONTHS = [
  { value: null, label: 'All' },
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'May' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
]

export default function SaintsPage() {
  document.title = 'Saints | Communio'

  const { t } = useTranslation('faith')
  const navigate = useNavigate()
  const { isPremium } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeMonth, setActiveMonth] = useState(null)

  const filter = activeMonth ? { month: activeMonth } : null

  const { saints, loading, error } = useSaintLibrary(searchQuery, filter)
  const { saint: todaySaint, loading: todaySaintLoading } = useTodaySaint()
  const { favorites, isFavorite, addFavorite, removeFavorite } = useSaintFavorites()

  function handleFavoriteToggle(saint) {
    if (isFavorite(saint.id)) removeFavorite(saint.id)
    else addFavorite(saint.id)
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto pb-20">

        {/* ── Header ── */}
        <div className="bg-navy px-4 pt-5 pb-5">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="text-white/70 hover:text-white p-1 flex items-center transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-white font-bold text-xl">{t('saints_title')}</h1>
          </div>
          <p className="text-gray-300 text-sm ml-8">
            Learn about the men and women who showed us how to live the faith
          </p>

          {/* Search */}
          <div className="relative mt-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('saints_search')}
              className="w-full bg-white pl-9 pr-9 py-2.5 rounded-xl text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pt-4 space-y-6">

          {/* ── Today's saint ── */}
          {!searchQuery && !activeMonth && (
            <section>
              <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">
                {t('saints_today')}
              </p>
              {todaySaintLoading ? (
                <div className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
              ) : todaySaint ? (
                <div className="border-l-4 border-gold rounded-xl overflow-hidden">
                  <SaintCard
                    saint={todaySaint}
                    variant="library"
                    isPremium={isPremium}
                    isFavorite={isFavorite(todaySaint.id)}
                    onFavoriteToggle={() => handleFavoriteToggle(todaySaint)}
                  />
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No feast day today.</p>
              )}
            </section>
          )}

          {/* ── Month filter ── */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {MONTHS.map(({ value, label }) => (
              <button
                key={label}
                onClick={() => setActiveMonth(value)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  activeMonth === value
                    ? 'bg-gold text-navy'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-navy'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── My favorites (premium) ── */}
          {isPremium && !searchQuery && favorites.length > 0 && (
            <section>
              <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">
                {t('saints_favorites')}
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {favorites.map((saint) => (
                  <div key={saint.id} className="flex-shrink-0 w-44">
                    <SaintCard
                      saint={saint}
                      variant="library"
                      isPremium={isPremium}
                      isFavorite
                      onFavoriteToggle={() => handleFavoriteToggle(saint)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Saints grid ── */}
          <section>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-100 h-28 animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm">Could not load saints. Please try again.</p>
              </div>
            ) : saints.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                <p className="font-semibold text-navy text-sm">{t('saints_no_results')}</p>
                <p className="text-gray-400 text-xs mt-1">Try a different name or clear your filter.</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-sm text-navy font-semibold hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {saints.map((saint) => (
                  <SaintCard
                    key={saint.id}
                    saint={saint}
                    variant="library"
                    isPremium={isPremium}
                    isFavorite={isFavorite(saint.id)}
                    onFavoriteToggle={() => handleFavoriteToggle(saint)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Premium upsell ── */}
          {!isPremium && (
            <div className="bg-white rounded-2xl border border-gold/30 shadow-sm p-5 text-center">
              <p className="font-bold text-navy text-sm mb-1">Unlock the full Saint Library</p>
              <p className="text-gray-500 text-xs leading-relaxed mb-4">
                Get complete biographies, patron causes, prayers, and save your favorite saints
                — all with Premium.
              </p>
              <Link
                to="/premium"
                className="inline-block bg-gold text-navy text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gold/90 transition-colors"
              >
                Upgrade to Premium
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
