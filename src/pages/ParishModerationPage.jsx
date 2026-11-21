import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { FlagQueue, ModeratorsPanel } from '../components/parish/ParishModeration'

// /parish/:id/moderation: the parish's report queue for its moderators
// (verified admins/staff and appointed moderators, migration 099).
// Opened from parish_post_flagged notifications.
export default function ParishModerationPage() {
  const { id } = useParams()
  const { t } = useTranslation('parish')
  const { user } = useAuth()
  const [state, setState] = useState(null) // null = loading | { allowed, isAdmin, name }

  useEffect(() => { document.title = 'Moderation | inFold' }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      supabase.rpc('can_moderate_parish', { p_parish_id: id }),
      supabase.from('parishes').select('name').eq('id', id).maybeSingle(),
      supabase.from('parish_admins').select('role').eq('parish_id', id).eq('user_id', user.id).maybeSingle(),
    ]).then(([{ data: allowed }, { data: parish }, { data: admin }]) => {
      if (cancelled) return
      setState({ allowed: !!allowed, isAdmin: admin?.role === 'admin', name: parish?.name })
    })
    return () => { cancelled = true }
  }, [id, user])

  if (!state) return <LoadingSpinner fullPage />

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="bg-navy px-4 pt-5 pb-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to={`/parish/${id}`} aria-label={t('moderation.back', 'Back to the parish')} className="text-white/70 hover:text-white">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-gold text-xs font-bold tracking-widest uppercase">{t('moderation.title', 'Moderation')}</p>
            <h1 className="text-white text-xl font-bold">{state.name || t('moderation.parish', 'Parish')}</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-8">
        {!state.allowed ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-4">
            {t('moderation.not_allowed', "Only this parish's moderators can see this page.")}
          </p>
        ) : (
          <>
            <FlagQueue parishId={id} />
            {state.isAdmin && <ModeratorsPanel parishId={id} />}
          </>
        )}
      </div>
    </div>
  )
}
