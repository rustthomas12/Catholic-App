import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { BuildingOffice2Icon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'

// /join/:inviteCode — resolves the invite, joins the org, redirects to org page

export default function JoinPage() {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [status, setStatus] = useState('loading') // loading | success | error | already_member
  const [org, setOrg] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    document.title = 'Join Organization | Communio'
  }, [])

  useEffect(() => {
    if (!inviteCode) { setStatus('error'); setErrorMsg('Invalid invite link.'); return }

    // Resolve the invite code
    supabase
      .from('organization_invites')
      .select('id, org_id, max_uses, use_count, expires_at, organizations(id, name, slug, category, city, state)')
      .eq('invite_code', inviteCode.toUpperCase())
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setStatus('error')
          setErrorMsg('This invite link is invalid or has expired.')
          return
        }

        // Check expiry
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setStatus('error')
          setErrorMsg('This invite link has expired.')
          return
        }

        // Check max uses
        if (data.max_uses !== null && data.use_count >= data.max_uses) {
          setStatus('error')
          setErrorMsg('This invite link has reached its maximum number of uses.')
          return
        }

        setOrg(data.organizations)

        // If not logged in, store invite code and redirect to login
        if (!user) {
          sessionStorage.setItem('pendingInviteCode', inviteCode.toUpperCase())
          navigate(`/login?redirect=/join/${inviteCode}`, { replace: true })
          return
        }

        // Check if already a member
        const { data: existing } = await supabase
          .from('organization_members')
          .select('id')
          .eq('org_id', data.org_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (existing) {
          setStatus('already_member')
          return
        }

        // Join the org
        const [joinRes, _] = await Promise.all([
          supabase.from('organization_members').insert({ org_id: data.org_id, user_id: user.id }),
          supabase.from('organization_invites').update({ use_count: data.use_count + 1 }).eq('id', data.id),
        ])

        if (joinRes.error) {
          setStatus('error')
          setErrorMsg('Could not join organization. Please try again.')
        } else {
          setStatus('success')
          // Auto-redirect after a moment
          setTimeout(() => navigate(`/organization/${data.org_id}`, { replace: true }), 2000)
        }
      })
  }, [inviteCode, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">

        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <BuildingOffice2Icon className="w-8 h-8 text-navy/30" />
            </div>
            <p className="font-bold text-navy text-lg mb-1">Checking invite…</p>
            <p className="text-gray-400 text-sm">Just a moment.</p>
          </>
        )}

        {status === 'success' && org && (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-9 h-9 text-green-500" />
            </div>
            <p className="font-bold text-navy text-lg mb-1">You joined!</p>
            <p className="text-gray-500 text-sm mb-4">
              Welcome to <span className="font-semibold text-navy">{org.name}</span>.
            </p>
            <p className="text-gray-400 text-xs">Redirecting you now…</p>
            <Link
              to={`/organization/${org.id}`}
              className="mt-4 inline-block text-sm font-semibold text-navy hover:underline"
            >
              Go to organization →
            </Link>
          </>
        )}

        {status === 'already_member' && org && (
          <>
            <div className="w-16 h-16 bg-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BuildingOffice2Icon className="w-8 h-8 text-navy" />
            </div>
            <p className="font-bold text-navy text-lg mb-1">Already a member</p>
            <p className="text-gray-500 text-sm mb-4">
              You are already a member of <span className="font-semibold text-navy">{org.name}</span>.
            </p>
            <Link
              to={`/organization/${org.id}`}
              className="inline-block bg-navy text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-navy/90 transition-colors"
            >
              Go to organization
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircleIcon className="w-9 h-9 text-red-400" />
            </div>
            <p className="font-bold text-navy text-lg mb-1">Invite not valid</p>
            <p className="text-gray-500 text-sm mb-4">{errorMsg}</p>
            <Link
              to="/organizations"
              className="inline-block text-sm font-semibold text-navy hover:underline"
            >
              Browse organizations
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
