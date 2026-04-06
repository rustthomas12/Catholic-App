import { useState, useEffect } from 'react'
import { UserGroupIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabase'
import { useGroupMemberships, useGroupJoin } from '../../hooks/useGroups'
import GroupCard from '../groups/GroupCard'
import Modal from '../shared/Modal'

export default function ParishGroups({ parishId }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [leaveTarget, setLeaveTarget] = useState(null)

  const { memberGroupIds, adminGroupIds, refresh } = useGroupMemberships()
  const { joinGroup, leaveGroup, requestToJoin, hasRequested } = useGroupJoin()

  useEffect(() => {
    if (!parishId) return
    setLoading(true)
    supabase
      .from('groups')
      .select('id, name, description, category, is_private, member_count, avatar_url, parishes(name, city)')
      .eq('parish_id', parishId)
      .order('member_count', { ascending: false })
      .then(({ data }) => {
        setGroups(data ?? [])
        setLoading(false)
      })
  }, [parishId])

  async function handleJoin(group) {
    await joinGroup(group.id, () => refresh())
  }

  async function handleLeave(group) {
    setLeaveTarget(group)
  }

  async function confirmLeave() {
    if (!leaveTarget) return
    await leaveGroup(leaveTarget.id, adminGroupIds, () => {
      refresh()
      setLeaveTarget(null)
    })
    setLeaveTarget(null)
  }

  async function handleRequest(group) {
    await requestToJoin(group.id, group.name)
  }

  function groupActions(group) {
    return {
      isMember: memberGroupIds.has(group.id),
      isAdmin: adminGroupIds.has(group.id),
      hasRequested: hasRequested(group.id),
      onJoin: () => handleJoin(group),
      onLeave: () => handleLeave(group),
      onRequest: () => handleRequest(group),
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />
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
    <div className="px-4 pt-4 pb-8">
      {groups.map(group => (
        <GroupCard key={group.id} group={group} {...groupActions(group)} />
      ))}

      <Modal
        isOpen={!!leaveTarget}
        onClose={() => setLeaveTarget(null)}
        title="Leave group"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to leave {leaveTarget?.name}?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setLeaveTarget(null)}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={confirmLeave}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600"
          >
            Leave
          </button>
        </div>
      </Modal>
    </div>
  )
}
