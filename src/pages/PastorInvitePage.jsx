import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { BuildingLibraryIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { invalidateMyMemberships } from '../lib/myMemberships'
import LoadingSpinner from '../components/shared/LoadingSpinner'

// /pastor-invite/:token: a staff member set up the parish and named this
// person as pastor (migration 096). Accepting gives provisional access; the
// inFold team still verifies before announcements and notifications unlock.

const CLOSED = {
  accepted:  'This invite has already been accepted.',
  expired:   'This invite has expired. Ask your parish staff to contact us at info@getinfold.app.',
  withdrawn: 'This invite is no longer active.',
}

export default function PastorInvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState(undefined) // undefined = loading, null = not found
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { document.title = 'Parish Invite | inFold' }, [])

  // Not a uuid: don't ask the database
  const validToken = /^[0-9a-f-]{36}$/i.test(token || '')

  useEffect(() => {
    if (!validToken) return
    supabase.rpc('pastor_invite_info', { p_token: token })
      .then(({ data, error: err }) => setInfo(err ? null : (data?.[0] ?? null)))
  }, [token, validToken])

  async function accept() {
    setBusy(true)
    setError('')
    const { data: parishId, error: err } = await supabase.rpc('accept_pastor_invite', { p_token: token })
    if (err) {
      setError(err.code === 'P0001' ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
      return
    }
    invalidateMyMemberships()
    navigate(`/parish-admin/${parishId}`, { replace: true })
  }

  if (validToken && info === undefined) return <LoadingSpinner fullPage />

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mx-auto mb-5">
          <BuildingLibraryIcon className="w-8 h-8 text-gold" />
        </div>

        {!validToken || !info ? (
          <>
            <h1 className="text-xl font-black text-navy mb-2">Invite not found</h1>
            <p className="text-gray-500 text-sm mb-6">This link isn't valid. Check that you opened the whole link from the email.</p>
            <Link to="/" className="block w-full bg-navy text-white font-bold py-3 rounded-2xl">Go to inFold</Link>
          </>
        ) : info.status !== 'open' ? (
          <>
            <h1 className="text-xl font-black text-navy mb-2">{info.parish_name}</h1>
            <p className="text-gray-500 text-sm mb-6">{CLOSED[info.status]}</p>
            <Link to={`/parish/${info.parish_id}`} className="block w-full bg-navy text-white font-bold py-3 rounded-2xl">View the parish page</Link>
          </>
        ) : (
          <>
            <p className="text-gold text-xs font-bold tracking-widest uppercase mb-1">You're invited</p>
            <h1 className="text-xl font-black text-navy mb-1">{info.parish_name}</h1>
            <p className="text-gray-500 text-xs mb-4">{[info.city, info.state].filter(Boolean).join(', ')}</p>
            <p className="text-gray-600 text-sm leading-relaxed mb-5">
              {info.invited_by || 'Your parish staff'} set up your parish on inFold and named
              {info.pastor_name ? ` ${info.pastor_name}` : ' you'} as pastor. Accept to manage the parish page with them.
            </p>
            <div className="bg-lightbg rounded-xl px-4 py-3 text-left text-xs text-gray-600 leading-relaxed mb-5">
              Our team confirms every parish before announcements and notifications go out, usually
              within 1–2 business days. You can set up Mass times and parish details right away.
            </div>
            {error && <p role="alert" className="text-sm text-red-600 mb-3">{error}</p>}
            <button onClick={accept} disabled={busy}
              className="w-full bg-navy text-white font-bold py-3.5 rounded-2xl hover:bg-navy/90 disabled:opacity-60 transition-colors">
              {busy ? 'Accepting…' : 'Accept and open the dashboard'}
            </button>
            <Link to="/" className="block text-sm text-gray-500 hover:text-navy py-3">Not now</Link>
          </>
        )}
      </div>
    </div>
  )
}
