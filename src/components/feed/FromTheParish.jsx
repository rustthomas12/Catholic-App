import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MegaphoneIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import { POST_SELECT, onlyMyLike, normalisePost } from '../../hooks/useFeed'
import PostCard from './PostCard'

/**
 * "From the parish": the parish's announcements and featured posts the viewer
 * hasn't seen yet, pinned above the community feed (spec step 4, migration
 * 101). parishId = one parish (parish page); null = home + followed parishes
 * (Home feed). A card counts as seen once it's been on screen a moment (see
 * PostCard / lib/postSeen); it stays for this visit and is gone next time.
 * The same posts also stay in the timeline below. Not ranked: newest first.
 */
export default function FromTheParish({ parishId = null }) {
  const { t } = useTranslation('feed')
  const { user } = useAuth()
  const [posts, setPosts] = useState([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase.rpc('parish_strip_post_ids', { p_parish_id: parishId })
      .then(({ data: ids, error }) => {
        if (error || !ids?.length) return { data: [] , ids: [] }
        return onlyMyLike(supabase.from('posts').select(POST_SELECT).in('id', ids), user.id)
          .then(({ data }) => ({ data: data ?? [], ids }))
      })
      .then(({ data, ids }) => {
        if (cancelled) return
        const order = new Map(ids.map((id, i) => [id, i]))
        setPosts(data.map((r) => normalisePost(r, user.id)).sort((a, b) => order.get(a.id) - order.get(b.id)))
      })
    return () => { cancelled = true }
  }, [parishId, user])

  if (!posts.length) return null

  return (
    <section aria-label={t('strip.title', 'From the parish')} className="md:mb-3">
      <h2 className="flex items-center gap-1.5 px-4 md:px-1 pt-3 pb-2 text-xs font-bold text-navy uppercase tracking-wide">
        <MegaphoneIcon className="w-4 h-4 text-gold" />
        {t('strip.title', 'From the parish')}
      </h2>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          showSource
        />
      ))}
      <div className="flex items-center gap-2 px-4 md:px-1 pt-2 pb-1">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('strip.community', 'Community')}</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
    </section>
  )
}
