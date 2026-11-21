import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'
import { getMyMemberships } from '../lib/myMemberships'

// Upcoming events from the parishes you follow or run, your groups and your
// organizations. Shared by the Events filter and the "Coming up" strip.
export function useMyUpcomingEvents({ limit = 30, withinDays = null } = {}) {
  const { user } = useAuth()
  const userId = user?.id
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      let m
      try { m = await getMyMemberships(userId) } catch { if (!cancelled) setError(true); return }
      const parishIds = [...new Set([...m.parishFollows, ...m.parishAdmins.map(r => r.parish_id)])]
      const groupIds = m.groups.map(r => r.group_id)
      const orgIds = m.orgs.map(r => r.org_id)

      const parts = []
      if (parishIds.length) parts.push(`parish_id.in.(${parishIds.join(',')})`)
      if (groupIds.length) parts.push(`group_id.in.(${groupIds.join(',')})`)
      if (orgIds.length) parts.push(`org_id.in.(${orgIds.join(',')})`)
      if (!parts.length) { if (!cancelled) setEvents([]); return }

      let q = supabase
        .from('events')
        .select(`id, title, description, start_time, end_time, location, rsvp_count, image_url,
          parish:parishes!parish_id(id, name), group:groups!group_id(id, name), org:organizations!org_id(id, name)`)
        .or(parts.join(','))
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(limit)
      if (withinDays) q = q.lte('start_time', new Date(Date.now() + withinDays * 864e5).toISOString())
      const { data, error: err } = await q
      if (cancelled) return
      if (err) setError(true)
      else setEvents(data ?? [])
    })()
    return () => { cancelled = true }
  }, [userId, limit, withinDays])

  return { events, error }
}

export function sourceOf(e) {
  if (e.group) return { label: e.group.name, to: `/group/${e.group.id}` }
  if (e.org) return { label: e.org.name, to: `/organization/${e.org.id}` }
  if (e.parish) return { label: e.parish.name, to: `/parish/${e.parish.id}` }
  return null
}
