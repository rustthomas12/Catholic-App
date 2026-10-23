import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from './Toast'
import Modal from './Modal'
import LoadingSpinner from './LoadingSpinner'

const REPORT_REASONS = ['spam', 'hateful', 'misinformation', 'violates_values', 'other']

// Reason picker shared by every "Report" action. onSubmit(reason, notes)
// resolves to { error }.
export default function ReportModal({ isOpen, onClose, onSubmit, title }) {
  const { t } = useTranslation('feed')
  const [reason, setReason] = useState('spam')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    const { error } = await onSubmit(reason, notes)
    setLoading(false)
    if (!error) {
      toast.success(t('report.success'))
      setNotes('')
      onClose()
    } else {
      toast.error(error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || t('report.title')}>
      <fieldset className="space-y-3">
        <legend className="sr-only">{t('report.reason')}</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="flex items-center gap-3 cursor-pointer min-h-[44px]">
            <input
              type="radio"
              name="reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="accent-gold w-4 h-4 flex-shrink-0"
            />
            <span className="text-sm text-navy">{t(`report.${r}`)}</span>
          </label>
        ))}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('report.notes_placeholder')}
          aria-label={t('report.notes_placeholder')}
          maxLength={1000}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy resize-none h-20 focus:outline-none focus:ring-2 focus:ring-gold"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-navy text-white rounded-lg py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <LoadingSpinner size="sm" color="white" /> : null}
          {t('report.submit')}
        </button>
      </fieldset>
    </Modal>
  )
}
