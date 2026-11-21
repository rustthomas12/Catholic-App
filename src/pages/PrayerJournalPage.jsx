import Modal from '../components/shared/Modal'
import { useEffect, useState } from 'react'
import TopBar from '../components/shared/TopBar'
import { PencilIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import { usePrayerJournal } from '../hooks/usePrayerJournal'
import { toast } from '../components/shared/Toast'
import { useTranslation } from 'react-i18next'

// Words, not emoji faces. Older entries saved a face; `old` maps it.
const MOODS = [
  { value: 'heavy',     old: '😔', label: 'Heavy',     es: 'Abatido' },
  { value: 'okay',      old: '😐', label: 'Okay',      es: 'Normal' },
  { value: 'peaceful',  old: '🙂', label: 'Peaceful',  es: 'En paz' },
  { value: 'joyful',    old: '😊', label: 'Joyful',    es: 'Alegre' },
  { value: 'prayerful', old: '🙏', label: 'Prayerful', es: 'En oración' },
]
const moodOf = (v) => MOODS.find(m => m.value === v || m.old === v)

export default function PrayerJournalPage() {
  const { t } = useTranslation()
  useEffect(() => { document.title = `${t('faith:journal.prayer_journal', 'Prayer Journal')} | inFold` }, [t])

  const { entries, otherDeviceCount, loading, createEntry, updateEntry, deleteEntry } = usePrayerJournal()

  const [composing, setComposing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mood, setMood] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  function openNew() {
    setEditingId(null)
    setTitle('')
    setContent('')
    setMood(null)
    setComposing(true)
  }

  function openEdit(entry) {
    setEditingId(entry.id)
    setTitle(entry.title || '')
    setContent(entry.content || '')
    setMood(entry.mood || null)
    setComposing(true)
  }

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    const saved = editingId
      ? await updateEntry(editingId, { title, content, mood })
      : await createEntry({ title, content, mood })
    setSaving(false)
    // Keep the editor open (and the text) if it didn't save
    if (!saved) { toast.error(t('faith:journal.could_not_save_your_entry_please', 'Could not save your entry. Please try again.')); return }
    setComposing(false)
  }

  async function handleDelete(id) {
    const ok = await deleteEntry(id)
    if (ok) toast.success(t('faith:journal.entry_deleted', 'Entry deleted'))
    else toast.error(t('faith:journal.could_not_delete_entry', 'Could not delete entry'))
    setDeleteConfirm(null)
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* Header */}
        <TopBar variant="navy" title={t('faith:journal.prayer_journal', 'Prayer Journal')} back="/faith" />
        <div className="bg-navy px-4 pb-6">
          <p className="text-white/75 text-sm ml-10">{t('faith:journal.your_private_space_for_reflection', 'Your private space for reflection')}</p>
        </div>

        <div className="px-4 pt-5 space-y-4">

          {/* Privacy notice */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-start gap-3">
            <ShieldCheckIcon className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('faith:journal.encryption_note', "Your journal is encrypted on this device before it's saved. Only this device can read it — not other members, not our team, not anyone with access to our servers. Entries can't be opened on your other devices, and if this device is lost or the app is removed, they can't be recovered.")}
            </p>
          </div>

          {/* New entry button */}
          <button
            onClick={openNew}
            className="w-full py-3 bg-gold text-navy font-bold rounded-xl hover:bg-gold/90 transition-colors"
          >
            + New Entry
          </button>

          {/* Compose / Edit form */}
          {composing && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('faith:journal.title_optional', 'Title (optional)')}
                maxLength={100}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={t('faith:journal.write_your_reflection', 'Write your reflection…')}
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy"
              />
              <div>
                <p className="text-xs text-gray-500 mb-2">{t('faith:journal.mood', 'Mood')}</p>
                <div className="flex gap-2 flex-wrap">
                  {MOODS.map(m => {
                    const on = moodOf(mood)?.value === m.value
                    return (
                      <button
                        key={m.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setMood(on ? null : m.value)}
                        className={`text-xs font-semibold px-3 min-h-[36px] rounded-full border transition-colors ${
                          on ? 'bg-gold/20 border-gold text-navy' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {t(`faith:journal.mood_${m.value}`, m.label)}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!content.trim() || saving}
                  className="flex-1 py-2.5 bg-navy text-white text-sm font-bold rounded-xl disabled:opacity-50 hover:bg-navy/90 transition-colors"
                >
                  {saving ? 'Saving…' : editingId ? t('faith:journal.save_changes', 'Save changes') : t('faith:journal.save_entry', 'Save entry')}
                </button>
                <button
                  onClick={() => setComposing(false)}
                  className="py-2.5 px-4 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {t('faith:journal.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Entries list */}
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-gray-100" />)}
            </div>
          ) : null}
          {!loading && otherDeviceCount > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-xs text-gray-500">
              {otherDeviceCount === 1
                ? '1 entry was written on another device and can only be read there.'
                : `${otherDeviceCount} entries were written on another device and can only be read there.`}
            </div>
          )}
          {loading ? null : entries.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              {t('faith:journal.no_entries_yet_start_by_writing', 'No entries yet. Start by writing your first reflection.')}
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      {entry.title && (
                        <p className="font-semibold text-navy text-sm truncate">{entry.title}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {format(parseISO(entry.created_at), 'MMMM d, yyyy · h:mm a')}
                        {moodOf(entry.mood) && <span className="ml-2 italic">{t(`faith:journal.mood_${moodOf(entry.mood).value}`, moodOf(entry.mood).label)}</span>}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button aria-label={t('faith:journal.edit', 'Edit')}
                        onClick={() => openEdit(entry)}
                        className="p-1.5 text-gray-500 hover:text-navy transition-colors rounded-lg hover:bg-gray-100"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button aria-label={t('faith:journal.delete', 'Delete')}
                        onClick={() => setDeleteConfirm(entry.id)}
                        className="p-1.5 text-gray-500 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{entry.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <Modal isOpen onClose={() => setDeleteConfirm(null)} title={t('faith:journal.delete_entry', 'Delete entry?')} size="sm">
          <p className="text-sm text-gray-500 mb-5">{t('faith:journal.this_cannot_be_undone', 'This cannot be undone.')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t('faith:journal.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                {t('faith:journal.delete', 'Delete')}
              </button>
            </div>
        </Modal>
      )}
    </div>
  )
}
