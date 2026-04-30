import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

export function usePrayerJournal() {
  const { user } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const fetchEntries = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('prayer_journal')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) setError(error.message)
    else setEntries(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const createEntry = useCallback(async ({ title, content, mood }) => {
    if (!user || !content?.trim()) return null
    const { data, error } = await supabase
      .from('prayer_journal')
      .insert({
        user_id: user.id,
        title:   title?.trim() || null,
        content: content.trim(),
        mood:    mood || null,
      })
      .select()
      .single()
    if (!error) setEntries(prev => [data, ...prev])
    return error ? null : data
  }, [user])

  const updateEntry = useCallback(async (id, { title, content, mood }) => {
    const { data, error } = await supabase
      .from('prayer_journal')
      .update({
        title:   title?.trim() || null,
        content: content.trim(),
        mood:    mood || null,
      })
      .eq('id', id)
      .select()
      .single()
    if (!error) setEntries(prev => prev.map(e => e.id === id ? data : e))
    return error ? null : data
  }, [])

  const deleteEntry = useCallback(async (id) => {
    const { error } = await supabase
      .from('prayer_journal')
      .delete()
      .eq('id', id)
    if (!error) setEntries(prev => prev.filter(e => e.id !== id))
    return !error
  }, [])

  return { entries, loading, error, createEntry, updateEntry, deleteEntry, refetch: fetchEntries }
}
