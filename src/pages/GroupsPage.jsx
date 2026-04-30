import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, XMarkIcon, PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useGroupMemberships, useGroupSearch, useSuggestedGroups, useGroupJoin } from '../hooks/useGroups'
import GroupCard from '../components/groups/GroupCard'
import Modal from '../components/shared/Modal'

const CATEGORIES = [
  { value: null,          label: 'filter_all' },
  { value: 'parish',      label: 'category_parish' },
  { value: 'young_adults',label: 'category_young_adults' },
  { value: 'mens',        label: 'category_mens' },
  { value: 'womens',      label: 'category_womens' },
  { value: 'families',    label: 'category_families' },
  { value: 'rcia',        label: 'category_rcia' },
  { value: 'diocese',     label: 'category_diocese' },
  { value: 'interest',    label: 'category_interest' },
  { value: 'vocation',    label: 'category_vocation' },
  { value: 'other',       label: 'category_other' },
]

function GroupCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gray-200 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  )
}

export default function GroupsPage() {
  const { t } = useTranslation('groups')
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [leaveTarget, setLeaveTarget] = useState(null)

  const { memberships, memberGroupIds, adminGroupIds, refresh } = useGroupMemberships()
  const { suggested, loading: suggestedLoading } = useSuggestedGroups()
  const { groups, loading: searchLoading } = useGroupSearch(searchQuery, activeCategory)
  const { joinGroup, leaveGroup, requestToJoin, hasRequested } = useGroupJoin()

  useEffect(() => { document.title = `${t('title')} | Communio` }, [t])

  const isSearching = searchQuery.trim().length > 0 || activeCategory !== null

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

  return (
    <div className="min-h-screen bg-cream md:pl-60 pb-24">

      {/* ── Header ── */}
      <div className="bg-navy px-4 pt-5 pb-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-white font-bold text-xl">{t('title')}</h1>
            <p className="text-gray-300 text-sm">{t('subtitle')}</p>
          </div>
          <button
            onClick={() => navigate('/groups/new')}
            className="flex items-center gap-1.5 bg-gold text-navy text-sm font-bold px-3 py-2 rounded-xl"
          >
            <PlusIcon className="w-4 h-4" />
            {t('create')}
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full bg-white pl-9 pr-9 py-2.5 rounded-xl text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Category filter ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 px-4 pt-3" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(({ value, label }) => (
          <button
            key={String(value)}
            onClick={() => setActiveCategory(value)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              activeCategory === value
                ? 'bg-gold text-navy'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-navy'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-6">

        {/* ── My Groups ── */}
        {!isSearching && memberships.length > 0 && (
          <section>
            <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">{t('my_groups')}</p>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {memberships.map(({ group }) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  compact
                  {...groupActions(group)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Suggested ── */}
        {!isSearching && (
          <section>
            <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">{t('suggested')}</p>
            {suggestedLoading ? (
              <>{[1,2,3].map(i => <GroupCardSkeleton key={i} />)}</>
            ) : (
              suggested
                .filter(g => !memberGroupIds.has(g.id))
                .slice(0, 4)
                .map(group => (
                  <GroupCard key={group.id} group={group} {...groupActions(group)} />
                ))
            )}
          </section>
        )}

        {/* ── All / Search results ── */}
        <section>
          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">
            {isSearching ? t('search_results') : t('all')}
          </p>

          {searchLoading ? (
            <>{[1,2,3].map(i => <GroupCardSkeleton key={i} />)}</>
          ) : groups.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <UserGroupIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-navy text-sm">{t('empty')}</p>
              <p className="text-gray-400 text-xs mt-1">
                {activeCategory ? 'Try a different category.' : 'No groups match your search.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-sm text-navy font-semibold hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            groups.map(group => (
              <GroupCard key={group.id} group={group} {...groupActions(group)} />
            ))
          )}
        </section>
      </div>

      {/* ── Leave confirmation modal ── */}
      <Modal
        isOpen={!!leaveTarget}
        onClose={() => setLeaveTarget(null)}
        title={t('leave')}
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-5">
          {t('leave_confirm', { name: leaveTarget?.name })}
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
            {t('leave')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
