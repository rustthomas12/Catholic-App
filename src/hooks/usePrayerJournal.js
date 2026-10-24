import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'
import { encryptEntry, decryptEntry } from '../lib/journalCrypto'

// Entries are end-to-end encrypted with a key that exists only on this
// device (see lib/journalCrypto). The server stores ciphertext only.
const COLUMNS = 'id, ciphertext, iv, key_id, created_at, updated_at'

export function usePrayerJournal() {
  const { user } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [otherDeviceCount, setOtherDeviceCount] = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const open = useCallback(async (row) => {
    const plain = await decryptEntry(user.id, row)
    return plain ? { id: row.id, created_at: row.created_at, updated_at: row.updated_at, ...plain } : null
  }, [user])

  const fetchEntries = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('prayer_journal')
      .select(COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      setError(error.message)
    } else {
      const opened = await Promise.all((data || []).map(open))
      setEntries(opened.filter(Boolean))
      setOtherDeviceCount(opened.filter((e) => !e).length)
    }
    setLoading(false)
  }, [user, open])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const createEntry = useCallback(async ({ title, content, mood }) => {
    if (!user || !content?.trim()) return null
    try {
      const sealed = await encryptEntry(user.id, { title, content, mood })
      const { data, error } = await supabase
        .from('prayer_journal')
        .insert({ user_id: user.id, ...sealed })
        .select(COLUMNS)
        .single()
      if (error) return null
      const entry = await open(data)
      if (entry) setEntries(prev => [entry, ...prev])
      return entry
    } catch {
      return null
    }
  }, [user, open])

  const updateEntry = useCallback(async (id, { title, content, mood }) => {
    if (!user || !content?.trim()) return null
    try {
      const sealed = await encryptEntry(user.id, { title, content, mood })
      const { data, error } = await supabase
        .from('prayer_journal')
        .update(sealed)
        .eq('id', id)
        .select(COLUMNS)
        .single()
      if (error) return null
      const entry = await open(data)
      if (entry) setEntries(prev => prev.map(e => e.id === id ? entry : e))
      return entry
    } catch {
      return null
    }
  }, [user, open])

  const deleteEntry = useCallback(async (id) => {
    const { error } = await supabase
      .from('prayer_journal')
      .delete()
      .eq('id', id)
    if (!error) setEntries(prev => prev.filter(e => e.id !== id))
    return !error
  }, [])

  return { entries, otherDeviceCount, loading, error, createEntry, updateEntry, deleteEntry, refetch: fetchEntries }
}
