import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const now = new Date().toISOString()

  // Find all due, unpublished scheduled posts
  const { data: duePosts, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select('*')
    .lte('scheduled_for', now)
    .eq('published', false)
    .limit(50)

  if (fetchError) {
    console.error('Error fetching scheduled posts:', fetchError)
    return new Response('Error fetching posts', { status: 500 })
  }

  if (!duePosts || duePosts.length === 0) {
    return new Response(JSON.stringify({ delivered: 0 }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  console.log(`Delivering ${duePosts.length} scheduled posts`)

  let delivered = 0
  let failed = 0

  for (const scheduled of duePosts) {
    try {
      // Insert into posts table
      const { data: newPost, error: insertError } = await supabase
        .from('posts')
        .insert({
          author_id:       scheduled.author_id,
          parish_id:       scheduled.parish_id ?? null,
          group_id:        scheduled.group_id  ?? null,
          org_id:          scheduled.org_id    ?? null,
          content:         scheduled.content,
          image_url:       scheduled.image_url ?? null,
          is_announcement: true,
          created_at:      scheduled.scheduled_for,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error(`Failed to insert post from scheduled ${scheduled.id}:`, insertError)
        failed++
        continue
      }

      // Mark scheduled post as published
      await supabase
        .from('scheduled_posts')
        .update({ published: true, published_at: now })
        .eq('id', scheduled.id)

      delivered++

      // Notify parish followers
      if (scheduled.parish_id) {
        const { data: followers } = await supabase
          .from('parish_follows')
          .select('user_id')
          .eq('parish_id', scheduled.parish_id)

        if (followers && followers.length > 0) {
          const notifications = followers
            .filter((f: { user_id: string }) => f.user_id !== scheduled.author_id)
            .map((f: { user_id: string }) => ({
              user_id:      f.user_id,
              type:         'parish_announcement',
              reference_id: newPost.id,
              message:      scheduled.content.slice(0, 100) + (scheduled.content.length > 100 ? '…' : ''),
              actor_id:     scheduled.author_id,
              is_read:      false,
            }))

          for (let i = 0; i < notifications.length; i += 100) {
            await supabase.from('notifications').insert(notifications.slice(i, i + 100))
          }
        }
      }

      // Notify group members
      if (scheduled.group_id) {
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', scheduled.group_id)

        if (members && members.length > 0) {
          const notifications = members
            .filter((m: { user_id: string }) => m.user_id !== scheduled.author_id)
            .map((m: { user_id: string }) => ({
              user_id:      m.user_id,
              type:         'group_activity',
              reference_id: newPost.id,
              message:      scheduled.content.slice(0, 100) + (scheduled.content.length > 100 ? '…' : ''),
              actor_id:     scheduled.author_id,
              is_read:      false,
            }))

          for (let i = 0; i < notifications.length; i += 100) {
            await supabase.from('notifications').insert(notifications.slice(i, i + 100))
          }
        }
      }

    } catch (err) {
      console.error(`Unexpected error processing scheduled post ${scheduled.id}:`, err)
      failed++
    }
  }

  console.log(`Delivery complete: ${delivered} delivered, ${failed} failed`)

  return new Response(
    JSON.stringify({ delivered, failed, total: duePosts.length }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  )
})
