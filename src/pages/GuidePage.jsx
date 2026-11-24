import { useEffect, createElement } from 'react'
import { Link } from 'react-router-dom'
import {
  HomeIcon, UserGroupIcon, SunIcon, BellIcon, UserCircleIcon, BuildingLibraryIcon,
  MegaphoneIcon, CalendarDaysIcon, UsersIcon, ShieldCheckIcon, ChartBarIcon, BuildingOffice2Icon,
  ChatBubbleLeftRightIcon, Cog6ToothIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { useAdminAccess } from '../hooks/useAdminAccess'
import useGoBack from '../hooks/useGoBack'
import { useTranslation } from 'react-i18next'

// "How inFold works": where everything is, with extra sections for the
// roles the person actually has (parish team, moderator, organization or
// diocese leader). Linked from the Home welcome card and Me.

function Item({ Icon, title, children, to }) {
  const body = (
    <>
      <span className="w-9 h-9 rounded-xl bg-lightbg flex items-center justify-center flex-shrink-0">
        {createElement(Icon, { className: 'w-5 h-5 text-navy', 'aria-hidden': true })}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-navy">{title}</span>
        <span className="block text-sm text-gray-600 leading-relaxed mt-0.5">{children}</span>
      </span>
    </>
  )
  return to
    ? <li><Link to={to} className="flex gap-3 px-4 py-3 hover:bg-lightbg/60 transition-colors">{body}</Link></li>
    : <li className="flex gap-3 px-4 py-3">{body}</li>
}

function Section({ title, sub, children, accent = false }) {
  return (
    <section className="space-y-2">
      <div className="px-1">
        <h2 className={`text-xs font-bold uppercase tracking-wider ${accent ? 'text-gold-deep' : 'text-gray-500'}`}>{title}</h2>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <ul className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">{children}</ul>
    </section>
  )
}

export default function GuidePage() {
  const { t } = useTranslation('common')
  useEffect(() => { document.title = 'How inFold works | inFold' }, [])
  const goBack = useGoBack('/')
  const { profile } = useAuth()
  const { parishAdminRecords, orgAdminRecords, moderatorParishIds, dioceseAdminRecords } = useAdminAccess()
  const myParishAdmin = parishAdminRecords.find(r => r.role !== 'pending') || parishAdminRecords[0]
  const pending = myParishAdmin?.role === 'pending'
  const adminPath = myParishAdmin ? `/parish-admin/${myParishAdmin.parish_id}` : null
  const parishName = myParishAdmin?.parishes?.name || t('guide.your_parish', "your parish")
  const isPastor = myParishAdmin && ['ordained', 'religious'].includes(profile?.vocation_state)

  return (
    <div className="min-h-screen bg-cream pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goBack} aria-label={t('actions.back', 'Back')} className="tap-target -ml-2 p-2 text-navy">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-navy">{t('guide.title', "How inFold works")}</h1>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed px-1">
          {myParishAdmin
            ? t('guide.intro_admin', "Here is where everything is, starting with what you need to run {{parish}} on inFold.", { parish: parishName })
            : t('guide.intro', "Here is where everything is. The bar at the bottom of the screen (on a computer, the menu on the left) takes you to each part of the app.")}
        </p>

        {myParishAdmin && (
          <Section accent
            title={isPastor ? t('guide.pastor_title', "For you as pastor") : t('guide.team_title', "For your parish team")}
            sub={t('guide.team_sub', "Open your dashboard from Me → Manage → {{parish}}.", { parish: parishName })}>
            {pending && (
              <Item Icon={ShieldCheckIcon} title={t('guide.pending_t', "Verification first")}>
                {t('guide.pending_b', "We're confirming your role at the parish. Until then you can set up Mass times and settings; announcements, events and the rest open once you're verified.")}
              </Item>
            )}
            <Item Icon={MegaphoneIcon} to={adminPath} title={t('guide.ann_t', "Announcements")}>
              {t('guide.ann_b', "Post to everyone who follows the parish. Announcements arrive as a notification and sit at the top of their feed until they've seen them. You can schedule them ahead.")}
            </Item>
            <Item Icon={CalendarDaysIcon} to={adminPath} title={t('guide.events_t', "Events and Mass times")}>
              {t('guide.events_b', "Add events people can RSVP to, and keep the Mass times on the parish page up to date.")}
            </Item>
            <Item Icon={SunIcon} to={adminPath} title={t('guide.ador_t', "Adoration")}>
              {t('guide.ador_b', "Set up weekly or one-time adoration. Parishioners sign up for holy hours on the parish page, and you can see which hours still need someone.")}
            </Item>
            <Item Icon={UsersIcon} to={adminPath} title={t('guide.people_t', "Parishioners")}>
              {t('guide.people_b', "See who follows the parish. If someone isn't actually part of the parish, tap Block: they're removed and can't post there.")}
            </Item>
            <Item Icon={ShieldCheckIcon} to={adminPath} title={t('guide.comm_t', "Community")}>
              {t('guide.comm_b', "Review posts people have flagged, add moderators to help, and choose the weekly discussion prompts.")}
            </Item>
            <Item Icon={ChartBarIcon} to={adminPath} title={t('guide.reach_t', "Reach and billing")}>
              {t('guide.reach_b', "See how many people your posts reach, and manage the parish plan.")}
            </Item>
          </Section>
        )}

        {moderatorParishIds.length > 0 && !myParishAdmin && (
          <Section accent title={t('guide.mod_title', "For you as a moderator")}>
            <Item Icon={ShieldCheckIcon} title={t('guide.mod_t', "Keeping the feed healthy")}>
              {t('guide.mod_b', "When a post in your parish is flagged, you'll get a notification. Open it to keep or hide the post. You can also hide a post or comment from its menu.")}
            </Item>
          </Section>
        )}

        {orgAdminRecords.length > 0 && (
          <Section accent title={t('guide.org_title', "For your organization")}
            sub={t('guide.org_sub', "Open it from Me → Manage.")}>
            <Item Icon={BuildingOffice2Icon} to={`/org-admin/${orgAdminRecords[0].org_id}`} title={orgAdminRecords[0].organizations?.name || t('guide.org_t', "Organization dashboard")}>
              {t('guide.org_b', "Post announcements and events to your members, invite people, and manage your chapters and plan.")}
            </Item>
          </Section>
        )}

        {dioceseAdminRecords.length > 0 && (
          <Section accent title={t('guide.dio_title', "For your diocese")}>
            <Item Icon={BuildingLibraryIcon} to={`/diocese-admin/${dioceseAdminRecords[0].diocese_id}`} title={dioceseAdminRecords[0].dioceses?.name || t('guide.dio_t', "Diocese dashboard")}>
              {t('guide.dio_b', "See which parishes your plan covers and how far your posts reach across them.")}
            </Item>
          </Section>
        )}

        <Section title={t('guide.everyone_title', "Finding your way around")}>
          <Item Icon={HomeIcon} to="/" title={t('nav.home', 'Home')}>
            {t('guide.home_b', "Today's Gospel and your parishes are at the top. Below is your feed: announcements and posts from your parishes, groups and organizations.")}
          </Item>
          <Item Icon={BuildingLibraryIcon} to="/directory" title={t('guide.parish_t', "Your parish page")}>
            {t('guide.parish_b', "Tap your parish at the top of Home (or find it under Me → Directory) for its posts, events, adoration sign-ups, groups and Mass times.")}
          </Item>
          <Item Icon={UserGroupIcon} to="/groups" title={t('nav.groups', 'Groups')}>
            {t('guide.groups_b', "Join a Bible study, ministry or prayer group, or start your own. Each group has its own feed and chat.")}
          </Item>
          <Item Icon={SunIcon} to="/faith" title={t('nav.faith', 'Faith')}>
            {t('guide.faith_b', "The day's readings, the Morning Offering, an examination of conscience and the saint of the day.")}
          </Item>
          <Item Icon={BellIcon} to="/notifications" title={t('nav.alerts', 'Alerts')}>
            {t('guide.alerts_b', "Announcements, replies and reminders. Choose what you get in Settings → Notifications.")}
          </Item>
          <Item Icon={ChatBubbleLeftRightIcon} to="/messages" title={t('nav.messages', 'Messages')}>
            {t('guide.msg_b', "Private messages with people from your parishes and groups, under Me → Messages.")}
          </Item>
          <Item Icon={UserCircleIcon} to="/profile" title={t('nav.me', 'Me')}>
            {t('guide.me_b', "Your profile, messages, the parish directory, organizations and settings. Anything you manage is listed at the top under Manage.")}
          </Item>
          <Item Icon={Cog6ToothIcon} to="/settings" title={t('nav.settings', 'Settings')}>
            {t('guide.settings_b', "Notifications, language, blocked accounts, and deleting your account.")}
          </Item>
        </Section>

        <p className="text-xs text-gray-500 text-center px-6">
          {t('guide.help', "Questions? Write to us any time from Settings → Contact us.")}
        </p>
      </div>
    </div>
  )
}
