import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BuildingLibraryIcon, BuildingOffice2Icon, ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'
import TopBar from '../components/shared/TopBar'
import { useMyCommunities } from '../hooks/useMyCommunities'
import { useAuth } from '../hooks/useAuth.jsx'
import { toast } from '../components/shared/Toast'
import { useTranslation } from 'react-i18next'

// Every parish you follow or run and every organization you belong to,
// each opening its page (from the Home "My parishes and organizations" card).
//
// Home parish vs following: you have ONE home parish (it's on your profile
// and is where new posts go by default) and can follow any number of others
// just to see their posts. Both used to sit in one list with a small badge.
export default function MyCommunitiesPage() {
  const { t } = useTranslation()
  const title = t('common:communities.title', 'My Parishes and Organizations')
  useEffect(() => { document.title = `${title} | inFold` }, [title])
  const { parishes, orgs, loading } = useMyCommunities()
  const { updateProfile } = useAuth()
  const [saving, setSaving] = useState(null)

  const home = parishes.find(p => p.isHome)
  const others = parishes.filter(p => !p.isHome)

  async function makeHome(p) {
    setSaving(p.id)
    const { error } = await updateProfile({ parish_id: p.id })
    setSaving(null)
    if (error) toast.error(typeof error === 'string' ? error : t('common:status.error', 'Something went wrong'))
    else toast.success(t('common:communities.home_set', '{{name}} is now your home parish', { name: p.name }))
  }

  const parishRow = (p) => ({
    key: p.id,
    to: `/parish/${p.id}`,
    name: p.name,
    detail: [p.city, p.state].filter(Boolean).join(', '),
    badges: [p.isAdmin && t('common:communities.admin', 'Admin')].filter(Boolean),
    manage: p.isAdmin ? `/parish-admin/${p.id}` : null,
  })

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto pb-24">
        <TopBar title={title} back="/" />

        <div className="px-4 pt-4 space-y-6">
          {/* Home parish */}
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
              {t('common:communities.home_parish', 'Home parish')}
            </h2>
            {loading ? (
              <div className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
            ) : home ? (
              <div className="bg-white rounded-2xl border-2 border-gold/40 shadow-sm overflow-hidden">
                <Row item={parishRow(home)} icon={HomeIcon} highlight />
                <p className="text-xs text-gray-500 px-4 pb-3 -mt-1">
                  {t('common:communities.home_explainer', 'Shown on your profile, and where your posts go unless you pick another place.')}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
                <p className="text-sm text-gray-500 mb-2">
                  {others.length
                    ? t('common:communities.pick_home_from_list', 'Choose your home parish: tap "Make home" on one below.')
                    : t('common:communities.no_home', "You haven't chosen a home parish yet.")}
                </p>
                {!others.length && (
                  <Link to="/directory" className="text-sm font-semibold text-navy hover:underline">
                    {t('common:communities.find_a_parish', 'Find a parish')} →
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Other parishes you follow or run */}
          {(loading || others.length > 0 || !home) && (
            <Section
              title={home ? t('common:communities.also_following', 'Also following') : t('common:communities.parishes', 'Parishes')}
              icon={BuildingLibraryIcon}
              loading={loading}
              items={others.map(p => ({
                ...parishRow(p),
                action: {
                  label: saving === p.id ? '…' : t('common:communities.make_home', 'Make home'),
                  onClick: () => makeHome(p),
                  disabled: saving !== null,
                },
              }))}
              empty={{ text: t('common:communities.you_don_t_follow_any_parishes', "You don't follow any parishes yet."), to: '/directory', action: t('common:communities.find_a_parish', 'Find a parish') }}
            />
          )}

          <Section
            title={t('common:communities.organizations', 'Organizations')}
            icon={BuildingOffice2Icon}
            loading={loading}
            items={orgs.map(o => ({
              key: o.id,
              to: `/organization/${o.id}`,
              name: o.name,
              detail: [o.org_type === 'national' ? t('common:communities.national', 'National') : o.org_type === 'chapter' ? t('common:communities.chapter', 'Chapter') : null,
                       [o.city, o.state].filter(Boolean).join(', ')].filter(Boolean).join(' · '),
              badges: [o.isAdmin && t('common:communities.admin', 'Admin')].filter(Boolean),
              manage: o.isAdmin ? `/org-admin/${o.id}` : null,
            }))}
            empty={{ text: t('common:communities.you_re_not_in_any_organizations', "You're not in any organizations yet."), to: '/organizations', action: t('common:communities.browse_organizations', 'Browse organizations') }}
          />
        </div>
      </div>
    </div>
  )
}

function Row({ item, icon: Icon, highlight = false }) { // eslint-disable-line no-unused-vars -- Icon is a JSX tag
  const { t } = useTranslation()
  return (
    <div className="flex items-center">
      <Link to={item.to} className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 hover:bg-lightbg transition-colors min-h-[60px]">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-gold/20' : 'bg-lightbg'}`}>
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
      {(item.action || item.manage) && (
        <div className="flex items-center gap-1.5 mr-2">
          {item.action && (
            <button
              type="button"
              onClick={item.action.onClick}
              disabled={item.action.disabled}
              className="text-xs font-semibold text-navy px-3 py-2 rounded-lg hover:bg-lightbg whitespace-nowrap disabled:opacity-50 min-h-[36px]"
            >
              {item.action.label}
            </button>
          )}
          {item.manage && (
            <Link to={item.manage} className="text-xs font-semibold text-navy px-3 py-2 rounded-lg border border-gray-200 hover:bg-lightbg whitespace-nowrap">
              {t('common:communities.dashboard', 'Dashboard')}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, loading, items, empty }) {
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
          {items.map(item => <li key={item.key}><Row item={item} icon={icon} /></li>)}
        </ul>
      )}
    </section>
  )
}
