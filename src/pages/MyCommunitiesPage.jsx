import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BuildingLibraryIcon, BuildingOffice2Icon, ChevronRightIcon } from '@heroicons/react/24/outline'
import TopBar from '../components/shared/TopBar'
import { useMyCommunities } from '../hooks/useMyCommunities'

// Every parish you follow or run and every organization you belong to,
// each opening its page (from the Home "My parishes & organizations" card)
export default function MyCommunitiesPage() {
  useEffect(() => { document.title = 'My Parishes & Organizations | inFold' }, [])
  const { parishes, orgs, loading } = useMyCommunities()

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto pb-24">
        <TopBar title="My Parishes & Organizations" back="/" />

        <div className="px-4 pt-4 space-y-6">
          <Section
            title="Parishes"
            icon={BuildingLibraryIcon}
            loading={loading}
            items={parishes.map(p => ({
              key: p.id,
              to: `/parish/${p.id}`,
              name: p.name,
              detail: [p.city, p.state].filter(Boolean).join(', '),
              badges: [p.isHome && 'Home parish', p.isAdmin && 'Admin'].filter(Boolean),
              manage: p.isAdmin ? `/parish-admin/${p.id}` : null,
            }))}
            empty={{ text: "You don't follow any parishes yet.", to: '/directory', action: 'Find a parish' }}
          />

          <Section
            title="Organizations"
            icon={BuildingOffice2Icon}
            loading={loading}
            items={orgs.map(o => ({
              key: o.id,
              to: `/organization/${o.id}`,
              name: o.name,
              detail: [o.org_type === 'national' ? 'National' : o.org_type === 'chapter' ? 'Chapter' : null,
                       [o.city, o.state].filter(Boolean).join(', ')].filter(Boolean).join(' · '),
              badges: [o.isAdmin && 'Admin'].filter(Boolean),
              manage: o.isAdmin ? `/org-admin/${o.id}` : null,
            }))}
            empty={{ text: "You're not in any organizations yet.", to: '/organizations', action: 'Browse organizations' }}
          />
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, loading, items, empty }) { // eslint-disable-line no-unused-vars -- Icon is a JSX tag
  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
        {title}{!loading && items.length > 0 && ` (${items.length})`}
      </h2>
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse border border-gray-100" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <p className="text-sm text-gray-500 mb-2">{empty.text}</p>
          <Link to={empty.to} className="text-sm font-semibold text-navy hover:underline">{empty.action} →</Link>
        </div>
      ) : (
        <ul className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {items.map(item => (
            <li key={item.key} className="flex items-center">
              <Link to={item.to} className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 hover:bg-lightbg transition-colors min-h-[60px]">
                <div className="w-10 h-10 bg-lightbg rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy text-sm truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {item.detail && <span className="text-xs text-gray-500">{item.detail}</span>}
                    {item.badges.map(b => (
                      <span key={b} className="text-[10px] font-bold uppercase tracking-wide bg-gold/15 text-navy px-1.5 py-0.5 rounded">{b}</span>
                    ))}
                  </div>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </Link>
              {item.manage && (
                <Link to={item.manage} className="text-xs font-semibold text-navy px-3 py-2 mr-2 rounded-lg border border-gray-200 hover:bg-lightbg whitespace-nowrap">
                  Dashboard
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
