import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'

vi.mock('../../src/lib/supabase', () => ({ supabase: {} }))
const { notificationPath } = await import('../../src/lib/notifications')

describe('notificationPath', () => {
  it('opens the post for post activity (reference_id is the post)', () => {
    for (const type of ['like', 'comment', 'parish_post', 'group_post']) {
      expect(notificationPath(type, 'p1')).toBe('/post/p1')
    }
  })

  it('opens the group, parish admin or organization screens', () => {
    expect(notificationPath('group_request', 'g1')).toBe('/group/g1')
    expect(notificationPath('new_group_member', 'g1')).toBe('/group/g1')
    expect(notificationPath('new_parish_member', 'par1')).toBe('/parish-admin/par1')
    expect(notificationPath('new_org_member', 'o1')).toBe('/org-admin/o1')
    expect(notificationPath('chapter_request_resolved', 'o2')).toBe('/organization/o2')
  })

  it('falls back to a list screen when there is no reference', () => {
    expect(notificationPath('like', null)).toBe('/')
    expect(notificationPath('group_invite', null)).toBe('/groups')
    expect(notificationPath('new_parish_member', null)).toBe('/')
    expect(notificationPath('something_new', 'x')).toBe('/')
  })

  it('handles the fixed-destination types', () => {
    expect(notificationPath('direct_message', 'u1')).toBe('/messages?to=u1')
    expect(notificationPath('direct_message', null)).toBe('/messages')
    expect(notificationPath('prayer_response', 'r1')).toBe('/faith/prayer')
    expect(notificationPath('confession_reminder', null)).toBe('/premium/confession-tracker')
    expect(notificationPath('post_flagged', 'p1')).toBe('/admin')
    expect(notificationPath('event_reminder', null)).toBe('/notifications')
  })

  it('stays in sync with the push sender (send-push edge function)', () => {
    const edge = readFileSync('supabase/functions/send-push/index.ts', 'utf8')
    const types = [
      'like', 'comment', 'parish_post', 'group_post', 'group_invite', 'group_request',
      'group_request_response', 'new_group_member', 'new_parish_member', 'new_org_member',
      'chapter_request_resolved', 'chapter_request', 'post_flagged', 'prayer_response',
      'confession_reminder', 'direct_message', 'event_reminder',
    ]
    for (const type of types) {
      expect(edge, `send-push should route ${type}`).toContain(`case '${type}':`)
    }
    expect(edge).toContain("return ref ? `/post/${ref}` : '/'")
    expect(edge).toContain("return ref ? `/parish-admin/${ref}` : '/'")
  })
})
