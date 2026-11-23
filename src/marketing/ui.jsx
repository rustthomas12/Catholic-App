import { useEffect, useLayoutEffect, useRef, useState, createElement, Fragment } from 'react'
import Emblem from './Emblem'
import { observe, d, useParallax } from './motion'

/** Adds .is-in once the element scrolls into view; children use .rv / .emb-draw. */
// On pre-built pages a small script in the HTML marks the sections already on
// screen before React starts (data-reveal); the layout effect keeps that state.
export function Reveal({ as = 'div', className = '', children, style, ...rest }) {
  const [el, setEl] = useState(null)
  const [inView, setInView] = useState(false)
  useLayoutEffect(() => {
    if (el?.classList.contains('is-in')) setInView(true) // eslint-disable-line react-hooks/set-state-in-effect -- adopt the pre-hydration state before paint
  }, [el])
  useEffect(() => (el ? observe(el, () => setInView(true)) : undefined), [el])
  return createElement(as, {
    ref: setEl, 'data-reveal': '', suppressHydrationWarning: true,
    className: `${className} ${inView ? 'is-in' : ''}`, style, ...rest,
  }, children)
}

/** Headline whose words rise in one after another. */
export function RisingWords({ text, className = '', base = 0, step = 70 }) {
  const words = text.split(' ')
  return words.map((w, i) => (
    <Fragment key={i}>
      <span className="word"><span className={className} style={d(i, step, base)}>{w}</span></span>
      {i < words.length - 1 ? ' ' : null}
    </Fragment>
  ))
}

export function Eyebrow({ children, light = false, className = '' }) {
  return (
    <p className={`smallcaps text-sm md:text-base flex items-center justify-center gap-3 ${light ? 'text-gold' : 'text-gold-deep'} ${className}`}>
      <span aria-hidden="true" className="h-px w-8 bg-current opacity-60" />
      {children}
      <span aria-hidden="true" className="h-px w-8 bg-current opacity-60" />
    </p>
  )
}

/** A thin gold rule with a cross-and-fleuron centre that draws itself in. */
export function Ornament({ className = 'w-64 text-gold' }) {
  return (
    <svg viewBox="0 0 240 24" className={`ornament ${className}`} fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
      <path className="ln" pathLength="1" d="M4 12H96M144 12H236" />
      <path className="ln" pathLength="1" d="M96 12c6-6 12-6 15-1M144 12c-6-6-12-6-15-1M96 12c6 6 12 6 15 1M144 12c-6 6-12 6-15 1" />
      <path className="ln" pathLength="1" d="M120 3v18M114 9h12" strokeWidth="1.3" />
      <circle className="emb-dot" cx="120" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle className="emb-dot" cx="84" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle className="emb-dot" cx="156" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Emblem inside a double gold ring. */
export function Medallion({ name, size = 'w-16 h-16', icon = 'w-8 h-8', className = '', style }) {
  return (
    <span className={`medallion emb-draw text-gold ${size} ${className}`} style={style}>
      <Emblem name={name} className={icon} />
    </span>
  )
}

export function SectionHeading({ eyebrow, title, sub, light = false, className = '' }) {
  return (
    <Reveal className={`text-center max-w-3xl mx-auto ${className}`}>
      {eyebrow && <div className="rv"><Eyebrow light={light}>{eyebrow}</Eyebrow></div>}
      <h2 className={`rv font-display font-semibold text-4xl md:text-6xl leading-[1.05] mt-4 ${light ? 'text-white' : 'text-navy'}`} style={d(1)}>
        {title}
      </h2>
      {sub && <p className={`rv mt-5 text-lg leading-relaxed ${light ? 'text-white/65' : 'text-navy/60'}`} style={d(2)}>{sub}</p>}
      <div className="rv flex justify-center mt-7" style={d(3)}><Ornament className={`w-56 ${light ? 'text-gold/70' : 'text-gold'}`} /></div>
    </Reveal>
  )
}

/* ── Rose window ─────────────────────────────────────────────
   Gothic tracery built from circles and petals, drawn in on load and then
   turning very slowly. Pure SVG strokes, so it costs almost nothing. */
const P = (n) => Math.round(n * 100) / 100
function petals(cx, cy, r0, r2, count, width) {
  let out = ''
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const b = a + (Math.PI / count) * width
    const c = a - (Math.PI / count) * width
    const x0 = cx + r0 * Math.cos(a), y0 = cy + r0 * Math.sin(a)
    const x2 = cx + r2 * Math.cos(a), y2 = cy + r2 * Math.sin(a)
    const xb = cx + ((r0 + r2) / 2) * Math.cos(b), yb = cy + ((r0 + r2) / 2) * Math.sin(b)
    const xc = cx + ((r0 + r2) / 2) * Math.cos(c), yc = cy + ((r0 + r2) / 2) * Math.sin(c)
    out += `M${P(x0)} ${P(y0)}Q${P(xb)} ${P(yb)} ${P(x2)} ${P(y2)}Q${P(xc)} ${P(yc)} ${P(x0)} ${P(y0)}`
  }
  return out
}
function spokes(cx, cy, r0, r2, count, offset = 0) {
  let out = ''
  for (let i = 0; i < count; i++) {
    const a = ((i + offset) / count) * Math.PI * 2
    out += `M${P(cx + r0 * Math.cos(a))} ${P(cy + r0 * Math.sin(a))}L${P(cx + r2 * Math.cos(a))} ${P(cy + r2 * Math.sin(a))}`
  }
  return out
}
function trefoils(cx, cy, r, count, rr) {
  const out = []
  for (let i = 0; i < count; i++) {
    const a = ((i + 0.5) / count) * Math.PI * 2
    out.push([P(cx + r * Math.cos(a)), P(cy + r * Math.sin(a)), rr])
  }
  return out
}

const ROSE = {
  rings: [44, 70, 96, 150, 196, 236, 242],
  petalsInner: petals(250, 250, 44, 96, 8, 0.75),
  petalsOuter: petals(250, 250, 96, 196, 16, 0.62),
  spokes: spokes(250, 250, 196, 236, 32, 0.5),
  roundels: trefoils(250, 250, 216, 16, 14),
}

// Two stacked SVGs (outer tracery, inner petals) turning in opposite
// directions. Reduced motion is handled in CSS, so the markup never varies.
export function RoseWindow({ className = '' }) {
  const svg = 'absolute inset-0 w-full h-full'
  return (
    <div className={`rose relative ${className}`} aria-hidden="true">
      <svg viewBox="0 0 500 500" className={`rose-spin ${svg}`} fill="none" stroke="currentColor" strokeLinecap="round">
        {ROSE.rings.map((r, i) => (
          <circle key={r} className="ln" pathLength="1" cx="250" cy="250" r={r} strokeWidth={i === 6 ? 1.4 : 0.9} style={d(i, 140)} />
        ))}
        <path className="ln" pathLength="1" d={ROSE.petalsOuter} strokeWidth="0.9" style={d(3, 160)} />
        <path className="ln" pathLength="1" d={ROSE.spokes} strokeWidth="0.8" style={d(5, 160)} />
        {ROSE.roundels.map(([x, y, r], i) => (
          <circle key={i} className="ln" pathLength="1" cx={x} cy={y} r={r} strokeWidth="0.8" style={d(i, 60, 900)} />
        ))}
      </svg>
      <svg viewBox="0 0 500 500" className={`rose-spin-rev ${svg}`} fill="none" stroke="currentColor" strokeLinecap="round">
        <path className="ln" pathLength="1" d={ROSE.petalsInner} strokeWidth="1" style={d(2, 160)} />
        <path className="ln" pathLength="1" d="M250 214v72M214 250h72" strokeWidth="1.4" style={d(8, 160)} />
      </svg>
    </div>
  )
}

/** Gold dust drifting up through the light. Fixed positions, no JS per frame. */
const MOTES = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  s: `${2 + (i % 3)}px`,
  t: `${16 + (i * 7) % 14}s`,
  d: `${-((i * 5.3) % 20)}s`,
  x: `${((i % 5) - 2) * 18}px`,
}))
export function Motes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {MOTES.map((m, i) => (
        <span key={i} className="mote" style={{ left: m.left, '--s': m.s, '--t': m.t, '--d': m.d, '--x': m.x }} />
      ))}
    </div>
  )
}

