import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

export function useFormation(programKey) {
  const { user } = useAuth()
  const [completedDays, setCompletedDays] = useState(new Set())
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    if (!user || !programKey) return
    supabase
      .from('formation_progress')
      .select('day_number')
      .eq('user_id', user.id)
      .eq('program', programKey)
      .then(({ data }) => {
        setCompletedDays(new Set(data?.map(d => d.day_number) || []))
        setLoading(false)
      })
  }, [user, programKey])

  const markComplete = useCallback(async (dayNumber) => {
    if (!user) return
    await supabase
      .from('formation_progress')
      .upsert(
        { user_id: user.id, program: programKey, day_number: dayNumber },
        { onConflict: 'user_id,program,day_number' }
      )
    setCompletedDays(prev => new Set([...prev, dayNumber]))
  }, [user, programKey])

  const markIncomplete = useCallback(async (dayNumber) => {
    if (!user) return
    await supabase
      .from('formation_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('program', programKey)
      .eq('day_number', dayNumber)
    setCompletedDays(prev => {
      const next = new Set(prev)
      next.delete(dayNumber)
      return next
    })
  }, [user, programKey])

  return { completedDays, loading, markComplete, markIncomplete }
}
