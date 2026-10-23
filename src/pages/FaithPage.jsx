import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/shared/TopBar'
import {
  UserCircleIcon,
  ClipboardDocumentCheckIcon,
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
let _confessionCache = null   // { data, userId, fetchedAt }
const INTENTIONS_TTL  = 5 * 60 * 1000  // 5 minutes
const CONFESSION_TTL  = 5 * 60 * 1000  // 5 minutes

export default function FaithPage() {
  useEffect(() => { document.title = 'Faith | inFold' }, [])

  const { t, i18n } = useTranslation('faith')
  const { user } = useAuth()

  const { readings, loading, error, liturgicalInfo, feastInfo, todayFormatted } = useReadings(i18n.language)

  const { saint, loading: saintLoading } = useTodaySaint()
  const { isFavorite, addFavorite, removeFavorite } = useSaintFavorites()

  const cachedIntentions = _intentionsCache && (Date.now() - _intentionsCache.fetchedAt) < INTENTIONS_TTL

  const [intentions, setIntentions] = useState(() => cachedIntentions ? _intentionsCache.data : [])
  const [intentionsLoading, setIntentionsLoading] = useState(() => !cachedIntentions)
  const cachedConfession = _confessionCache?.userId === user?.id &&
    (Date.now() - (_confessionCache?.fetchedAt ?? 0)) < CONFESSION_TTL

  const [lastConfession, setLastConfession] = useState(() =>
    cachedConfession ? _confessionCache.data : null
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
      .from('prayer_request_feed')
      .select('id, content, prayer_count, is_anonymous, created_at, author_name, author_avatar_url')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data, error: err }) => {
        if (!err) {
          // Author is left out of anonymous requests (migration 069)
          const result = (data ?? []).map((r) => ({
            ...r,
            author: r.author_name ? { full_name: r.author_name, avatar_url: r.author_avatar_url } : null,
          }))
          _intentionsCache = { data: result, fetchedAt: Date.now() }
          setIntentions(result)
        }
        setIntentionsLoading(false)
      })
  }, [])

  // Fetch last confession (cached per user)
  useEffect(() => {
    if (!user) return

    if (_confessionCache?.userId === user.id &&
        (Date.now() - (_confessionCache?.fetchedAt ?? 0)) < CONFESSION_TTL) {
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
      .then(({ data, error: err }) => {
        if (!err) {
          _confessionCache = { data, userId: user.id, fetchedAt: Date.now() }
          setLastConfession(data)
        }
        setConfessionLoading(false)
      })
  }, [user?.id])

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
      <TopBar title={t('title')} />
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-24">

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
            isFavorite={saint ? isFavorite(saint.id) : false}
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
              <p className="text-gray-500 text-sm">Be the first to share an intention.</p>
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

        {/* ── Morning Offering, Examination, Private Intentions ── */}
        <div className="mt-6 grid grid-cols-1 gap-3">
          <Link
            to="/faith/morning-offering"
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-gold/15 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">☀️</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy text-sm">Morning Offering</p>
              <p className="text-gray-500 text-xs mt-0.5">Offer your day to God before it begins</p>
            </div>
            <span className="text-gray-500 text-sm">→</span>
          </Link>

          <Link
            to="/faith/examination"
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">📋</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy text-sm">Examination of Conscience</p>
              <p className="text-gray-500 text-xs mt-0.5">Prepare your heart before Confession</p>
            </div>
            <span className="text-gray-500 text-sm">→</span>
          </Link>

          <Link
            to="/faith/intentions"
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">🙏</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy text-sm">Prayer Intentions</p>
              <p className="text-gray-500 text-xs mt-0.5">Your private list of people and intentions</p>
            </div>
            <span className="text-gray-500 text-sm">→</span>
          </Link>
        </div>

        {/* ── Confession Tracker CTA ── */}
        <div className="mt-10">
          <div className="bg-white rounded-2xl border-l-4 border-gold border-t border-b border-r border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy text-sm">Confession Tracker</p>
                {confessionLoading ? (
                  <div className="h-3 w-36 bg-gray-200 rounded animate-pulse mt-1" />
                ) : daysSince === null ? (
                  <p className="text-xs text-gray-500 mt-0.5">{t('confession_first')}</p>
                ) : daysSince === 0 ? (
                  <p className="text-xs text-gold font-semibold mt-0.5">{t('confession_today')}</p>
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
