import {
  CalendarDaysIcon, ClockIcon, LinkIcon, UserGroupIcon, BuildingLibraryIcon, ChatBubbleLeftRightIcon,
  EnvelopeIcon, UserCircleIcon, ShieldCheckIcon, BookOpenIcon, ChartBarIcon, UsersIcon, ArrowsRightLeftIcon,
  DevicePhoneMobileIcon, GlobeAltIcon, LockClosedIcon, BoltIcon, PencilSquareIcon, BriefcaseIcon,
  ComputerDesktopIcon, MapPinIcon, Cog6ToothIcon, WrenchScrewdriverIcon, CreditCardIcon,
  ClipboardDocumentListIcon, FlagIcon, AcademicCapIcon, PaintBrushIcon, HeartIcon,
} from '@heroicons/react/24/outline'
import SacredIcon from './SacredIcon'

// Draws the emoji used in older page data as a matching line icon, so lists
// written with emoji (marketing pages, pitch deck) render in the app's
// traditional icon style instead. Unknown emoji are dropped, never shown.
const SACRED = {
  '📢': 'megaphone', '📣': 'megaphone', '🔔': 'bell', '⛪': 'church', '🏘': 'church', '🙏': 'candle',
  '📖': 'book', '🌅': 'sunrise', '🪞': 'scroll', '✝': 'cross', '📿': 'rosary', '🌱': 'wheatGrapes',
  '👨‍⚕': 'chalice',
}
const HERO = {
  '📅': CalendarDaysIcon, '🗓': CalendarDaysIcon, '🕐': ClockIcon, '🔗': LinkIcon, '🤝': UserGroupIcon,
  '🏛': BuildingLibraryIcon, '💬': ChatBubbleLeftRightIcon, '✉': EnvelopeIcon, '👤': UserCircleIcon,
  '🛡': ShieldCheckIcon, '📔': BookOpenIcon, '📊': ChartBarIcon, '👥': UsersIcon, '👨‍👧‍👦': UsersIcon,
  '🔁': ArrowsRightLeftIcon, '📱': DevicePhoneMobileIcon, '🌐': GlobeAltIcon, '🔒': LockClosedIcon,
  '⚡': BoltIcon, '✏': PencilSquareIcon, '💼': BriefcaseIcon, '💻': ComputerDesktopIcon, '📍': MapPinIcon,
  '⚙': Cog6ToothIcon, '🛠': WrenchScrewdriverIcon, '💳': CreditCardIcon, '📋': ClipboardDocumentListIcon,
  '🎯': FlagIcon, '🎓': AcademicCapIcon, '🎨': PaintBrushIcon, '🤍': HeartIcon,
}

const norm = (e) => (e || '').replace(/\uFE0F/g, '').trim()

export default function Glyph({ e, className = 'w-7 h-7' }) {
  const k = norm(e)
  if (SACRED[k]) return <SacredIcon name={SACRED[k]} className={className} />
  const Hero = HERO[k]
  return Hero ? <Hero className={`inline-block flex-shrink-0 ${className}`} aria-hidden="true" /> : null
}
