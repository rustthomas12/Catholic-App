import { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

// Full-width bottom sheet on phones, centered dialog from md up
const sizeMap = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-md',
  lg: 'md:max-w-lg',
  full: 'md:max-w-full',
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ isOpen, onClose, title, size = 'md', children }) {
  const dialogRef = useRef(null)

  // Escape closes; Tab stays inside the dialog
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Move focus into the dialog, and back to whatever opened it on close
  useEffect(() => {
    if (!isOpen) return
    const opener = document.activeElement
    dialogRef.current?.focus()
    return () => { if (opener && document.contains(opener)) opener.focus() }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'relative w-full bg-white outline-none',
          // Mobile: sheet from bottom
          'rounded-t-2xl md:rounded-xl',
          // Desktop: constrained width
          sizeMap[size] ?? sizeMap.md,
          'max-h-[90vh] overflow-y-auto overscroll-contain safe-bottom',
          'shadow-xl',
          // Animate
          'animate-[slideUp_0.2s_ease-out]',
        ].join(' ')}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-navy">{title}</h2>
            <button
              onClick={onClose}
              className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-gray-500 hover:text-navy hover:bg-lightbg transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-4">{children}</div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
