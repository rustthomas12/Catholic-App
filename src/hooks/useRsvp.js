import { toast } from '../components/shared/Toast'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

export function useRsvp(eventId) {
  const { user } = useAuth()
  const [myRsvp,    setMyRsvp]    = useState(null)   // null | 'yes' | 'maybe' | 'no'
  const [rsvpCount, setRsvpCount] = useState(0)
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    if (!eventId || !user) return

    // Fetch current user's RSVP
    supabase
      .from('event_rsvps')
      .select('response')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setMyRsvp(data?.response ?? null))

    // Fetch current rsvp_count
    supabase
      .from('events')
      .select('rsvp_count')
      .eq('id', eventId)
      .single()
      .then(({ data }) => setRsvpCount(data?.rsvp_count ?? 0))
  }, [eventId, user])

  const respond = useCallback(async (response) => {
    if (!user || !eventId) return
    setLoading(true)

    const prev = myRsvp
    // Optimistic update — toggling the same value deselects
    const next = response === myRsvp ? null : response
    setMyRsvp(next)

    try {
      if (response === myRsvp) {
        // Toggle off — delete the row
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id)
        // Supabase returns errors instead of throwing — make catch() see them
        if (error) throw error
      } else {
        // Upsert RSVP (handles new + change-of-mind)
        const { error } = await supabase
          .from('event_rsvps')
          .upsert(
            { event_id: eventId, user_id: user.id, response },
            { onConflict: 'event_id,user_id' }
          )
        if (error) throw error
      }

      // Refetch count — DB trigger keeps it accurate
      const { data } = await supabase
        .from('events')
        .select('rsvp_count')
        .eq('id', eventId)
        .single()
      setRsvpCount(data?.rsvp_count ?? 0)

    } catch (err) {
      // Revert on error
      setMyRsvp(prev)
      toast.error('Could not save your RSVP. Please try again.')
      console.error('RSVP error:', err)
    } finally {
      setLoading(false)
    }
  }, [eventId, user, myRsvp])

  return { myRsvp, rsvpCount, loading, respond }
}