/** Shared dark hero for the inner pages. */
export function PageHero({ eyebrow, title, accent, sub, children }) {
  const roseRef = useRef(null)
  useParallax(roseRef, 0.18)
  return (
    <section className="relative overflow-hidden bg-navy-deep pt-40 pb-28 px-6 text-center">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 30%, #243a66 0%, #16244a 45%, #0E1830 100%)' }} />
      <div className="rays absolute inset-0" />
      <div ref={roseRef} className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <RoseWindow className="w-[640px] h-[640px] md:w-[820px] md:h-[820px] shrink-0 text-gold/[0.13]" />
      </div>
      <Motes />
      <div className="relative max-w-4xl mx-auto">
        <div className="fade-in"><Eyebrow light>{eyebrow}</Eyebrow></div>
        <h1 className="font-display font-semibold text-white text-5xl md:text-7xl leading-[1.02] mt-6">
          <RisingWords text={title} base={150} />
          {accent && (
            <>
              <br />
              <span className="italic font-medium"><RisingWords text={accent} base={150 + title.split(' ').length * 70} className="gilded" /></span>
            </>
          )}
        </h1>
        {sub && <p className="fade-in text-white/65 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mt-7" style={d(0, 0, 700)}>{sub}</p>}
        {children && <div className="fade-in mt-10" style={d(0, 0, 900)}>{children}</div>}
      </div>
    </section>
  )
}

export function GoldButton({ href, to, children, className = '', LinkComp, ...rest }) {
  const cls = `btn-gold inline-flex items-center justify-center gap-2 font-semibold px-8 py-4 rounded-full text-[15px] tracking-wide ${className}`
  if (to && LinkComp) return <LinkComp to={to} className={cls} {...rest}>{children}</LinkComp>
  return <a href={href} className={cls} {...rest}>{children}</a>
}

export function GhostButton({ href, to, children, className = '', light = true, LinkComp, ...rest }) {
  const cls = `btn-ghost inline-flex items-center justify-center gap-2 font-semibold px-8 py-4 rounded-full text-[15px] tracking-wide border ${
    light ? 'border-gold/40 text-white hover:bg-gold/10 hover:border-gold/70' : 'border-navy/20 text-navy hover:bg-navy/5 hover:border-navy/40'
  } ${className}`
  if (to && LinkComp) return <LinkComp to={to} className={cls} {...rest}>{children}</LinkComp>
  return <a href={href} className={cls} {...rest}>{children}</a>
}

export const Arrow = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 10h12M11 5l5 5-5 5" />
  </svg>
)
