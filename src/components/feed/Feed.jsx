import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BuildingLibraryIcon, ArrowUpIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useFeed } from '../../hooks/useFeed'
import PostCard from './PostCard'
import CreatePost from './CreatePost'
import MyEvents from './MyEvents'
import { PostCardSkeleton } from '../shared/skeletons'

/**
 * Feed — reusable feed component.
 *
 * Props:
 *   filter: 'all'|'parish'|'groups'|'prayer'|'events'
 *   parishId, groupId, userId — scope overrides
 *   showCreatePost: bool (default true)
 *   emptyMessage, emptySubtext, emptyAction: { label, onClick }
 */
export default function Feed({
  filter = 'all',
  parishId = null,
  groupId = null,
  orgId = null,
  userId = null,
  showCreatePost = true,
  showFindParish = true,
  emptyMessage,
  emptySubtext,
  emptyAction = null,
}) {
  const { t } = useTranslation('feed')
  const navigate = useNavigate()

  const feed = useFeed({ filter, parishId, groupId, orgId, userId, pageSize: 20 })

  const sentinelRef = useRef(null)

  const handleDelete = useCallback((id) => feed.removePost(id), [feed.removePost])

  // Infinite scroll via IntersectionObserver
  // Use stable primitive deps so the observer isn't torn down on every render
  const loadMore = feed.loadMore
  const hasMore = feed.hasMore
  const loadingMore = feed.loadingMore
  const feedLoading = feed.loading
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !feedLoading) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore, hasMore, loadingMore, feedLoading])

  // Your own new post goes on top
  function handleNewPost(post) {
    feed.addPost(post)
  }

  // Posts from others arrive live. At the top of the page they slide straight
  // in; further down a pill offers them, so the page never jumps under you.
  const incomingCount = feed.incoming.length
  const showIncoming = feed.showIncoming
  useEffect(() => {
    if (incomingCount > 0 && window.scrollY < 120) showIncoming()
  }, [incomingCount, showIncoming])

  function revealNewPosts() {
    showIncoming()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // The "Events" filter lists events, not posts
  if (filter === 'events') return <MyEvents />

  // ── Loading state ────────────────────────────────────────
  if (feed.loading) {
    return (
      <div>
        {showCreatePost && <div className="pointer-events-none opacity-50"><div className="bg-white border-b border-gray-100 md:rounded-xl md:border md:shadow-sm md:mb-2 px-4 py-3 h-16" /></div>}
        <PostCardSkeleton />
        <PostCardSkeleton showImage />
        <PostCardSkeleton />
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────
  if (feed.error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
          <span className="text-red-500 text-xl">!</span>
        </div>
        <p className="text-navy font-semibold mb-1">{t('common:status.error', { ns: 'common' })}</p>
        <p className="text-gray-500 text-sm mb-4">{feed.error}</p>
        <button
          onClick={feed.refresh}
          className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]"
        >
          {t('common:actions.retry', { ns: 'common' })}
        </button>
      </div>
    )
  }

  return (
    <div className="relative">

      {/* New posts pill */}
      {incomingCount > 0 && (
        <div className="sticky z-30 h-0 flex justify-center" style={{ top: 'calc(var(--app-safe-top, 0px) + 12px)' }}>
          <button
            onClick={revealNewPosts}
            className="flex items-center gap-1.5 bg-navy text-white text-sm font-semibold px-4 min-h-[40px] rounded-full shadow-lg animate-fade-in"
          >
            <ArrowUpIcon className="w-4 h-4" />
            {t('feed.new_posts', { count: incomingCount })}
          </button>
        </div>
      )}

      {/* Compose bar */}
      {showCreatePost && <CreatePost onPost={handleNewPost} groupId={groupId} parishId={parishId} orgId={orgId} />}

      {/* Empty state */}
      {feed.posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <BuildingLibraryIcon className="w-12 h-12 text-gray-200 mb-3" />
          <p className="font-semibold text-navy mb-1">
            {emptyMessage ?? t('feed.empty_title')}
          </p>
          <p className="text-gray-500 text-sm mb-4">
            {emptySubtext ?? t('feed.empty_body')}
          </p>
          {emptyAction && (
            <button
              onClick={emptyAction.onClick}
              className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px]"
            >
              {emptyAction.label}
            </button>
          )}
          {showFindParish && !emptyAction && !parishId && !groupId && !orgId && !userId && (
            <button
              onClick={() => navigate('/directory')}
              className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px]"
            >
              {t('feed.find_parish')}
            </button>
          )}
        </div>
      )}

      {/* Posts list */}
      {feed.posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onDelete={handleDelete}
          showSource
        />
      ))}

      {/* Load-more skeleton */}
      {feed.loadingMore && <PostCardSkeleton />}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-1" />

      {/* Caught-up message */}
      {!feed.hasMore && feed.posts.length > 0 && (
        <div className="flex flex-col items-center py-10 px-4 text-center">
          <svg viewBox="0 0 40 56" className="w-8 h-10 fill-gray-200 mb-3">
            <path d="M17 0h6v16h16v6H23v34h-6V22H0v-6h17z" />
          </svg>
          <p className="text-sm font-semibold text-gray-500">{t('feed.caught_up')}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t('feed.caught_up_sub')}</p>
        </div>
      )}
    </div>
  )
}
