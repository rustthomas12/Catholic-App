import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/shared/LoadingSpinner'

// /highlight/:id: where a community_highlight notification lands (migration
// 104). The id is the post when the highlight is about one post, otherwise
// the parish; open whichever it is.
export default function HighlightRedirect() {
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    supabase.from('posts').select('id').eq('id', id).maybeSingle().then(({ data }) => {
      if (!cancelled) navigate(data ? `/post/${id}` : `/parish/${id}`, { replace: true })
    })
    return () => { cancelled = true }
  }, [id, navigate])

  return <LoadingSpinner fullPage />
}
