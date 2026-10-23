import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  MapIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import { useAdminAccess } from '../../hooks/useAdminAccess'
import { useUnreadDMCount } from '../../lib/dmBadge'

// The "Me" tab's own-profile extras, Facebook-menu style: what you manage
// on top (pastors and admins use it daily), then the places that used to
// live in the More sheet.
export default function MeShortcuts() {
  const { t } = useTranslation('common')
  const { isPlatformAdmin, parishAdminRecords, orgAdminRecords } = useAdminAccess()
  const unreadDMs = useUnreadDMCount()
  const [showAll, setShowAll] = useState(false)

  const manage = [
    ...(isPlatformAdmin
      ? [{ to: '/admin', Icon: ShieldExclamationIcon, label: t('nav.platform_admin'), hint: t('me.platform_admin_hint'), danger: true }]
      : []),
    ...parishAdminRecords.map((r) => ({
      to: `/parish-admin/${r.parish_id}`,
      Icon: BuildingLibraryIcon,
      label: r.parishes?.name || t('nav.my_parish'),
      hint: t('me.manage_parish'),
    })),
    ...orgAdminRecords.map((r) => ({
      to: `/org-admin/${r.org_id}`,
      Icon: BuildingOffice2Icon,
      label: r.organizations?.name || t('nav.my_organization'),
      hint: t('me.manage_org'),
    })),
  ]

  const rows = [
    { to: '/messages', Icon: ChatBubbleLeftRightIcon, label: t('nav.messages'), badge: unreadDMs },
    { to: '/directory', Icon: MapIcon, label: t('nav.directory') },
    { to: '/organizations', Icon: BuildingOffice2Icon, label: t('nav.organizations') },
    { to: '/settings', Icon: Cog6ToothIcon, label: t('nav.settings') },
  ]

  return (
    <>
      {manage.length > 0 && (
        <section aria-labelledby="me-manage">
          <h2 id="me-manage" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
            {t('me.you_manage')}
          </h2>
          <div className="space-y-2">
            {(showAll ? manage : manage.slice(0, 3)).map(({ to, label, hint, danger, ...item }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm transition-colors min-h-[56px] ${
                  danger ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-navy border-navy hover:bg-navy/90'
                }`}
              >
                <span className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-white/10'}`}>
                  <item.Icon className={`w-5 h-5 ${danger ? 'text-red-600' : 'text-gold'}`} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-semibold truncate ${danger ? 'text-red-700' : 'text-white'}`}>{label}</span>
                  <span className={`block text-xs ${danger ? 'text-red-600' : 'text-white/75'}`}>{hint}</span>
                </span>
                <ChevronRightIcon className={`w-5 h-5 flex-shrink-0 ${danger ? 'text-red-600' : 'text-white/70'}`} />
              </Link>
            ))}
            {manage.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                aria-expanded={showAll}
                className="w-full min-h-[44px] text-sm font-semibold text-navy hover:underline"
              >
                {showAll ? t('me.show_less') : t('me.show_all', { count: manage.length })}
              </button>
            )}
          </div>
        </section>
      )}

      <nav aria-label={t('me.shortcuts')} className="md:hidden bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
        {rows.map(({ to, label, badge, ...row }) => (
          <Link key={to} to={to} className="flex items-center gap-3 px-4 min-h-[52px] hover:bg-lightbg transition-colors">
            <row.Icon className="w-5 h-5 text-navy flex-shrink-0" />
            <span className="flex-1 text-sm font-medium text-navy">{label}</span>
            {badge > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 bg-red-600 rounded-full text-white text-[11px] font-bold flex items-center justify-center">
                <span aria-hidden="true">{badge > 99 ? '99+' : badge}</span>
                <span className="sr-only">{t('a11y.unread', { count: badge })}</span>
              </span>
            )}
            <ChevronRightIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
          </Link>
        ))}
      </nav>
    </>
  )
}
