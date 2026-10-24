import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog behaviour for any overlay: Escape closes, Tab stays inside, the
 * page behind doesn't scroll, focus moves in on open and back to whatever
 * opened it on close. Attach the returned ref to the panel and give the
 * panel role="dialog", aria-modal and a label.
 */
export function useDialog(isOpen, onClose, { initialFocus = 'panel' } = {}) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e) {
      if (e.key === 'Escape') { onCloseRef.current?.(); return }
      if (e.key !== 'Tab' || !ref.current) return
      const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const opener = document.activeElement
    // Let a field with autoFocus keep focus; otherwise focus the panel
    if (initialFocus === 'panel' && !ref.current?.contains(document.activeElement)) ref.current?.focus()
    return () => { if (opener && document.contains(opener)) opener.focus() }
  }, [isOpen, initialFocus])

  return ref
}
