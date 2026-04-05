import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { UserGroupIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'

const CATEGORY_LABELS = {
  parish: 'Parish',
  diocese: 'Diocese',
  interest: 'Interest',
  vocation: 'Vocation',
  rcia: 'RCIA',
  mens: "Men's",
  womens: "Women's",
  young_adults: 'Young Adults',
  families: 'Families',
  other: 'Other',
}

export default function ParishGroups({ parishId }) {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [joinedIds, setJoinedIds] = useState(new Set())

  useEffect(() => {
    if (!parishId) return
    setLoading(true)

    const groupsQuery = supabase
      .from('groups')
      .select('id, name, description, category, is_private, member_count, avatar_url')
      .eq('parish_id', parishId)
      .order('member_count', { ascending: false })

    const membershipsQuery = user
      ? supabase.from('group_members').select('group_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] })

    Promise.all([groupsQuery, membershipsQuery]).then(([groupsRes, membershipsRes]) => {
      setGroups(groupsRes.data ?? [])
      const ids = new Set((membershipsRes.data ?? []).map((m) => m.group_id))
      setJoinedIds(ids)
      setLoading(false)
    })
  }, [parishId, user])

  if (loading) {
    return (
      <div className="px-4 pt-4 grid gap-3 sm:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100" />
        ))}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="px-4 pt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <UserGroupIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-navy text-sm">No groups yet</p>
          <p className="text-gray-400 text-xs mt-1">This parish hasn't created any groups.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-8 grid gap-3 sm:grid-cols-2">
      {groups.map((group) => (
        <Link
          key={group.id}
          to={`/group/${group.id}`}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow block"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-lightbg rounded-xl flex items-center justify-center flex-shrink-0">
              <UserGroupIcon className="w-5 h-5 text-navy" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-navy text-sm leading-snug truncate">{group.name}</p>
                {joinedIds.has(group.id) && (
                  <span className="text-xs text-gold font-semibold flex-shrink-0">Joined</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {CATEGORY_LABELS[group.category] ?? group.category}
                {group.is_private ? ' · Private' : ''}
                {' · '}
                {(group.member_count ?? 0).toLocaleString()} member{group.member_count !== 1 ? 's' : ''}
              </p>
              {group.description && (
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{group.description}</p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
