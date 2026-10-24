import { useDialog } from '../../hooks/useDialog'
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
  MegaphoneIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth.jsx'
import { usePost } from '../../hooks/usePost'
import { useBlockedUsers } from '../../hooks/useBlockedUsers'
import Avatar from '../shared/Avatar'
import Modal from '../shared/Modal'
import ReportModal from '../shared/ReportModal'
import { reportContent } from '../../lib/reports'
import LoadingSpinner from '../shared/LoadingSpinner'
import { CommentSkeleton } from '../shared/skeletons'
import { formatRelativeTime } from '../../utils/dates'
import { toast } from '../shared/Toast'
import { publicOrigin } from '../../lib/platform'

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

// ── Block user modal ───────────────────────────────────────
function BlockModal({ isOpen, onClose, onConfirm, loading, name }) {
  const { t } = useTranslation(['feed', 'common'])
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('feed:post.block_title', { name })}>
      <p className="text-sm text-gray-500 mb-4">{t('feed:post.block_body')}</p>
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
          {t('feed:post.block_confirm')}
        </button>
      </div>
    </Modal>
  )
}

// ── Fullscreen image modal ─────────────────────────────────
function ImageModal({ src, onClose }) {
  // Escape closes, focus stays inside and returns afterwards, no page scroll
  const ref = useDialog(true, onClose)
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Photo"
      className="fixed inset-0 z-50 bg-black flex items-center justify-center outline-none" onClick={onClose}>
      <button aria-label="Close" onClick={onClose}
        className="absolute right-2 w-11 h-11 flex items-center justify-center text-white rounded-full hover:bg-white/10"
        style={{ top: 'calc(var(--app-safe-top, 0px) + 8px)' }}>
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
  const [showReport, setShowReport] = useState(false)
  const isOwn = comment.author?.id === currentUserId

  if (comment.is_removed) {
    return (
      <div className="py-2">
        <p className="text-xs text-gray-500 italic">{t('comment.removed')}</p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 py-2 group">
      <Link to={`/profile/${comment.author?.id}`} onClick={(e) => e.stopPropagation()}
        aria-label={`View ${comment.author?.full_name || 'this member'}'s profile`}>
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
          <span className="text-xs text-gray-500">{formatRelativeTime(comment.created_at)}</span>
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
          className="md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title={t('comment.delete')}
          aria-label={showDelete ? `${t('comment.delete')} — tap again to confirm` : t('comment.delete')}
        >
          <TrashIcon className={`w-4 h-4 ${showDelete ? 'text-red-500' : 'text-gray-500'}`} />
        </button>
      )}
      {!isOwn && currentUserId && (
        <>
          <button
            onClick={() => setShowReport(true)}
            className="md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-navy"
            aria-label={t('report.title_comment')}
          >
            <FlagIcon className="w-4 h-4" />
          </button>
          <ReportModal
            isOpen={showReport}
            onClose={() => setShowReport(false)}
            title={t('report.title_comment')}
            onSubmit={(reason, notes) => reportContent('comment', comment.id, reason, notes)}
          />
        </>
      )}
    </div>
  )
}

