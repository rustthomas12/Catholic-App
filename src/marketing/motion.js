import { useEffect } from 'react'

// Animation helpers for the marketing site (components live in ui.jsx).

export const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// One shared observer for every Reveal on the page
let observer
const callbacks = new WeakMap()
export function observe(el, cb) {
  if (typeof IntersectionObserver === 'undefined') { cb(); return () => {} }
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { callbacks.get(e.target)?.(); observer.unobserve(e.target); callbacks.delete(e.target) }
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 })
  }
  callbacks.set(el, cb)
  observer.observe(el)
  return () => { observer.unobserve(el); callbacks.delete(el) }
}

/** Stagger helper: style={d(i)} sets the --d delay used by the CSS. */
export const d = (i, step = 90, base = 0) => ({ '--d': `${base + i * step}ms` })

/** Gold radial glow that follows the pointer inside a card (.card-glow). */
export function glowHandlers() {
  return {
    onPointerMove: (e) => {
      const r = e.currentTarget.getBoundingClientRect()
      e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
      e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
    },
  }
}

/** Moves an element at a fraction of the scroll speed (rAF, transform only). */
export function useParallax(ref, factor = 0.25) {
  useEffect(() => {
    const el = ref.current
    if (!el || reduceMotion()) return
    let raf = 0
    const tick = () => {
      raf = 0
      const y = window.scrollY
      if (y < window.innerHeight * 1.5) el.style.transform = `translate3d(0, ${y * factor}px, 0)`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [ref, factor])
}

