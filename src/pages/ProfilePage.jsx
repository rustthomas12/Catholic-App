import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { BuildingLibraryIcon, PencilIcon, ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import Avatar from '../components/shared/Avatar'
import Badge from '../components/shared/Badge'
import Button from '../components/shared/Button'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import Feed from '../components/feed/Feed'
import { format } from 'date-fns'


function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-32 bg-gray-200 rounded-b-2xl" />
      <div className="px-4 -mt-10 pb-4">
        <div className="w-20 h-20 bg-gray-300 rounded-full mb-3" />
        <div className="h-5 bg-gray-200 rounded w-40 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-28 mb-4" />
        <div className="h-16 bg-gray-200 rounded-xl mb-4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl mb-3" />
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { id } = useParams()
  const { user, profile: currentProfile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [parish, setParish] = useState(null)
  const [postCount, setPostCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Determine whose profile to show
  const targetId = id || user?.id

  useEffect(() => {
    // Wait for auth to finish before deciding what to load.
    // On own-profile route (/profile with no id param), targetId = user?.id
    // which starts undefined if the stored user hasn't resolved yet.
    if (authLoading) return

    if (!targetId) {
      // Auth is done and we still have no targetId — not logged in
      setNotFound(true)
      setLoading(false)
      return
    }

    document.title = 'Profile | Communio'
    setLoading(true)

    async function load() {
      try {
        const { data: p, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .single()

        if (error || !p) { setNotFound(true); return }

        setProfile(p)
        document.title = `${p.full_name || 'Profile'} | Communio`

        // Load parish and post count in parallel
        const [parRes, countRes] = await Promise.all([
          p.parish_id
            ? supabase.from('parishes').select('id, name, city, state, diocese').eq('id', p.parish_id).single()
            : Promise.resolve({ data: null }),
          supabase.from('posts').select('id', { count: 'exact', head: true })
            .eq('author_id', targetId).is('deleted_at', null).eq('is_removed', false),
        ])

        setParish(parRes.data || null)
        setPostCount(countRes.count || 0)
      } catch (err) {
        console.error('[ProfilePage] load error:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [targetId, authLoading])

  const isOwnProfile = user?.id === targetId

  if (loading) return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto pb-20">
        <ProfileSkeleton />
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4 px-4 md:pl-60">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      </div>
      <h1 className="text-lg font-bold text-navy">Profile not found</h1>
      <p className="text-gray-500 text-sm text-center">This user does not exist or has been removed.</p>
      <Button variant="secondary" onClick={() => navigate(-1)}>
        <ArrowLeftIcon className="w-4 h-4" /> Go back
      </Button>
    </div>
  )

  if (profile?.deleted_at) return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-3 px-4 md:pl-60">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      </div>
      <p className="text-navy font-semibold">[Account removed]</p>
      <p className="text-gray-500 text-sm">This account is no longer available.</p>
    </div>
  )

  const vocLabels = { single: 'Single', married: 'Married', religious: 'Religious', ordained: 'Ordained' }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-2xl mx-auto pb-24">

        {/* Header */}
        <div className="relative">
          {/* Back button (mobile) */}
          <button onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-10 w-9 h-9 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm md:hidden">
            <ArrowLeftIcon className="w-5 h-5 text-navy" />
          </button>

          {/* Edit + Settings buttons */}
          {isOwnProfile && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <Link to="/settings"
                className="flex items-center justify-center w-9 h-9 bg-white/90 backdrop-blur text-navy rounded-full shadow-sm hover:bg-white transition-colors md:hidden"
                aria-label="Settings">
                <Cog6ToothIcon className="w-5 h-5" />
              </Link>
              <Link to="/settings/profile"
                className="flex items-center gap-1.5 bg-white/90 backdrop-blur text-navy text-sm font-medium px-3 py-1.5 rounded-full shadow-sm hover:bg-white transition-colors">
                <PencilIcon className="w-4 h-4" />
                Edit
              </Link>
            </div>
          )}

          {/* Banner gradient */}
          <div className="h-28 bg-gradient-to-b from-navy to-navy/60 rounded-b-none" />

          {/* Avatar + info */}
          <div className="px-4 -mt-10 pb-4">
            <Avatar
              src={profile.avatar_url}
              name={profile.full_name}
              size="xl"
              isVerifiedClergy={profile.is_verified_clergy}
              isPremium={profile.is_premium}
              isPatron={profile.is_patron}
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {profile.is_verified_clergy && <Badge variant="clergy" />}
              {profile.is_patron && <Badge variant="patron" />}
              {profile.is_premium && !profile.is_patron && <Badge variant="premium" />}
            </div>

            <h1 className="text-xl font-bold text-navy mt-1">{profile.full_name || 'Parish Member'}</h1>

            {parish && (
              <Link to={`/parish/${parish.id}`} className="flex items-center gap-1 mt-1 text-sm text-navy hover:underline">
                <BuildingLibraryIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{parish.name}</span>
              </Link>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-1">
              {profile.vocation_state && (
                <span className="text-sm text-gray-500">{vocLabels[profile.vocation_state]}</span>
              )}
              <span className="text-sm text-gray-400">
                Member since {format(new Date(profile.created_at), 'MMMM yyyy')}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 flex flex-col gap-4">
          {/* Bio */}
          {profile.bio ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-navy text-sm leading-relaxed">{profile.bio}</p>
            </div>
          ) : isOwnProfile ? (
            <Link to="/settings/profile"
              className="block bg-white rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400 hover:border-navy hover:text-navy transition-colors">
              + Add a bio
            </Link>
          ) : null}

          {/* Stats row */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-3 divide-x divide-gray-100">
            <div className="text-center px-2">
              <p className="text-lg font-bold text-navy">{postCount}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </div>
            <div className="text-center px-2">
              <p className="text-xs font-semibold text-navy truncate px-1">{parish?.name || '—'}</p>
              <p className="text-xs text-gray-500">Parish</p>
            </div>
            <div className="text-center px-2">
              <p className="text-xs font-semibold text-navy">{format(new Date(profile.created_at), 'MMM yyyy')}</p>
              <p className="text-xs text-gray-500">Since</p>
            </div>
          </div>

          {/* Posts feed */}
          <div className="-mx-4">
            <h2 className="text-base font-bold text-navy px-4 mb-3">Posts</h2>
            <Feed
              userId={targetId}
              showCreatePost={false}
              emptyMessage={
                isOwnProfile
                  ? 'Share your first post'
                  : `${profile.full_name?.split(' ')[0] || 'They'} hasn't posted yet`
              }
              emptySubtext={
                isOwnProfile
                  ? 'Share a thought, reflection, or prayer with your community'
                  : ''
              }
              emptyAction={
                isOwnProfile
                  ? { label: 'Create a post', onClick: () => navigate('/') }
                  : null
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
