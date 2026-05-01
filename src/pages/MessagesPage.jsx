import { useState, useEffect, useRef, useCallback } from 'react'
import {
  PaperAirplaneIcon,
  ArrowLeftIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { createNotification } from '../lib/notifications'
import Avatar from '../components/shared/Avatar'
import { format, isToday, isYesterday } from 'date-fns'

// ── helpers ────────────────────────────────────────────────
function formatTime(ts) {
  const d = new Date(ts)
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

// ── useConversations ───────────────────────────────────────
// Fetches the list of DM threads (one per conversation partner)
function useConversations(userId) {
  const [convos, setConvos] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    // Get latest message per partner
    const { data } = await supabase
      .from('direct_messages')
      .select('id, sender_id, recipient_id, content, is_read, created_at, profiles!direct_messages_sender_id_fkey(id, full_name, avatar_url)')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!data) { setLoading(false); return }

    // Deduplicate: keep most-recent message per partner
    const seen = new Map()
    for (const msg of data) {
      const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id
      if (!seen.has(partnerId)) seen.set(partnerId, msg)
    }

    // Fetch partner profiles
    const partnerIds = [...seen.keys()]
    const { data: profiles } = partnerIds.length
      ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', partnerIds)
      : { data: [] }

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

    const threads = [...seen.entries()].map(([partnerId, msg]) => ({
      partnerId,
      partner: profileMap[partnerId] ?? { id: partnerId, full_name: 'User', avatar_url: null },
      lastMessage: msg,
      unread: msg.recipient_id === userId && !msg.is_read,
    }))

    setConvos(threads)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  return { convos, loading, reload: load }
}

// ── useMessages ────────────────────────────────────────────
function useMessages(userId, partnerId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !partnerId) return
    setLoading(true)

    supabase
      .from('direct_messages')
      .select('id, sender_id, recipient_id, content, is_read, created_at')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        setMessages(data ?? [])
        setLoading(false)
      })

    // Mark as read
    supabase.from('direct_messages')
      .update({ is_read: true })
      .eq('sender_id', partnerId)
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .then(() => {})

    // Realtime subscription
    const channel = supabase
      .channel(`dm_${[userId, partnerId].sort().join('_')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `recipient_id=eq.${userId}`,
      }, (payload) => {
        const msg = payload.new
        if (msg.sender_id === partnerId) {
          setMessages(prev => [...prev, msg])
          // Mark read immediately
          supabase.from('direct_messages').update({ is_read: true }).eq('id', msg.id).then(() => {})
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, partnerId])

  const send = useCallback(async (content) => {
    if (!content.trim() || !userId || !partnerId) return
    const { data, error } = await supabase.from('direct_messages').insert({
      sender_id: userId,
      recipient_id: partnerId,
      content: content.trim(),
    }).select().single()
    if (!error && data) {
      setMessages(prev => [...prev, data])
      createNotification({
        userId: partnerId,
        type: 'direct_message',
        referenceId: userId,
        message: `You have a new message`,
        actorId: userId,
      })
    }
  }, [userId, partnerId])

  return { messages, loading, send }
}

// ── NewConversationModal ───────────────────────────────────
// Only shows users who share a parish, group, or organization with the current user
function NewConversationModal({ userId, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [connectedUsers, setConnectedUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Step 1: get the user's parishes, groups, and orgs in parallel
      const [parishRes, groupRes, orgRes] = await Promise.all([
        supabase.from('parish_follows').select('parish_id').eq('user_id', userId),
        supabase.from('group_members').select('group_id').eq('user_id', userId),
        supabase.from('organization_members').select('org_id').eq('user_id', userId),
      ])

      const parishIds = (parishRes.data ?? []).map(d => d.parish_id)
      const groupIds  = (groupRes.data  ?? []).map(d => d.group_id)
      const orgIds    = (orgRes.data    ?? []).map(d => d.org_id)

      // Step 2: get all other users in those same communities in parallel
      const [parishUsers, groupUsers, orgUsers] = await Promise.all([
        parishIds.length
          ? supabase.from('parish_follows').select('user_id').in('parish_id', parishIds).neq('user_id', userId)
          : Promise.resolve({ data: [] }),
        groupIds.length
          ? supabase.from('group_members').select('user_id').in('group_id', groupIds).neq('user_id', userId)
          : Promise.resolve({ data: [] }),
        orgIds.length
          ? supabase.from('organization_members').select('user_id').in('org_id', orgIds).neq('user_id', userId)
          : Promise.resolve({ data: [] }),
      ])

      const connectedIds = new Set([
        ...(parishUsers.data ?? []).map(d => d.user_id),
        ...(groupUsers.data  ?? []).map(d => d.user_id),
        ...(orgUsers.data    ?? []).map(d => d.user_id),
      ])

      if (connectedIds.size === 0) { setConnectedUsers([]); setLoading(false); return }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', [...connectedIds])
        .order('full_name')
        .limit(200)

      setConnectedUsers(profiles ?? [])
      setLoading(false)
    }
    load()
  }, [userId])

  const filtered = query.trim().length >= 1
    ? connectedUsers.filter(p => p.full_name?.toLowerCase().includes(query.toLowerCase()))
    : connectedUsers

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search members…"
            className="flex-1 text-sm text-navy focus:outline-none"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-medium">Cancel</button>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
          {loading && (
            <div className="p-4 text-center text-sm text-gray-400">Loading…</div>
          )}
          {!loading && connectedUsers.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-navy mb-1">No connections yet</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                You can message members who share a parish, group, or organization with you.
              </p>
            </div>
          )}
          {!loading && query.trim().length >= 1 && filtered.length === 0 && connectedUsers.length > 0 && (
            <div className="p-4 text-center text-sm text-gray-400">No members found.</div>
          )}
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-lightbg transition-colors text-left"
            >
              <Avatar src={p.avatar_url} name={p.full_name || 'U'} size="sm" />
              <span className="text-sm font-medium text-navy">{p.full_name || 'Communio Member'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── ConversationView ───────────────────────────────────────
function ConversationView({ userId, partner, onBack }) {
  const { messages, loading, send } = useMessages(userId, partner.id)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages.length])

  async function handleSend(e) {
    e.preventDefault()
    if (!draft.trim()) return
    const content = draft
    setDraft('')
    await send(content)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-navy transition-colors md:hidden">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <Avatar src={partner.avatar_url} name={partner.full_name || 'U'} size="sm" />
        <p className="font-semibold text-navy text-sm">{partner.full_name || 'Communio Member'}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading && (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === userId
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMine ? 'bg-navy text-white rounded-br-sm' : 'bg-white text-navy border border-gray-100 rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="bg-white border-t border-gray-100 px-3 py-3 flex items-end gap-2 flex-shrink-0">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
          placeholder="Message…"
          rows={1}
          className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy max-h-32 overflow-y-auto"
          style={{ minHeight: '40px' }}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="w-9 h-9 bg-navy text-white rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-navy/90 transition-colors disabled:opacity-40"
        >
          <PaperAirplaneIcon className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

// ── MessagesPage ───────────────────────────────────────────
export default function MessagesPage() {
  useEffect(() => { document.title = 'Messages | Communio' }, [])
  const { user } = useAuth()
  const { convos, loading, reload } = useConversations(user?.id)
  const [activePartner, setActivePartner] = useState(null)
  const [showNewConvo, setShowNewConvo] = useState(false)

  // Two-panel layout on desktop; single panel on mobile
  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-4xl mx-auto h-screen flex flex-col md:flex-row pb-16 md:pb-0">

        {/* Conversation list */}
        <div className={`w-full md:w-80 md:border-r border-gray-100 bg-white flex flex-col flex-shrink-0 ${activePartner ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="bg-navy px-4 py-4 flex items-center justify-between">
            <h1 className="text-white font-bold text-lg">Messages</h1>
            <button
              onClick={() => setShowNewConvo(true)}
              className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <PencilSquareIcon className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading && (
              <div className="space-y-0">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-white animate-pulse border-b border-gray-50" />)}
              </div>
            )}
            {!loading && convos.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-navy font-semibold text-sm mb-1">No messages yet</p>
                <p className="text-gray-400 text-xs">Start a conversation with another member.</p>
                <button
                  onClick={() => setShowNewConvo(true)}
                  className="mt-3 text-sm font-semibold text-navy hover:underline"
                >
                  New message
                </button>
              </div>
            )}
            {convos.map(({ partner, lastMessage, unread }) => (
              <button
                key={partner.id}
                onClick={() => setActivePartner(partner)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-lightbg transition-colors text-left ${
                  activePartner?.id === partner.id ? 'bg-lightbg' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar src={partner.avatar_url} name={partner.full_name || 'U'} size="sm" />
                  {unread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <p className={`text-sm truncate ${unread ? 'font-bold text-navy' : 'font-medium text-navy'}`}>
                      {partner.full_name || 'Communio Member'}
                    </p>
                    <p className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                      {lastMessage?.created_at ? formatTime(lastMessage.created_at) : ''}
                    </p>
                  </div>
                  <p className={`text-xs truncate ${unread ? 'text-navy font-medium' : 'text-gray-400'}`}>
                    {lastMessage?.sender_id === user.id ? 'You: ' : ''}{lastMessage?.content ?? ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Active conversation */}
        <div className={`flex-1 flex flex-col ${activePartner ? 'flex' : 'hidden md:flex'}`}>
          {activePartner ? (
            <ConversationView
              userId={user.id}
              partner={activePartner}
              onBack={() => { setActivePartner(null); reload() }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-cream">
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <PaperAirplaneIcon className="w-8 h-8 text-navy/20" />
                </div>
                <p className="text-navy font-semibold text-sm">Select a conversation</p>
                <p className="text-gray-400 text-xs mt-1">or start a new one</p>
                <button
                  onClick={() => setShowNewConvo(true)}
                  className="mt-4 text-sm font-semibold text-navy hover:underline"
                >
                  New message
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* New conversation modal */}
      {showNewConvo && (
        <NewConversationModal
          userId={user.id}
          onSelect={(partner) => { setActivePartner(partner); reload() }}
          onClose={() => setShowNewConvo(false)}
        />
      )}
    </div>
  )
}
