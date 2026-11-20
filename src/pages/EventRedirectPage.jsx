import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'

// /event/:id — events live on their parish, group or organization page.
// Notification taps (event reminders) land here and are forwarded to the
// right page with its Events tab open.
export default function EventRedirectPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    supabase.from('events').select('parish_id, group_id, org_id').eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (!data) { setMissing(true); return }
        const to = data.group_id ? `/group/${data.group_id}`
          : data.org_id ? `/organization/${data.org_id}`
          : data.parish_id ? `/parish/${data.parish_id}` : null
        if (!to) { setMissing(true); return }
        navigate(`${to}?tab=events`, { replace: true })
      })
  }, [id, navigate])

  if (!missing) return null
  return (
    <div className="min-h-screen bg-cream md:pl-60 flex flex-col items-center justify-center gap-3 px-4">
      <h1 className="text-lg font-bold text-navy">{t('common:eventredirect.this_event_isn_t_available', "This event isn't available")}</h1>
      <p className="text-sm text-gray-600 text-center">{t('common:eventredirect.it_may_have_been_cancelled_or', 'It may have been cancelled or deleted.')}</p>
      <Link to="/" className="text-sm font-semibold text-navy underline">{t('common:eventredirect.go_to_your_feed', 'Go to your feed')}</Link>
    </div>
  )
}
