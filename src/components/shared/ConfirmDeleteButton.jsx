import { useState } from 'react'
import Modal from './Modal'

// An icon/text button that asks before running an irreversible delete.
export default function ConfirmDeleteButton({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  className = '',
  children,
  'aria-label': ariaLabel = 'Delete',
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button type="button" aria-label={ariaLabel} onClick={() => setOpen(true)} className={`tap-target ${className}`}>
        {children}
      </button>
      <Modal isOpen={open} onClose={() => !busy && setOpen(false)} title={title} size="sm">
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => setOpen(false)} disabled={busy}
            className="flex-1 min-h-[44px] border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={busy}
            className="flex-1 min-h-[44px] bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </Modal>
    </>
  )
}
