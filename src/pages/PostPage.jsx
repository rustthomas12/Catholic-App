import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import { POST_SELECT, normalisePost } from '../hooks/useFeed'
import PostCard from '../components/feed/PostCard'
import { PostCardSkeleton } from '../components/shared/skeletons'

// Single post — the target of shared post links (/post/:id)
export default function PostPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | missing

  useEffect(() => { document.title = 'Post | Communio' }, [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', id)
      .is('deleted_at', null)
      .eq('is_removed', false)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) {
          setPost(normalisePost(data, user?.id))
          setStatus('ready')
        } else {
          setStatus('missing')
        }
      })
    return () => { cancelled = true }
  }, [id, user?.id])

  function goBack() {
    // Opened straight from a shared link there's no in-app history
    if (window.history.length > 1) navigate(-1)
    else navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto pb-24">
        <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100">
          <button
            onClick={goBack}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-lightbg"
            aria-label="Back"
          >
            <ArrowLeftIcon className="w-5 h-5 text-navy" />
          </button>
          <h1 className="text-lg font-bold text-navy">Post</h1>
        </div>

        <div className="pt-3">
          {status === 'loading' && <PostCardSkeleton />}
          {status === 'ready' && (
            <PostCard post={post} onDelete={() => navigate('/', { replace: true })} />
          )}
          {status === 'missing' && (
            <div className="mx-4 mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-navy font-semibold mb-1">This post isn't available</p>
              <p className="text-sm text-gray-500 mb-4">
                It may have been deleted, or it was shared in a group you're not part of.
              </p>
              <Link to="/" className="text-sm font-semibold text-navy underline">Go to your feed</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
