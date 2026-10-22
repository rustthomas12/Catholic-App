import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/shared/TopBar'
import { NoSymbolIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useBlockedUsers } from '../hooks/useBlockedUsers'
import Avatar from '../components/shared/Avatar'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { toast } from '../components/shared/Toast'

export default function BlockedUsersPage() {
  useEffect(() => { document.title = 'Blocked Users | inFold' }, [])
  const { blockedIds, loaded, unblock } = useBlockedUsers()
  const [fetched, setFetched] = useState(null) // profiles of blocked users, null until loaded
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!loaded || blockedIds.size === 0) return
    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, is_verified_clergy')
      .in('id', [...blockedIds])
      .then(({ data }) => setFetched(data ?? []))
  }, [blockedIds, loaded])

  // Unblocked users drop out immediately, without waiting for a refetch
  const profiles = (fetched ?? []).filter((p) => blockedIds.has(p.id))
  const loadingProfiles = blockedIds.size > 0 && fetched === null

  async function handleUnblock(id) {
    setBusyId(id)
    const { error } = await unblock(id)
    setBusyId(null)
    if (error) toast.error('Something went wrong. Please try again.')
    else toast.success('Unblocked')
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto pb-24">
        <TopBar title="Blocked users" back />

        <p className="px-4 pt-4 text-sm text-gray-500">
          You won't see posts, comments, prayer requests or messages from people you block,
          and they can't message you. They aren't notified.
        </p>

        <div className="bg-white mt-4 rounded-xl mx-3 overflow-hidden border border-gray-100 shadow-sm">
          {!loaded || loadingProfiles ? (
            <div className="py-10 flex justify-center"><LoadingSpinner /></div>
          ) : profiles.length === 0 ? (
            <div className="py-10 px-4 flex flex-col items-center gap-2 text-center">
              <NoSymbolIcon className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-500">You haven't blocked anyone.</p>
            </div>
          ) : (
            profiles.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}
              >
                <Link to={`/profile/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar src={p.avatar_url} name={p.full_name} size="sm" isVerifiedClergy={p.is_verified_clergy} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{p.full_name || 'Parish Member'}</p>
                    {p.username && <p className="text-xs text-gray-500 truncate">@{p.username}</p>}
                  </div>
                </Link>
                <button
                  onClick={() => handleUnblock(p.id)}
                  disabled={busyId === p.id}
                  className="text-sm font-medium text-navy border border-gray-200 rounded-lg px-3 py-1.5 min-h-[36px] hover:bg-lightbg disabled:opacity-50"
                >
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
