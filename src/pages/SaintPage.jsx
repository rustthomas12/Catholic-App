import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeftIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { StarIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { useSaint, useSaintFavorites } from '../hooks/useSaints'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'

function formatFeastDay(feastDay) {
  if (!feastDay) return null
  try {
    const [month, day] = feastDay.split('-')
    const d = new Date(2000, parseInt(month, 10) - 1, parseInt(day, 10))
    return format(d, 'MMMM d')
  } catch {
    return feastDay
  }
}

function getSaintMonthPrefix(feastDay) {
  return feastDay ? feastDay.slice(0, 2) : null
}

function getSaintMonthName(feastDay) {
  if (!feastDay) return null
  try {
    const month = parseInt(feastDay.slice(0, 2), 10)
    return format(new Date(2000, month - 1, 1), 'MMMM')
  } catch {
    return null
  }
}

export default function SaintPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation('faith')
  const { saint, loading, error } = useSaint(id)
  const { isFavorite, addFavorite, removeFavorite } = useSaintFavorites()

  const [relatedSaints, setRelatedSaints] = useState([])

  // Set document title when saint loads
  if (saint) document.title = `${saint.name} | Communio`
  else document.title = 'Saint | Communio'

  // Fetch related saints in same month
  useEffect(() => {
    if (!saint?.feast_day) return
    const monthPrefix = getSaintMonthPrefix(saint.feast_day)
    if (!monthPrefix) return

    supabase
      .from('saints')
      .select('id, name, feast_day, summary')
      .like('feast_day', `${monthPrefix}-%`)
      .neq('id', id)
      .limit(4)
      .then(({ data }) => setRelatedSaints(data ?? []))
  }, [saint, id])

  const handleFavoriteToggle = () => {
    if (!saint) return
    if (isFavorite(saint.id)) removeFavorite(saint.id)
    else addFavorite(saint.id)
  }

  const handleShare = async () => {
    const url = window.location.href
    const text = saint ? `Learn about ${saint.name} on Communio` : 'Communio'
    if (navigator.share) {
      try {
        await navigator.share({ title: saint?.name ?? 'Saint', text, url })
      } catch {
        // Cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
      } catch {
        toast.error('Could not copy link')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white md:pl-60">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-20 animate-pulse">
          {/* Nav */}
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-24 bg-gray-200 rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded" />
              <div className="h-8 w-8 bg-gray-200 rounded" />
            </div>
          </div>
          {/* Placeholder */}
          <div className="w-full h-40 bg-gray-200 rounded-xl mb-6" />
          <div className="h-7 w-48 bg-gray-200 rounded mx-auto mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded mx-auto mb-6" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 bg-gray-100 rounded w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !saint) {
    return (
      <div className="min-h-screen bg-white md:pl-60 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="font-bold text-navy mb-2">Saint not found</p>
          <button
            onClick={() => navigate('/saints')}
            className="text-gold text-sm font-semibold hover:underline"
          >
            ← Back to Saints
          </button>
        </div>
      </div>
    )
  }

  const feastFormatted = formatFeastDay(saint.feast_day)
  const monthName = getSaintMonthName(saint.feast_day)
  const favorited = isFavorite(saint.id)
  const hasYears = saint.birth_year || saint.death_year
  const yearsLabel = hasYears
    ? [
        saint.birth_year ? `c. ${saint.birth_year}` : null,
        saint.death_year ? saint.death_year : null,
      ]
        .filter(Boolean)
        .join(' – ')
    : null

  return (
    <div className="min-h-screen bg-white md:pl-60">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-20">

        {/* ── Top nav ── */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-gray-500 hover:text-navy text-sm transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Saints
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-navy transition-colors"
              aria-label="Share"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleFavoriteToggle}
              className="p-2"
              aria-label={favorited ? t('saint_favorite_remove') : t('saint_favorite_add')}
            >
              {favorited
                ? <StarSolid className="w-5 h-5 text-gold" />
                : <StarIcon className="w-5 h-5 text-gray-300 hover:text-gold transition-colors" />
              }
            </button>
          </div>
        </div>

        {/* ── Saint header ── */}
        {saint.image_url ? (
          <img
            src={saint.image_url}
            alt={saint.name}
            className="w-full max-h-52 object-cover rounded-xl mb-5"
          />
        ) : (
          <div className="w-full h-32 bg-navy rounded-xl flex items-center justify-center mb-5">
            <svg width="28" height="34" viewBox="0 0 28 34" fill="none" aria-hidden="true">
              <path d="M11.5 0h5v10h11.5v5H16.5v19h-5V15H0v-5h11.5z" fill="#C9A84C" />
            </svg>
          </div>
        )}

        <h1 className="text-2xl font-bold text-navy text-center leading-snug">{saint.name}</h1>
        {feastFormatted && (
          <p className="text-sm text-gray-400 text-center mt-1">{feastFormatted}</p>
        )}
        {yearsLabel && (
          <p className="text-xs text-gray-400 text-center mt-0.5">c. {yearsLabel}</p>
        )}

        {/* ── Patron causes ── */}
        {saint.patron_of?.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold text-gold uppercase tracking-widest mb-2 text-center">
              {t('saints_patron_of')}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {saint.patron_of.map((p) => (
                <span
                  key={p}
                  className="text-xs border border-gold text-gold rounded-full px-2.5 py-1"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Short description ── */}
        {saint.summary && (
          <>
            <p className="text-base text-gray-700 leading-relaxed italic text-center mt-5 px-2">
              {saint.summary}
            </p>
            <div className="h-px bg-gray-100 mt-5" />
          </>
        )}

        {/* ── Biography ── */}
        <div className="mt-6">
          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-4">
            {t('saints_biography')}
          </p>

          {saint.biography ? (
            <div className="space-y-4">
              {saint.biography.split('\n\n').filter(Boolean).map((para, i) => (
                <p key={i} className="text-sm text-gray-700 leading-relaxed">{para}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">{t('saints_no_biography')}</p>
          )}
        </div>

        {/* ── Prayer ── */}
        {saint.prayer && (
          <div className="mt-8">
            <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">
              {t('saints_prayer', { name: saint.name })}
            </p>
            <div className="border-l-2 border-gold pl-4">
              <p className="text-sm text-gray-700 italic leading-relaxed whitespace-pre-line">
                {saint.prayer}
              </p>
              <div className="flex justify-end mt-3">
                <svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">
                  <path d="M6.5 0h3v5.5h6.5v3H9.5v11.5h-3V8.5H0v-3h6.5z" fill="#C9A84C" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ── Related saints ── */}
        {relatedSaints.length > 0 && monthName && (
          <div className="mt-10">
            <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">
              {t('saints_related', { month: monthName })}
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {relatedSaints.map((related) => (
                <Link
                  key={related.id}
                  to={`/saints/${related.id}`}
                  className="flex-shrink-0 w-40 bg-white rounded-xl border border-gray-100 shadow-sm p-3 hover:shadow-md transition-shadow"
                >
                  <p className="text-xs font-semibold text-navy leading-snug">{related.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatFeastDay(related.feast_day)}</p>
                  {related.summary && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{related.summary}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
