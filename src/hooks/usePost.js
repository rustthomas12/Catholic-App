import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'
import { createNotification } from '../lib/notifications'

const COMMENT_SELECT = `
  *,
  author:profiles!author_id(
    id, full_name, avatar_url, is_verified_clergy
  )
`

/**
 * usePost — powers individual post actions (like, comment, delete, report).
 *
 * @param {string} postId
 * @param {object} initialPost  — normalised post object from useFeed
 */
export function usePost(postId, initialPost) {
  const { user, profile } = useAuth()

  const [post, setPost] = useState(initialPost)
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsExpanded, setCommentsExpanded] = useState(false)

  const commentsFetchedRef = useRef(false)
  const commentChannelRef = useRef(null)

  // Keep local post in sync if the parent feed updates the prop
  useEffect(() => {
    setPost(initialPost)
  }, [initialPost])

  // ── Clean up comment subscription on unmount ───────────────
  useEffect(() => {
    return () => {
      if (commentChannelRef.current) {
        supabase.removeChannel(commentChannelRef.current)
        commentChannelRef.current = null
      }
    }
  }, [])

  // ── Fetch comments ─────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    setCommentsLoading(true)
    const { data, error } = await supabase
      .from('comments')
      .select(COMMENT_SELECT)
      .eq('post_id', postId)
      .eq('is_removed', false)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setComments(data)
      commentsFetchedRef.current = true
    }
    setCommentsLoading(false)
  }, [postId])

  // ── Subscribe to real-time comments ───────────────────────
  const subscribeToComments = useCallback(() => {
    if (commentChannelRef.current) return // already subscribed

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        async (payload) => {
          const { data } = await supabase
            .from('comments')
            .select(COMMENT_SELECT)
            .eq('id', payload.new.id)
            .single()

          if (!data) return

          setComments((prev) => {
            if (prev.some((c) => c.id === data.id)) return prev
            return [...prev, data]
          })
        }
      )
      .subscribe()

    commentChannelRef.current = channel
  }, [postId])

  // ── toggleComments ─────────────────────────────────────────
  const toggleComments = useCallback(async () => {
    const expanding = !commentsExpanded
    setCommentsExpanded(expanding)

    if (expanding && !commentsFetchedRef.current) {
      await fetchComments()
      subscribeToComments()
    } else if (expanding) {
      subscribeToComments()
    }
  }, [commentsExpanded, fetchComments, subscribeToComments])

  // ── toggleLike ─────────────────────────────────────────────
  const toggleLike = useCallback(async () => {
    if (!user) return
    if (profile?.suspended_at) return

    const wasLiked = post.is_liked_by_me
    const newCount = wasLiked ? post.like_count - 1 : post.like_count + 1

    // Optimistic update
    setPost((p) => ({
      ...p,
      is_liked_by_me: !wasLiked,
      like_count: newCount,
    }))

    let supabaseError = null

    if (wasLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
      supabaseError = error
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: user.id })
      supabaseError = error
    }

    if (supabaseError) {
      // Revert on failure
      setPost((p) => ({
        ...p,
        is_liked_by_me: wasLiked,
        like_count: post.like_count,
      }))
      return { error: supabaseError.message }
    }

    // Fire-and-forget: keep denormalised like_count in sync
    supabase
      .from('posts')
      .update({ like_count: newCount })
      .eq('id', postId)
      .then(() => {})

    // Notify post author (not self)
    if (!wasLiked && post.author?.id && post.author.id !== user.id) {
      const actorName = user.user_metadata?.full_name || 'Someone'
      createNotification({
        userId: post.author.id,
        type: 'like',
        referenceId: postId,
        message: `${actorName} liked your post`,
        actorId: user.id,
      })
    }

    return { error: null }
  }, [user, post, postId])

  // ── addComment ─────────────────────────────────────────────
  const addComment = useCallback(
    async (content) => {
      if (!user) return { error: 'Not authenticated' }
      if (profile?.suspended_at) return { error: 'Your account is under review. Contact us if you have questions.' }
      const trimmed = content?.trim()
      if (!trimmed) return { error: 'Comment cannot be empty' }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: trimmed,
        })
        .select(COMMENT_SELECT)
        .single()

      if (error) return { error: error.message }

      setComments((prev) => [...prev, data])
      setPost((p) => ({ ...p, comment_count: p.comment_count + 1 }))

      // Keep denormalised comment_count in sync
      supabase
        .from('posts')
        .update({ comment_count: post.comment_count + 1 })
        .eq('id', postId)
        .then(() => {})

      // Update last_active_at
      supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {})

      // Notify post author (not self)
      if (post.author?.id && post.author.id !== user.id) {
        const actorName = user.user_metadata?.full_name || 'Someone'
        const preview = trimmed.slice(0, 50)
        createNotification({
          userId: post.author.id,
          type: 'comment',
          referenceId: postId,
          message: `${actorName} commented on your post: ${preview}`,
          actorId: user.id,
        })
      }

      return { error: null }
    },
    [user, postId, post]
  )

  // ── deleteComment ──────────────────────────────────────────
  const deleteComment = useCallback(
    async (commentId) => {
      if (!user) return { error: 'Not authenticated' }

      const { error } = await supabase
        .from('comments')
        .update({ is_removed: true })
        .eq('id', commentId)
        .eq('author_id', user.id) // security: own only

      if (error) return { error: error.message }

      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setPost((p) => ({ ...p, comment_count: Math.max(0, p.comment_count - 1) }))

      supabase
        .from('posts')
        .update({ comment_count: Math.max(0, post.comment_count - 1) })
        .eq('id', postId)
        .then(() => {})

      return { error: null }
    },
    [user, postId, post]
  )

  // ── deletePost ─────────────────────────────────────────────
  const deletePost = useCallback(async () => {
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id) // security: own only

    if (error) return { error: error.message }
    return { error: null }
  }, [user, postId])

  // ── reportPost ─────────────────────────────────────────────
  const reportPost = useCallback(
    async (reason, notes) => {
      if (!user) return { error: 'Not authenticated' }

      const { error } = await supabase.from('post_flags').insert({
        post_id: postId,
        user_id: user.id,
        reason,
        notes: notes || null,
      }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })

      if (error) return { error: error.message }

      // Fire-and-forget: notify all platform admins
      ;(async () => {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_admin', true)
          .neq('id', user.id)
        if (admins?.length) {
          await supabase.from('notifications').insert(
            admins.map(a => ({
              user_id: a.id,
              type: 'post_flagged',
              reference_id: postId,
              message: `A post was reported: ${reason}`,
              actor_id: user.id,
              is_read: false,
            }))
          )
        }
      })()

      return { error: null }
    },
    [user, postId]
  )

  return {
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
  }
}
