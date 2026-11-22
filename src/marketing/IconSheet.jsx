// Dev-only preview of every marketing emblem (/__icons on marketing.html).
import Emblem from './Emblem'
import { EMBLEM_NAMES } from './emblemData'
import { Medallion } from './ui'

export default function IconSheet() {
  return (
    <div className="min-h-screen bg-navy-deep p-8 is-in">
      <div className="flex flex-wrap gap-6">
        {EMBLEM_NAMES.map((n) => (
          <div key={n} className="w-24 text-center text-gold text-xs">
            <Medallion name={n} />
            <div className="mt-2 text-white/60">{n}</div>
            <Emblem name={n} className="w-8 h-8 mt-2 text-navy bg-cream rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
