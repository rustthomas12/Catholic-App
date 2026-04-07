import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BuildingLibraryIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useFeed } from '../../hooks/useFeed'
import PostCard from './PostCard'
import CreatePost from './CreatePost'
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
  userId = null,
  showCreatePost = true,
  emptyMessage,
  emptySubtext,
  emptyAction = null,
}) {
  const { t } = useTranslation('feed')
  const navigate = useNavigate()

  const feed = useFeed({ filter, parishId, groupId, userId, pageSize: 20 })

  const sentinelRef = useRef(null)
  const [newPostPending, setNewPostPending] = useState(false)
  const isAtTopRef = useRef(true)

  const handleDelete = useCallback((id) => feed.removePost(id), [feed.removePost])

  // Track scroll position to know if user is at top
  useEffect(() => {
    function handleScroll() {
      isAtTopRef.current = window.scrollY < 100
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  // When a new real-time post arrives while user has scrolled down,
  // show a floating "new post" pill instead of silently prepending
  function handleNewPost(post) {
    if (!isAtTopRef.current) {
      setNewPostPending(true)
    }
    feed.addPost(post)
  }

  function scrollToTopAndClear() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setNewPostPending(false)
  }

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
      {/* New post floating pill */}
      {newPostPending && (
        <div className="sticky top-2 z-10 flex justify-center mb-2 pointer-events-none">
          <button
            onClick={scrollToTopAndClear}
            className="pointer-events-auto bg-gold text-navy text-sm font-bold px-4 py-2 rounded-full shadow-lg"
          >
            {t('feed.new_post_available')}
          </button>
        </div>
      )}

      {/* Compose bar */}
      {showCreatePost && <CreatePost onPost={handleNewPost} groupId={groupId} parishId={parishId} />}

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
          {!emptyAction && (
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
          <p className="text-sm font-semibold text-gray-400">{t('feed.caught_up')}</p>
          <p className="text-xs text-gray-300 mt-0.5">{t('feed.caught_up_sub')}</p>
        </div>
      )}
    </div>
  )
}
