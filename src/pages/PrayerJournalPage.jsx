import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, PencilIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import { usePrayerJournal } from '../hooks/usePrayerJournal'
import { toast } from '../components/shared/Toast'

const MOODS = ['😔', '😐', '🙂', '😊', '🙏']

export default function PrayerJournalPage() {
  useEffect(() => { document.title = 'Prayer Journal | Communio' }, [])

  const navigate = useNavigate()
  const { entries, loading, createEntry, updateEntry, deleteEntry } = usePrayerJournal()

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
    if (editingId) {
      await updateEntry(editingId, { title, content, mood })
    } else {
      await createEntry({ title, content, mood })
    }
    setSaving(false)
    setComposing(false)
  }

  async function handleDelete(id) {
    const ok = await deleteEntry(id)
    if (ok) toast.success('Entry deleted')
    else toast.error('Could not delete entry')
    setDeleteConfirm(null)
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* Header */}
        <div className="bg-navy px-4 pt-5 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate('/faith')} className="text-white/70 hover:text-white p-1 transition-colors">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-white font-bold text-xl">Prayer Journal</h1>
          </div>
          <p className="text-gray-300 text-sm ml-8">Your private space for reflection</p>
        </div>

        <div className="px-4 pt-5 space-y-4">

          {/* Privacy notice */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-start gap-3">
            <ShieldCheckIcon className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              🔒 Your journal entries are private. They are never visible to other users or our team.
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
                placeholder="Title (optional)"
                maxLength={100}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write your reflection…"
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy"
              />
              <div>
                <p className="text-xs text-gray-400 mb-2">Mood</p>
                <div className="flex gap-3">
                  {MOODS.map(m => (
                    <button
                      key={m}
                      onClick={() => setMood(mood === m ? null : m)}
                      className={`text-xl w-9 h-9 rounded-full transition-colors ${
                        mood === m ? 'bg-gold/20 ring-2 ring-gold' : 'hover:bg-gray-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!content.trim() || saving}
                  className="flex-1 py-2.5 bg-navy text-white text-sm font-bold rounded-xl disabled:opacity-50 hover:bg-navy/90 transition-colors"
                >
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save entry'}
                </button>
                <button
                  onClick={() => setComposing(false)}
                  className="py-2.5 px-4 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Entries list */}
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-gray-100" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No entries yet. Start by writing your first reflection.
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
                      <p className="text-xs text-gray-400">
                        {format(parseISO(entry.created_at), 'MMMM d, yyyy · h:mm a')}
                        {entry.mood && <span className="ml-2">{entry.mood}</span>}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(entry)}
                        className="p-1.5 text-gray-400 hover:text-navy transition-colors rounded-lg hover:bg-gray-100"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(entry.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="font-bold text-navy text-base mb-2">Delete entry?</p>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
