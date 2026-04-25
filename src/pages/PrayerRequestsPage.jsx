import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import Avatar from '../components/shared/Avatar'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { formatRelativeTime } from '../utils/dates'
import { toast } from '../components/shared/Toast'

const PAGE_SIZE = 30

export default function PrayerRequestsPage() {
  const { t } = useTranslation('feed')
  const { user } = useAuth()
  const navigate = useNavigate()

  document.title = `${t('prayer.title')} | Communio`

  const channelSuffix = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`)

  const [intentions, setIntentions] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const MAX_CHARS = 280

  const fetchIntentions = useCallback(async (off = 0, append = false) => {
    if (off === 0) setLoading(true)
    else setLoadingMore(true)

    const { data, error } = await supabase
      .from('prayer_requests')
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url),
        prayer_responses(user_id)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(off, off + PAGE_SIZE - 1)

    if (error) {
      toast.error(t('common:status.error', { ns: 'common' }))
    } else {
      const normalised = (data ?? []).map((r) => ({
        ...r,
        prayer_count: r.prayer_responses?.length ?? r.prayer_count ?? 0,
        is_prayed_by_me: (r.prayer_responses ?? []).some((pr) => pr.user_id === user?.id),
      }))
      setIntentions((prev) => (append ? [...prev, ...normalised] : normalised))
      setHasMore((data ?? []).length === PAGE_SIZE)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [user, t])

  useEffect(() => {
    fetchIntentions(0, false)
  }, [fetchIntentions])

  useEffect(() => {
    const channel = supabase
      .channel(`prayer-requests-realtime-${channelSuffix.current}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'prayer_requests' },
        async (payload) => {
          const { data } = await supabase
            .from('prayer_requests')
            .select(`*, author:profiles!author_id(id, full_name, avatar_url), prayer_responses(user_id)`)
            .eq('id', payload.new.id)
            .single()
          if (!data) return
          const normalised = { ...data, prayer_count: 0, is_prayed_by_me: false }
          setIntentions((prev) => {
            if (prev.some((i) => i.id === normalised.id)) return prev
            return [normalised, ...prev]
          })
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed) return
    setSubmitting(true)

    const { data, error } = await supabase
      .from('prayer_requests')
      .insert({ author_id: user.id, content: trimmed, is_anonymous: isAnonymous })
      .select(`*, author:profiles!author_id(id, full_name, avatar_url), prayer_responses(user_id)`)
      .single()

    setSubmitting(false)

    if (error) {
      toast.error(t('common:status.error', { ns: 'common' }))
      return
    }

    setIntentions((prev) => [{ ...data, prayer_count: 0, is_prayed_by_me: false }, ...prev])
    setContent('')
    toast.success(t('prayer.success'))
  }

  async function handlePray(intentionId) {
    const intention = intentions.find((i) => i.id === intentionId)
    if (!intention || intention.is_prayed_by_me) return

    setIntentions((prev) =>
      prev.map((i) =>
        i.id === intentionId
          ? { ...i, prayer_count: i.prayer_count + 1, is_prayed_by_me: true }
          : i
      )
    )

    const { error } = await supabase
      .from('prayer_responses')
      .insert({ prayer_request_id: intentionId, user_id: user.id })

    if (error) {
      setIntentions((prev) =>
        prev.map((i) =>
          i.id === intentionId
            ? { ...i, prayer_count: i.prayer_count - 1, is_prayed_by_me: false }
            : i
        )
      )
      toast.error(t('common:status.error', { ns: 'common' }))
    }
  }

  function handleLoadMore() {
    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    fetchIntentions(newOffset, true)
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto pb-24">

        {/* Header */}
        <div className="bg-navy px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={() => navigate(-1)}
            className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">{t('prayer.title')}</h1>
            <p className="text-white/60 text-xs">{t('prayer.subtitle')}</p>
          </div>
        </div>

        {/* Compose */}
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <p className="text-sm font-semibold text-navy mb-3">Share an intention with your community</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder={t('prayer.placeholder')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-navy resize-none h-20 focus:outline-none focus:ring-2 focus:ring-gold placeholder-gray-400"
          />
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
              <button
                onClick={() => setIsAnonymous((a) => !a)}
                className={`relative w-10 h-5 rounded-full transition-colors ${isAnonymous ? 'bg-navy' : 'bg-gray-300'}`}
                role="switch"
                aria-checked={isAnonymous}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isAnonymous ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-xs text-gray-600">{t('prayer.anonymous_toggle')}</span>
            </label>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${content.length >= MAX_CHARS - 30 ? 'text-amber-500' : 'text-gray-400'}`}>
                {content.length}/{MAX_CHARS}
              </span>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="bg-gold text-navy text-sm font-bold px-4 py-2 rounded-lg min-h-[36px] disabled:opacity-40 flex items-center gap-1.5"
              >
                {submitting && <LoadingSpinner size="sm" color="navy" />}
                {t('prayer.submit')}
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : intentions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-4xl mb-3">🙏</p>
            <p className="font-semibold text-navy mb-1">No intentions yet</p>
            <p className="text-gray-500 text-sm">{t('prayer.empty')}</p>
          </div>
        ) : (
          <div>
            {intentions.map((intention) => (
              <PrayerCard
                key={intention.id}
                intention={intention}
                onPray={handlePray}
                t={t}
              />
            ))}
            {hasMore && (
              <div className="flex justify-center py-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-white border border-gray-200 text-navy text-sm font-medium px-6 py-2.5 rounded-lg min-h-[44px] hover:border-navy transition-colors flex items-center gap-2"
                >
                  {loadingMore && <LoadingSpinner size="sm" color="navy" />}
                  {t('feed.load_more')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PrayerCard({ intention, onPray, t }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {intention.is_anonymous ? (
            <>
              <UserCircleIcon className="w-8 h-8 text-gray-300" />
              <span className="text-sm text-gray-500 italic">{t('prayer.anonymous')}</span>
            </>
          ) : (
            <>
              <Avatar src={intention.author?.avatar_url} name={intention.author?.full_name} size="sm" />
              <span className="text-sm font-semibold text-navy">{intention.author?.full_name}</span>
            </>
          )}
        </div>
        <span className="text-xs text-gray-400">{formatRelativeTime(intention.created_at)}</span>
      </div>

      <p className="text-sm text-gray-800 leading-relaxed my-2">{intention.content}</p>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
        <span className="text-xs text-gray-500">
          🙏 {t('prayer.count_other', { count: intention.prayer_count })}
        </span>
        {intention.is_prayed_by_me ? (
          <span className="text-xs font-semibold text-gold flex items-center gap-1">
            ✓ {t('prayer.praying')}
          </span>
        ) : (
          <button
            onClick={() => onPray(intention.id)}
            className="text-xs font-semibold text-navy border border-navy rounded-lg px-3 py-1.5 min-h-[36px] hover:bg-lightbg transition-colors"
          >
            {t('prayer.pray')}
          </button>
        )}
      </div>
    </div>
  )
}
