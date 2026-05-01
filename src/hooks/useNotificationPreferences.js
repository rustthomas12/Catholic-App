import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'

const DEFAULTS = {
  likes:                  true,
  comments:               true,
  group_invites:          true,
  group_requests:         true,
  parish_posts:           true,
  prayer_responses:       true,
  confession_reminder:    true,
  direct_messages:        true,
  event_reminders:        true,
  post_flagged:           true,
  new_parish_member:      true,
  group_posts:            true,
  new_group_member:       true,
  chapter_requests:       true,
  new_org_member:         true,
  reminder_interval_days: 30,
}

export function useNotificationPreferences() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  // ── Fetch ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return }

    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') {
          console.error('Failed to load notification preferences:', error.message)
        }
        // If no row exists (PGRST116 = not found): use defaults
        if (data) setPreferences({ ...DEFAULTS, ...data })
        setLoading(false)
      })
  }, [user])

  // ── Update a single column ────────────────────────────────
  const updatePreference = useCallback(async (column, value) => {
    if (!user) return

    // Optimistic update
    setPreferences(prev => ({ ...prev, [column]: value }))

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: user.id, [column]: value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    if (error) {
      // Revert on failure
      setPreferences(prev => ({ ...prev, [column]: !value }))
      console.error('Failed to update notification preference:', error.message)
    }
  }, [user])

  // ── Turn off all ──────────────────────────────────────────
  const turnOffAll = useCallback(async () => {
    if (!user) return

    const allOff = {
      likes:               false,
      comments:            false,
      group_invites:       false,
      group_requests:      false,
      parish_posts:        false,
      prayer_responses:    false,
      confession_reminder: false,
      direct_messages:     false,
      event_reminders:     false,
      post_flagged:        false,
      new_parish_member:   false,
      group_posts:         false,
      new_group_member:    false,
      chapter_requests:    false,
      new_org_member:      false,
    }

    // Optimistic update
    setPreferences(prev => ({ ...prev, ...allOff }))

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: user.id, ...allOff, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    if (error) {
      // Revert
      setPreferences(prev => ({ ...prev, ...DEFAULTS }))
      console.error('Failed to turn off all notifications:', error.message)
    }
  }, [user])

  return { preferences, loading, updatePreference, turnOffAll }
}
