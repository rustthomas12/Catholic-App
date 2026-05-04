import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid, HeartIcon } from '@heroicons/react/24/solid'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'

const STATUS_LABELS = {
  active:   { label: 'Praying',  color: 'bg-blue-100 text-blue-700' },
  prayed:   { label: 'Prayed',   color: 'bg-green-100 text-green-700' },
  answered: { label: 'Answered', color: 'bg-gold/20 text-amber-700' },
}

export default function PrivateIntentionsPage() {
  useEffect(() => { document.title = 'Prayer Intentions | Communio' }, [])

  const navigate = useNavigate()
  const { user } = useAuth()

  const [intentions, setIntentions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('active')

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('private_prayer_intentions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setIntentions(data ?? [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const { error } = await supabase.from('private_prayer_intentions').insert({
      user_id: user.id,
      title: title.trim(),
      notes: notes.trim() || null,
      status: 'active',
    })
    if (error) {
      toast.error('Could not save intention.')
    } else {
      setTitle('')
      setNotes('')
      setShowAdd(false)
      setFilter('active')
      await load()
    }
    setSaving(false)
  }

  async function handleStatus(id, status) {
    await supabase
      .from('private_prayer_intentions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
    setIntentions(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  async function handleDelete(id) {
    await supabase
      .from('private_prayer_intentions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    setIntentions(prev => prev.filter(i => i.id !== id))
    toast.success('Intention removed')
  }

  const filtered = filter === 'all'
    ? intentions
    : intentions.filter(i => i.status === filter)

  const counts = {
    active:   intentions.filter(i => i.status === 'active').length,
    prayed:   intentions.filter(i => i.status === 'prayed').length,
    answered: intentions.filter(i => i.status === 'answered').length,
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* Header */}
        <div className="bg-navy px-4 pt-5 pb-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white p-1 transition-colors">
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <p className="text-gold text-xs font-semibold uppercase tracking-widest">Private</p>
                <h1 className="text-white font-bold text-xl">Prayer Intentions</h1>
              </div>
            </div>
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-1.5 bg-gold text-navy text-xs font-bold px-3 py-2 rounded-xl hover:bg-gold/90 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add
            </button>
          </div>
          <p className="text-white/40 text-xs ml-8 mt-1">
            Completely private — only you can see this list.
          </p>
        </div>

        <div className="px-4 pt-5 space-y-4">

          {/* Add intention form */}
          {showAdd && (
            <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-navy text-sm">New Intention</p>
                <button type="button" onClick={() => setShowAdd(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Person or intention *</label>
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. John's recovery, my mother's faith, peace in the family..."
                  maxLength={120}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any details or context..."
                  rows={2}
                  maxLength={500}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="w-full bg-navy text-white font-bold py-3 rounded-xl hover:bg-navy/90 disabled:opacity-50 transition-colors text-sm"
              >
                {saving ? 'Saving…' : 'Add Intention'}
              </button>
            </form>
          )}

          {/* Stats row */}
          {intentions.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'active',   label: 'Praying',  icon: '🙏' },
                { key: 'prayed',   label: 'Prayed',   icon: '✓' },
                { key: 'answered', label: 'Answered', icon: '✦' },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setFilter(s.key)}
                  className={`rounded-2xl border p-3 text-center transition-colors ${
                    filter === s.key ? 'bg-navy border-navy' : 'bg-white border-gray-100 hover:bg-lightbg'
                  }`}
                >
                  <p className="text-lg mb-0.5">{s.icon}</p>
                  <p className={`text-xl font-black ${filter === s.key ? 'text-white' : 'text-navy'}`}>
                    {counts[s.key]}
                  </p>
                  <p className={`text-xs ${filter === s.key ? 'text-white/60' : 'text-gray-400'}`}>{s.label}</p>
                </button>
              ))}
            </div>
          )}

          {/* Filter row (show all) */}
          {intentions.length > 0 && (
            <div className="flex gap-2">
              {['active','prayed','answered','all'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    filter === f ? 'bg-navy text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-lightbg'
                  }`}
                >
                  {f === 'all' ? 'All' : STATUS_LABELS[f].label}
                </button>
              ))}
            </div>
          )}

          {/* Intentions list */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14">
              <HeartIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-navy text-sm mb-1">
                {intentions.length === 0 ? 'No intentions yet' : `No ${STATUS_LABELS[filter]?.label.toLowerCase()} intentions`}
              </p>
              <p className="text-gray-400 text-xs max-w-xs mx-auto">
                {intentions.length === 0
                  ? 'Add the people and intentions you are carrying to God in prayer.'
                  : 'Try switching the filter above.'}
              </p>
              {intentions.length === 0 && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-4 text-sm font-semibold text-navy hover:text-gold transition-colors"
                >
                  + Add your first intention
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(intention => (
                <IntentionCard
                  key={intention.id}
                  intention={intention}
                  onStatus={handleStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Privacy notice */}
          <div className="flex items-start gap-2 px-1">
            <span className="text-gray-300 text-lg mt-0.5">🔒</span>
            <p className="text-gray-400 text-xs leading-relaxed">
              Your prayer intentions are completely private. They are stored securely and never visible to other users, parish admins, or anyone else.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

function IntentionCard({ intention, onStatus, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const s = STATUS_LABELS[intention.status]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-semibold text-navy text-sm truncate">{intention.title}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.color}`}>
              {s.label}
            </span>
          </div>
          {intention.notes && (
            <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{intention.notes}</p>
          )}
          <p className="text-gray-300 text-xs mt-1">
            Added {format(parseISO(intention.created_at), 'MMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Quick status buttons */}
          {intention.status !== 'prayed' && intention.status !== 'answered' && (
            <button
              onClick={() => onStatus(intention.id, 'prayed')}
              title="Mark as prayed"
              className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors"
            >
              <CheckCircleIcon className="w-4 h-4" />
            </button>
          )}
          {intention.status !== 'answered' && (
            <button
              onClick={() => onStatus(intention.id, 'answered')}
              title="Mark as answered"
              className="w-8 h-8 rounded-xl bg-gold/10 text-amber-600 flex items-center justify-center hover:bg-gold/20 transition-colors"
            >
              <CheckCircleSolid className="w-4 h-4" />
            </button>
          )}
          {intention.status !== 'active' && (
            <button
              onClick={() => onStatus(intention.id, 'active')}
              title="Move back to praying"
              className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
              >
              <span className="text-xs font-bold">🙏</span>
            </button>
          )}
          <button
            onClick={() => onDelete(intention.id)}
            title="Remove intention"
            className="w-8 h-8 rounded-xl bg-gray-50 text-gray-300 flex items-center justify-center hover:bg-red-50 hover:text-red-400 transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
