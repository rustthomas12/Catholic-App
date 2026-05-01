import { getLiturgicalSeason } from '../../utils/liturgical'

const variants = {
  clergy:   { bg: 'bg-gold',      text: 'text-navy',     label: 'Verified' },
  official: { bg: 'bg-navy',      text: 'text-white',    label: 'Official' },
  category: { bg: 'bg-gray-100',  text: 'text-gray-700', label: '' },
  season:   { bg: '',             text: '',              label: '' },
}

const sizes = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
}

export default function Badge({ variant = 'category', label, size = 'sm' }) {
  let bg = variants[variant]?.bg ?? 'bg-gray-100'
  let text = variants[variant]?.text ?? 'text-gray-700'
  let displayLabel = label ?? variants[variant]?.label ?? ''

  if (variant === 'season') {
    const season = getLiturgicalSeason()
    bg = ''
    text = season.textColor === '#fff' ? 'text-white' : 'text-navy'
    displayLabel = label ?? season.label
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-medium ${sizes[size]} ${text}`}
        style={{ backgroundColor: season.color }}
      >
        {displayLabel}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sizes[size]} ${bg} ${text}`}>
      {variant === 'clergy' && (
        <svg viewBox="0 0 10 14" className="w-2.5 h-3 fill-current flex-shrink-0">
          <path d="M5 0v4H1v2h4v8h2V6h4V4H6V0z" />
        </svg>
      )}
      {variant === 'official' && (
        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-current flex-shrink-0">
          <path d="M1 5l3 3 5-5-1-1-4 4-2-2z" />
        </svg>
      )}
      {displayLabel}
    </span>
  )
}
