import { memo, useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  PaperAirplaneIcon,
  TrashIcon,
  FlagIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth.jsx'
import { usePost } from '../../hooks/usePost'
import Avatar from '../shared/Avatar'
import Modal from '../shared/Modal'
import LoadingSpinner from '../shared/LoadingSpinner'
import { CommentSkeleton } from '../shared/skeletons'
import { formatRelativeTime } from '../../utils/dates'
import { toast } from '../shared/Toast'

// ── Report modal ───────────────────────────────────────────
const REPORT_REASONS = ['spam', 'hateful', 'misinformation', 'violates_values', 'other']

function ReportModal({ isOpen, onClose, onSubmit }) {
  const { t } = useTranslation('feed')
  const [reason, setReason] = useState('spam')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    const { error } = await onSubmit(reason, notes)
    setLoading(false)
    if (!error) {
      toast.success(t('report.success'))
      onClose()
    } else {
      toast.error(error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('report.title')}>
      <div className="space-y-3">
        {REPORT_REASONS.map((r) => (
          <label key={r} className="flex items-center gap-3 cursor-pointer min-h-[44px]">
            <input
              type="radio"
              name="reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="accent-gold w-4 h-4 flex-shrink-0"
            />
            <span className="text-sm text-navy">{t(`report.${r}`)}</span>
          </label>
        ))}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('report.notes_placeholder')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy resize-none h-20 focus:outline-none focus:ring-2 focus:ring-gold"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-navy text-white rounded-lg py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <LoadingSpinner size="sm" color="white" /> : null}
          {t('report.submit')}
        </button>
      </div>
    </Modal>
  )
}

// ── Delete confirm modal ───────────────────────────────────
function DeleteModal({ isOpen, onClose, onConfirm, loading }) {
  const { t } = useTranslation(['feed', 'common'])
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('feed:post.confirm_delete')}>
      <p className="text-sm text-gray-500 mb-4">{t('feed:post.confirm_delete_body')}</p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 border border-gray-200 text-navy rounded-lg py-2.5 text-sm font-medium min-h-[44px]"
        >
          {t('common:actions.cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <LoadingSpinner size="sm" color="white" /> : null}
          {t('common:actions.delete')}
        </button>
      </div>
    </Modal>
  )
}

// ── Fullscreen image modal ─────────────────────────────────
function ImageModal({ src, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2">
        <XMarkIcon className="w-6 h-6" />
      </button>
      <img src={src} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}

// ── Comment item ───────────────────────────────────────────
function CommentItem({ comment, currentUserId, onDelete }) {
  const { t } = useTranslation('feed')
  const [showDelete, setShowDelete] = useState(false)
  const isOwn = comment.author?.id === currentUserId

  if (comment.is_removed) {
    return (
      <div className="py-2">
        <p className="text-xs text-gray-400 italic">{t('comment.removed')}</p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 py-2 group">
      <Link to={`/profile/${comment.author?.id}`} onClick={(e) => e.stopPropagation()}>
        <Avatar
          src={comment.author?.avatar_url}
          name={comment.author?.full_name}
          size="xs"
          isVerifiedClergy={comment.author?.is_verified_clergy}
        />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <Link
            to={`/profile/${comment.author?.id}`}
            className="text-xs font-semibold text-navy hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {comment.author?.full_name || 'Parish Member'}
          </Link>
          <span className="text-xs text-gray-400">{formatRelativeTime(comment.created_at)}</span>
        </div>
        <p className="text-sm text-gray-800 leading-relaxed break-words">{comment.content}</p>
      </div>
      {isOwn && (
        <button
          onClick={() => {
            if (showDelete) {
              onDelete(comment.id)
            } else {
              setShowDelete(true)
              setTimeout(() => setShowDelete(false), 3000)
            }
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title={t('comment.delete')}
        >
          <TrashIcon className={`w-4 h-4 ${showDelete ? 'text-red-500' : 'text-gray-400'}`} />
        </button>
      )}
    </div>
  )
}

// ── Main PostCard ──────────────────────────────────────────
const PostCard = memo(function PostCard({ post: initialPost, onDelete, showSource = true }) {
  const { t } = useTranslation(['feed', 'common'])
  const { user } = useAuth()
  const navigate = useNavigate()

  const {
    post,
    comments,
    commentsLoading,
    commentsExpanded,
    toggleLike,
    toggleComments,
    addComment,
    deleteComment,
    deletePost,
    reportPost,
  } = usePost(initialPost.id, initialPost)

  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [commentSending, setCommentSending] = useState(false)
  const [likeAnimating, setLikeAnimating] = useState(false)
  const commentInputRef = useRef(null)
  const menuRef = useRef(null)

  const isOwnPost = user?.id === post.author?.id
  const TRUNCATE_LIMIT = 500

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  async function handleLike() {
    setLikeAnimating(true)
    setTimeout(() => setLikeAnimating(false), 300)
    const { error } = await toggleLike()
    if (error) toast.error(t('common:status.error'))
  }

  async function handleShare() {
    const url = `${window.location.origin}/post/${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Parish App', url })
      } catch (_) { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied')
      } catch (_) {
        toast.error(t('common:status.error'))
      }
    }
  }

  async function handleSendComment() {
    if (!commentInput.trim()) return
    setCommentSending(true)
    const { error } = await addComment(commentInput)
    setCommentSending(false)
    if (error) {
      toast.error(t('common:status.error'))
    } else {
      setCommentInput('')
    }
  }

  async function handleDeletePost() {
    setDeleteLoading(true)
    const { error } = await deletePost()
    setDeleteLoading(false)
    if (error) {
      toast.error(t('common:status.error'))
    } else {
      setShowDeleteModal(false)
      toast.success(t('post.deleted'))
      onDelete?.(post.id)
    }
  }

  const displayContent = expanded || post.content.length <= TRUNCATE_LIMIT
    ? post.content
    : post.content.slice(0, TRUNCATE_LIMIT).trimEnd()

  return (
    <>
      <article
        className={[
          'bg-white border-b border-gray-100 md:rounded-xl md:border md:shadow-sm md:mb-2',
          post.is_prayer_request ? 'border-l-4 border-l-gold' : '',
        ].join(' ')}
      >
        <div className="px-4 py-3">
          {/* Prayer request badge */}
          {post.is_prayer_request && (
            <p className="text-xs font-semibold text-gold mb-2">🙏 Prayer Request</p>
          )}

          {/* Header */}
          <div className="flex items-start gap-3 mb-2">
            <button
              onClick={() => navigate(`/profile/${post.author?.id}`)}
              className="flex-shrink-0"
              aria-label={`View ${post.author?.full_name}'s profile`}
            >
              <Avatar
                src={post.author?.avatar_url}
                name={post.author?.full_name}
                size="md"
                isVerifiedClergy={post.author?.is_verified_clergy}
                isPremium={post.author?.is_premium}
                isPatron={post.author?.is_patron}
              />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => navigate(`/profile/${post.author?.id}`)}
                  className="text-sm font-semibold text-navy hover:underline"
                >
                  {post.author?.full_name || 'Parish Member'}
                </button>
              </div>

              {showSource && (post.parish || post.group) && (
                <p className="text-xs text-gray-500 leading-tight">
                  {post.parish && (
                    <Link
                      to={`/parish/${post.parish.id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      at {post.parish.name}
                    </Link>
                  )}
                  {post.group && (
                    <Link
                      to={`/group/${post.group.id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      in {post.group.name}
                    </Link>
                  )}
                </p>
              )}

              <p className="text-xs text-gray-400">{formatRelativeTime(post.created_at)}</p>
            </div>

            {/* Three-dot menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-navy rounded-lg hover:bg-lightbg transition-colors"
                aria-label="Post options"
              >
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-10 z-10 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px]">
                  {isOwnPost ? (
                    <>
                      <button
                        onClick={() => { setMenuOpen(false); toast.info(t('post.edit_coming_soon')) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-navy hover:bg-lightbg min-h-[44px]"
                      >
                        ✏️ {t('post.edit')}
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); setShowDeleteModal(true) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 min-h-[44px]"
                      >
                        <TrashIcon className="w-4 h-4" />
                        {t('post.delete')}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setMenuOpen(false); setShowReportModal(true) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-navy hover:bg-lightbg min-h-[44px]"
                    >
                      <FlagIcon className="w-4 h-4" />
                      {t('post.report')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="mb-2">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
              {displayContent}
              {!expanded && post.content.length > TRUNCATE_LIMIT && '...'}
            </p>
            {post.content.length > TRUNCATE_LIMIT && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-sm text-gold font-medium mt-1 min-h-[44px] inline-flex items-center"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Post image */}
          {post.image_url && (
            <button
              onClick={() => setShowImageModal(true)}
              className="w-full mb-2 rounded-lg overflow-hidden block"
              aria-label="View full image"
            >
              <img
                src={post.image_url}
                alt=""
                loading="lazy"
                className="w-full max-h-96 object-cover bg-gray-100"
              />
            </button>
          )}

          {/* Action row */}
          <div className="flex items-center border-t border-gray-100 pt-2 mt-1 -mx-1">
            {/* Like */}
            <button
              onClick={handleLike}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg hover:bg-lightbg transition-colors group"
              aria-label={post.is_liked_by_me ? 'Unlike' : 'Like'}
            >
              {post.is_liked_by_me ? (
                <HeartIconSolid
                  className={`w-5 h-5 text-gold transition-transform ${likeAnimating ? 'scale-125' : 'scale-100'}`}
                />
              ) : (
                <HeartIcon className="w-5 h-5 text-gray-400 group-hover:text-gold transition-colors" />
              )}
              <span className={`text-xs font-medium ${post.is_liked_by_me ? 'text-gold' : 'text-gray-500'}`}>
                {post.like_count > 0
                  ? t('like.count_other', { count: post.like_count })
                  : t('like.like')}
              </span>
            </button>

            {/* Comment */}
            <button
              onClick={toggleComments}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg hover:bg-lightbg transition-colors group"
              aria-label="Comments"
            >
              <ChatBubbleLeftIcon className="w-5 h-5 text-gray-400 group-hover:text-navy transition-colors" />
              <span className="text-xs font-medium text-gray-500">
                {post.comment_count > 0
                  ? t('comment.count_other', { count: post.comment_count })
                  : 'Comment'}
              </span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg hover:bg-lightbg transition-colors group"
              aria-label="Share"
            >
              <ShareIcon className="w-5 h-5 text-gray-400 group-hover:text-navy transition-colors" />
              <span className="text-xs font-medium text-gray-500">{t('common:actions.share')}</span>
            </button>
          </div>
        </div>

        {/* Comments section */}
        {commentsExpanded && (
          <div className="px-4 pb-3 border-t border-gray-100">
            {commentsLoading ? (
              <div className="pt-2">
                <CommentSkeleton />
                <CommentSkeleton />
              </div>
            ) : (
              <div className="pt-2">
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    currentUserId={user?.id}
                    onDelete={deleteComment}
                  />
                ))}
              </div>
            )}

            {/* Comment input */}
            <div className="flex items-center gap-2 border-t border-gray-100 pt-3 mt-2">
              <Avatar
                src={null}
                name={user?.user_metadata?.full_name || 'Me'}
                size="xs"
              />
              <div className="flex-1 flex items-center bg-gray-100 rounded-full px-3 gap-2">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value.slice(0, 500))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() } }}
                  placeholder={t('comment.placeholder')}
                  className="flex-1 bg-transparent py-2 text-sm text-navy outline-none min-h-[36px]"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentInput.trim() || commentSending}
                  className="p-1 disabled:opacity-40 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label={t('comment.submit')}
                >
                  {commentSending ? (
                    <LoadingSpinner size="sm" color="navy" />
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5 text-gold" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </article>

      {/* Modals */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeletePost}
        loading={deleteLoading}
      />
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={reportPost}
      />
      {showImageModal && post.image_url && (
        <ImageModal src={post.image_url} onClose={() => setShowImageModal(false)} />
      )}
    </>
  )
})

export default PostCard
