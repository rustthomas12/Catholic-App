import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  UserCircleIcon,
  ClipboardDocumentCheckIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth.jsx'
import { useReadings } from '../hooks/useReadings'
import { useTodaySaint, useSaintFavorites } from '../hooks/useSaints'
import { supabase } from '../lib/supabase'
import { getDaysAgo, formatConfessionDate, formatRelativeTime } from '../utils/dates'
import { truncate } from '../utils/text'
import ReadingsCard from '../components/faith/ReadingsCard'
import SaintCard from '../components/faith/SaintCard'
import Avatar from '../components/shared/Avatar'

// Module-level caches — shared across mounts/navigations
let _intentionsCache = null   // { data, fetchedAt }
let _confessionCache = null   // { data, userId }
const INTENTIONS_TTL = 5 * 60 * 1000  // 5 minutes

export default function FaithPage() {
  document.title = 'Faith | Parish App'

  const { t } = useTranslation('faith')
  const { user, isPremium } = useAuth()

  const { readings, loading, error, liturgicalInfo, feastInfo, todayFormatted } = useReadings()
  const { saint, loading: saintLoading } = useTodaySaint()
  const { isFavorite, addFavorite, removeFavorite } = useSaintFavorites()

  const cachedIntentions = _intentionsCache && (Date.now() - _intentionsCache.fetchedAt) < INTENTIONS_TTL

  const [intentions, setIntentions] = useState(() => cachedIntentions ? _intentionsCache.data : [])
  const [intentionsLoading, setIntentionsLoading] = useState(() => !cachedIntentions)
  const [lastConfession, setLastConfession] = useState(() =>
    _confessionCache?.userId === user?.id ? _confessionCache.data : null
  )
  const [confessionLoading, setConfessionLoading] = useState(false)

  // Fetch last 5 prayer requests (cached 5 min)
  useEffect(() => {
    if (_intentionsCache && (Date.now() - _intentionsCache.fetchedAt) < INTENTIONS_TTL) {
      setIntentions(_intentionsCache.data)
      setIntentionsLoading(false)
      return
    }

    supabase
      .from('prayer_requests')
      .select(`
        id, content, prayer_count, is_anonymous, created_at,
        author:profiles!author_id(full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        const result = data ?? []
        _intentionsCache = { data: result, fetchedAt: Date.now() }
        setIntentions(result)
        setIntentionsLoading(false)
      })
  }, [])

  // Fetch last confession (premium only, cached per user)
  useEffect(() => {
    if (!user || !isPremium) return

    if (_confessionCache?.userId === user.id) {
      setLastConfession(_confessionCache.data)
      return
    }

    setConfessionLoading(true)
    supabase
      .from('confession_tracker')
      .select('confessed_at')
      .eq('user_id', user.id)
      .order('confessed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        _confessionCache = { data, userId: user.id }
        setLastConfession(data)
        setConfessionLoading(false)
      })
  }, [user?.id, isPremium])

  const handleFavoriteToggle = () => {
    if (!saint) return
    if (isFavorite(saint.id)) removeFavorite(saint.id)
    else addFavorite(saint.id)
  }

  const daysSince = lastConfession
    ? getDaysAgo(lastConfession.confessed_at)
    : null

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">

        {/* ── Page header ── */}
        <div className="flex items-center gap-2 mb-1">
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">
            <path d="M6.5 0h3v5.5h6.5v3H9.5v11.5h-3V8.5H0v-3h6.5z" fill="#C9A84C" />
          </svg>
          <h1 className="text-xl font-bold text-navy">{t('title')}</h1>
        </div>
        <div className="h-px bg-gray-200 mt-3 mb-6" />

        {/* ── Readings ── */}
        <ReadingsCard
          variant="full"
          readings={readings}
          loading={loading}
          error={error}
          liturgicalInfo={liturgicalInfo}
          feastInfo={feastInfo}
          todayFormatted={todayFormatted}
        />

        {/* ── Saint of the Day ── */}
        <div className="mt-10">
          <SaintCard
            saint={saint}
            variant="day"
            isPremium={isPremium}
            isFavorite={isFavorite(saint?.id)}
            onFavoriteToggle={handleFavoriteToggle}
            loading={saintLoading}
          />
        </div>

        {/* ── Prayer Intentions preview ── */}
        <div className="mt-10">
          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-4">
            {t('prayer_title')}
          </p>

          {intentionsLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl h-16 border border-gray-100" />
              ))}
            </div>
          ) : intentions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
              <p className="text-gray-400 text-sm">Be the first to share an intention.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {intentions.map((intention) => (
                <IntentionPreview key={intention.id} intention={intention} />
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col items-center gap-3">
            <Link
              to="/faith/prayer"
              className="text-sm font-semibold text-gold hover:underline"
            >
              {t('prayer_see_all')}
            </Link>
            <Link
              to="/faith/prayer"
              className="w-full bg-white border border-gray-200 text-navy text-sm font-semibold py-3 rounded-xl text-center hover:border-navy transition-colors"
            >
              {t('prayer_share')}
            </Link>
          </div>
        </div>

        {/* ── Confession Tracker CTA ── */}
        <div className="mt-10">
          {isPremium ? (
            <div className="bg-white rounded-2xl border-l-4 border-gold border-t border-b border-r border-gray-100 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <ClipboardDocumentCheckIcon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy text-sm">Confession Tracker</p>
                  {confessionLoading ? (
                    <div className="h-3 w-36 bg-gray-200 rounded animate-pulse mt-1" />
                  ) : daysSince === null ? (
                    <p className="text-xs text-gray-400 mt-0.5">{t('confession_first')}</p>
                  ) : daysSince === 0 ? (
                    <p className="text-xs text-gold font-semibold mt-0.5">You went to Confession today 🙏</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('confession_last', { days: daysSince })}
                    </p>
                  )}
                  <Link
                    to="/premium/confession-tracker"
                    className="inline-block mt-2 text-xs font-semibold text-navy hover:underline"
                  >
                    {t('confession_go')}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gold/30 shadow-sm p-5">
              <div className="flex items-start gap-3 mb-3">
                <LockClosedIcon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-navy text-sm">{t('confession_tracker_cta')}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {t('confession_tracker_body')}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-2">Available with Premium</p>
              <Link
                to="/premium"
                className="text-sm font-semibold text-gold hover:underline"
              >
                {t('confession_tracker_premium_link')}
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Small prayer intention preview card ────────────────────
function IntentionPreview({ intention }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        {intention.is_anonymous ? (
          <UserCircleIcon className="w-7 h-7 text-gray-300" />
        ) : (
          <Avatar
            src={intention.author?.avatar_url}
            name={intention.author?.full_name}
            size="sm"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">
          {intention.is_anonymous ? (
            <span className="italic">Anonymous</span>
          ) : (
            <span className="font-medium text-navy">{intention.author?.full_name}</span>
          )}
        </p>
        <p className="text-sm text-gray-700 leading-snug line-clamp-2">
          {intention.content}
        </p>
      </div>
      <span className="text-xs text-gold font-semibold flex-shrink-0 mt-0.5">
        🙏 {intention.prayer_count ?? 0}
      </span>
    </div>
  )
}
