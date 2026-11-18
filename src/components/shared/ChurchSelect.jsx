import { useTranslation } from 'react-i18next'
import { CHURCHES, TRADITIONS, churchLabel, traditionLabel } from '../../data/churches'

// A <select> of the 24 Catholic churches, grouped by liturgical tradition
export default function ChurchSelect({ value, onChange, className = '', id, ariaLabel, disabled }) {
  const { t } = useTranslation()
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value || 'latin'}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {TRADITIONS.map((tr) => (
        <optgroup key={tr.id} label={traditionLabel(t, tr.id)}>
          {CHURCHES.filter((c) => c.tradition === tr.id).map((c) => (
            <option key={c.id} value={c.id}>{churchLabel(t, c.id)}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
