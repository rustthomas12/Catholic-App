import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import { EventCard } from '../parish/ParishEvents'

// Upcoming events from the parishes you follow, your groups and your
// organizations — the Home feed's "Events" filter.
export default function MyEvents() {
  const { user } = useAuth()
  const userId = user?.id
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      const [pf, pa, gm, om] = await Promise.all([
        supabase.from('parish_follows').select('parish_id').eq('user_id', userId),
        supabase.from('parish_admins').select('parish_id').eq('user_id', userId),
        supabase.from('group_members').select('group_id').eq('user_id', userId),
        supabase.from('organization_members').select('org_id').eq('user_id', userId),
      ])
      const parishIds = [...new Set([...(pf.data ?? []), ...(pa.data ?? [])].map(r => r.parish_id))]
      const groupIds = (gm.data ?? []).map(r => r.group_id)
      const orgIds = (om.data ?? []).map(r => r.org_id)

      const parts = []
      if (parishIds.length) parts.push(`parish_id.in.(${parishIds.join(',')})`)
      if (groupIds.length) parts.push(`group_id.in.(${groupIds.join(',')})`)
      if (orgIds.length) parts.push(`org_id.in.(${orgIds.join(',')})`)
      if (!parts.length) { if (!cancelled) setEvents([]); return }

      const { data, error: err } = await supabase
        .from('events')
        .select(`id, title, description, start_time, end_time, location, rsvp_count, image_url,
          parish:parishes!parish_id(id, name), group:groups!group_id(id, name), org:organizations!org_id(id, name)`)
        .or(parts.join(','))
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(30)
      if (cancelled) return
      if (err) setError(true)
      else setEvents(data ?? [])
    })()
    return () => { cancelled = true }
  }, [userId])

  if (error) {
    return <p className="text-gray-500 text-sm text-center py-8">Could not load events.</p>
  }

  if (!events) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {[1, 2].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />)}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <CalendarDaysIcon className="w-12 h-12 text-gray-200 mb-3" />
        <p className="font-semibold text-navy mb-1">No upcoming events</p>
        <p className="text-gray-500 text-sm mb-4">Events from your parishes, groups and organizations show up here.</p>
        <Link to="/directory" className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] inline-flex items-center">
          Find a parish
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 pt-2 pb-8 space-y-3">
      {events.map(e => (
        <EventCard key={e.id} event={e} source={sourceOf(e)} />
      ))}
    </div>
  )
}

function sourceOf(e) {
  if (e.group) return { label: e.group.name, to: `/group/${e.group.id}` }
  if (e.org) return { label: e.org.name, to: `/organization/${e.org.id}` }
  if (e.parish) return { label: e.parish.name, to: `/parish/${e.parish.id}` }
  return null
}