// ── Main PostCard ──────────────────────────────────────────
const PostCard = memo(function PostCard({ post: initialPost, onDelete, showSource = true }) {
  const { t } = useTranslation(['feed', 'common'])
  const { user, profile } = useAuth()
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
    editPost,
    reportPost,
  } = usePost(initialPost.id, initialPost)

  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuSheet, setMenuSheet] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [commentSending, setCommentSending] = useState(false)
  const [likeAnimating, setLikeAnimating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const commentInputRef = useRef(null)
  const menuRef = useRef(null)

  const isOwnPost = user?.id === post.author?.id
  const { isBlocked, block } = useBlockedUsers()
  const TRUNCATE_LIMIT = 500

  // Parse optional title from first line (announcements only)
  const announcementTitle = post.is_announcement && post.content.includes('\n\n')
    ? post.content.split('\n\n')[0]
    : null
  const announcementBody = announcementTitle
    ? post.content.slice(announcementTitle.length + 2)
    : post.content

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
    const url = `${publicOrigin()}/post/${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'inFold', url })
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
    const { error, userFacing } = await addComment(commentInput)
    setCommentSending(false)
    if (error) {
      toast.error(userFacing ? error : t('common:status.error'))
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

  async function handleSaveEdit() {
    setEditSaving(true)
    const { error } = await editPost(editDraft)
    setEditSaving(false)
    if (error) {
      toast.error(t('common:status.error'))
    } else {
      setEditing(false)
      toast.success(t('post.edited'))
    }
  }

  async function handleBlockAuthor() {
    setBlockLoading(true)
    const { error } = await block(post.author?.id)
    setBlockLoading(false)
    if (error) {
      toast.error(t('common:status.error'))
    } else {
      setShowBlockModal(false)
      toast.success(t('post.blocked', { name: post.author?.full_name || 'Parish Member' }))
    }
  }

  // Hidden immediately once the author is blocked (the database stops
  // returning their posts on the next fetch)
  if (!isOwnPost && isBlocked(post.author?.id)) return null

  const bodyText = announcementTitle ? announcementBody : post.content
  const displayContent = expanded || bodyText.length <= TRUNCATE_LIMIT
    ? bodyText
    : bodyText.slice(0, TRUNCATE_LIMIT).trimEnd()

  return (
    <>
      <article
        className={[
          'bg-white border-b border-gray-100 md:rounded-xl md:border md:shadow-sm md:mb-2 overflow-hidden',
          post.is_prayer_request ? 'border-l-4 border-l-gold' : '',
          post.is_announcement ? 'border-l-4 border-l-navy' : '',
        ].join(' ')}
      >
        {/* Announcement banner */}
        {post.is_announcement && (
          <div className="bg-navy px-4 py-2 flex items-center gap-2">
            <MegaphoneIcon className="w-4 h-4 text-gold flex-shrink-0" />
            <span className="text-xs font-bold text-white uppercase tracking-wide">Parish Announcement</span>
            {post.parish?.name && (
              <span className="text-xs text-white/60 ml-auto">{post.parish.name}</span>
            )}
          </div>
        )}
        <div className="px-4 py-3">
          {/* Prayer request badge */}
          {post.is_prayer_request && (
            <p className="text-xs font-semibold text-gold mb-2">{t('post.prayer_badge')}</p>
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
              />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => navigate(`/profile/${post.author?.id}`)}
                  className="text-sm font-semibold text-navy hover:underline inline-flex items-center min-h-[24px]"
                >
                  {post.author?.full_name || 'Parish Member'}
                </button>
                {post.author?.username && (
                  <span className="text-xs text-gray-500">@{post.author.username}</span>
                )}
              </div>

              {showSource && (post.parish || post.group || post.org) && (
                <p className="text-xs text-gray-500 leading-tight">
                  {post.parish && (
                    <Link
                      to={`/parish/${post.parish.id}`}
                      className="hover:underline inline-flex items-center min-h-[24px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('post.at_place', { name: post.parish.name })}
                    </Link>
                  )}
                  {post.group && (
                    <Link
                      to={`/group/${post.group.id}`}
                      className="hover:underline inline-flex items-center min-h-[24px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('post.in_place', { name: post.group.name })}
                    </Link>
                  )}
                  {post.org && (
                    <Link
                      to={`/organizations/${post.org.id}`}
                      className="hover:underline inline-flex items-center min-h-[24px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('post.from_place', { name: post.org.name })}
                    </Link>
                  )}
                </p>
              )}
              {/* National org inherited post badge */}
              {post.org?.org_type === 'national' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5 mt-0.5">
                  National Org
                </span>
              )}

              <p className="text-xs text-gray-500">{formatRelativeTime(post.created_at)}</p>
            </div>

            {/* Three-dot menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => {
                  // Phones get a bottom sheet (big rows, thumb reach); desktop a dropdown
                  setMenuSheet(window.matchMedia('(max-width: 767px)').matches)
                  setMenuOpen((o) => !o)
                }}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-navy rounded-lg hover:bg-lightbg transition-colors"
                aria-label="Post options"
              >
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>

              {menuOpen && !menuSheet && (
                <div className="absolute right-0 top-10 z-10 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px]">
                  {isOwnPost ? (
                    <>
                      <button
                        onClick={() => { setMenuOpen(false); setEditDraft(post.content); setEditing(true) }}
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
                    <>
                      <button
                        onClick={() => { setMenuOpen(false); setShowReportModal(true) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-navy hover:bg-lightbg min-h-[44px]"
                      >
                        <FlagIcon className="w-4 h-4" />
                        {t('post.report')}
                      </button>
                      {post.author?.id && (
                        <button
                          onClick={() => { setMenuOpen(false); setShowBlockModal(true) }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 min-h-[44px]"
                        >
                          <NoSymbolIcon className="w-4 h-4" />
                          {t('post.block')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              {menuSheet && (
                <Modal isOpen={menuOpen} onClose={() => setMenuOpen(false)} title={t('post.options', 'Post options')}>
                  <div className="-mx-4 -my-2 [&>button]:min-h-[52px] [&>button]:text-base [&>button]:gap-3">
                  {isOwnPost ? (
                    <>
                      <button
                        onClick={() => { setMenuOpen(false); setEditDraft(post.content); setEditing(true) }}
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
                    <>
                      <button
                        onClick={() => { setMenuOpen(false); setShowReportModal(true) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-navy hover:bg-lightbg min-h-[44px]"
                      >
                        <FlagIcon className="w-4 h-4" />
                        {t('post.report')}
                      </button>
                      {post.author?.id && (
                        <button
                          onClick={() => { setMenuOpen(false); setShowBlockModal(true) }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 min-h-[44px]"
                        >
                          <NoSymbolIcon className="w-4 h-4" />
                          {t('post.block')}
                        </button>
                      )}
                    </>
                  )}
                </div>
                </Modal>
              )}
            </div>
          </div>

          {/* Content */}
          {editing ? (
            <div className="mb-2">
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value.slice(0, 500))}
                rows={4}
                autoFocus
                aria-label={t('post.edit')}
                className="w-full text-sm text-gray-800 leading-relaxed border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-navy resize-y"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">{editDraft.length}/500</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    disabled={editSaving}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-navy min-h-[40px]"
                  >
                    {t('common:actions.cancel')}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSaving || !editDraft.trim() || editDraft.trim() === post.content}
                    className="px-4 py-2 text-sm font-semibold bg-navy text-white rounded-lg disabled:opacity-40 min-h-[40px]"
                  >
                    {t('common:actions.save')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
          <div className="mb-2">
            {announcementTitle && (
              <p className="text-base font-bold text-navy mb-1">{announcementTitle}</p>
            )}
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
              {displayContent}
              {!expanded && bodyText.length > TRUNCATE_LIMIT && '...'}
            </p>
            {bodyText.length > TRUNCATE_LIMIT && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-sm text-gold font-medium mt-1 min-h-[44px] inline-flex items-center"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
          )}

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
              aria-label={post.is_prayer_request
                ? (post.is_liked_by_me ? t('prayer.praying') : t('prayer.pray'))
                : (post.is_liked_by_me ? 'Unlike' : 'Like')}
            >
              {post.is_liked_by_me ? (
                <HeartIconSolid
                  className={`w-5 h-5 text-gold transition-transform ${likeAnimating ? 'scale-125' : 'scale-100'}`}
                />
              ) : (
                <HeartIcon className="w-5 h-5 text-gray-500 group-hover:text-gold transition-colors" />
              )}
              <span className={`text-xs font-medium ${post.is_liked_by_me ? 'text-gold' : 'text-gray-500'}`}>
                {post.is_prayer_request
                  ? (post.like_count > 0
                      ? t('prayer.count', { count: post.like_count })
                      : t('prayer.pray'))
                  : (post.like_count > 0
                      ? t('like.count', { count: post.like_count })
                      : t('like.like'))}
              </span>
            </button>

            {/* Comment */}
            <button
              onClick={toggleComments}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg hover:bg-lightbg transition-colors group"
              aria-label="Comments"
            >
              <ChatBubbleLeftIcon className="w-5 h-5 text-gray-500 group-hover:text-navy transition-colors" />
              <span className="text-xs font-medium text-gray-500">
                {post.comment_count > 0
                  ? t('comment.count', { count: post.comment_count })
                  : t('comment.action')}
              </span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg hover:bg-lightbg transition-colors group"
              aria-label="Share"
            >
              <ShareIcon className="w-5 h-5 text-gray-500 group-hover:text-navy transition-colors" />
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
                {comments.filter((c) => !isBlocked(c.author?.id)).map((c) => (
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
                src={profile?.avatar_url || null}
                name={profile?.full_name || user?.user_metadata?.full_name || 'Me'}
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
      <BlockModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirm={handleBlockAuthor}
        loading={blockLoading}
        name={post.author?.full_name || 'Parish Member'}
      />
      {showImageModal && post.image_url && (
        <ImageModal src={post.image_url} onClose={() => setShowImageModal(false)} />
      )}
    </>
  )
})

export default PostCard
