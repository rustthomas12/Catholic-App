import { supabase } from './supabase'

// Report a comment, direct message, group chat message, prayer request,
// profile or group (posts use post_flags). The database fills in what was
// reported and who wrote it, and notifies the moderators.
// type: 'comment' | 'message' | 'group_message' | 'prayer_request' | 'profile' | 'group'
export async function reportContent(type, id, reason, notes) {
  const { error } = await supabase.from('content_reports').insert({
    content_type: type,
    content_id: id,
    reason,
    notes: notes?.trim() ? notes.trim().slice(0, 1000) : null,
  })
  // Reporting the same thing twice is fine — it's already in the queue
  if (error?.code === '23505') return { error: null }
  return { error: error ? (error.code === 'P0001' ? error.message : 'Could not send the report. Please try again.') : null }
}
