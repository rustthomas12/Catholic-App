import { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react'
import { MagnifyingGlassIcon, MapPinIcon, ListBulletIcon, MapIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { useParishSearch, useNearbyParishes, useFollowedParishes } from '../hooks/useParish.js'
import { supabase } from '../lib/supabase'
import ParishCard from '../components/parish/ParishCard'

const ParishMap = lazy(() => import('../components/parish/ParishMap'))

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

export default function DirectoryPage() {
  document.title = 'Parish Directory | Parish App'

  const { user, profile } = useAuth()
  const { results, loading: searchLoading, search, clear } = useParishSearch()
  const { parishes: followedParishes, loading: followedLoading } = useFollowedParishes()

  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'map'
  const [selectedParish, setSelectedParish] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [followStates, setFollowStates] = useState({}) // parishId → { isFollowing, loading }

  const { parishes: nearbyParishes, loading: nearbyLoading } = useNearbyParishes(userLocation)

  // Initialize follow states from profile + followedParishes
  useEffect(() => {
    if (!followedParishes.length) return
    const states = {}
    followedParishes.forEach((p) => {
      states[p.id] = { isFollowing: true, loading: false }
    })
    setFollowStates((prev) => ({ ...states, ...prev }))
  }, [followedParishes])

  // Search when query changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      search(query, userLocation)
    } else {
      clear()
    }
  }, [query, userLocation, search, clear])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }
    setLocationLoading(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude })
        setLocationLoading(false)
        if (query.trim().length < 2) setViewMode(TOKEN ? 'map' : 'list')
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? 'Location permission denied. Please enable location access.'
            : 'Could not get your location. Please try again.'
        )
        setLocationLoading(false)
      },
      { timeout: 10000 }
    )
  }, [query])

  const handleFollow = useCallback(
    async (parishId) => {
      if (!user) return
      const current = followStates[parishId] ?? { isFollowing: false, loading: false }
      if (current.loading) return

      setFollowStates((prev) => ({
        ...prev,
        [parishId]: { ...current, loading: true },
      }))

      if (current.isFollowing) {
        await supabase
          .from('parish_follows')
          .delete()
          .eq('parish_id', parishId)
          .eq('user_id', user.id)
        setFollowStates((prev) => ({
          ...prev,
          [parishId]: { isFollowing: false, loading: false },
        }))
      } else {
        await supabase
          .from('parish_follows')
          .insert({ parish_id: parishId, user_id: user.id })
        setFollowStates((prev) => ({
          ...prev,
          [parishId]: { isFollowing: true, loading: false },
        }))
      }
    },
    [user, followStates]
  )

  const clearQuery = () => {
    setQuery('')
    clear()
  }

  // Determine which parishes to show
  const isSearching = query.trim().length >= 2
  const displayParishes = isSearching
    ? results
    : userLocation
    ? nearbyParishes
    : null

  const listLoading = isSearching ? searchLoading : userLocation ? nearbyLoading : false

  // For map: combine displayed + selected
  const mapParishes = displayParishes ?? followedParishes

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-3xl mx-auto pb-24 md:pb-8">

        {/* ── Header ── */}
        <div className="bg-navy px-4 pt-6 pb-5 md:pt-8">
          <h1 className="text-white font-bold text-xl mb-4">Parish Directory</h1>

          {/* Search bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, city, diocese, or zip..."
              className="w-full bg-white pl-10 pr-10 py-3 rounded-xl text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            {query && (
              <button
                onClick={clearQuery}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={requestLocation}
              disabled={locationLoading}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-full transition-colors disabled:opacity-60"
            >
              <MapPinIcon className="w-4 h-4" />
              {locationLoading ? 'Finding you…' : userLocation ? 'Location on' : 'Near me'}
            </button>

            {TOKEN && (
              <div className="flex bg-white/10 rounded-full p-0.5 ml-auto">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    viewMode === 'list' ? 'bg-white text-navy' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <ListBulletIcon className="w-3.5 h-3.5" />
                  List
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    viewMode === 'map' ? 'bg-white text-navy' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  Map
                </button>
              </div>
            )}
          </div>

          {locationError && (
            <p className="text-red-300 text-xs mt-2">{locationError}</p>
          )}
        </div>

        {/* ── Map view ── */}
        {viewMode === 'map' && TOKEN && (
          <div className="relative h-72 md:h-96 bg-lightbg">
            <Suspense fallback={<div className="w-full h-full bg-lightbg animate-pulse" />}>
              <ParishMap
                parishes={mapParishes}
                selectedId={selectedParish?.id}
                onSelect={(p) => {
                  setSelectedParish(p)
                  setViewMode('map')
                }}
                userLocation={userLocation}
              />
            </Suspense>

            {/* Selected parish mini-card */}
            {selectedParish && (
              <div className="absolute bottom-3 left-3 right-3 bg-white rounded-xl shadow-lg p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-navy text-sm leading-snug truncate">
                    {selectedParish.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedParish.city}, {selectedParish.state}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleFollow(selectedParish.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                      (followStates[selectedParish.id]?.isFollowing || profile?.parish_id === selectedParish.id)
                        ? 'bg-navy/10 text-navy'
                        : 'bg-navy text-white hover:bg-navy/90'
                    }`}
                  >
                    {followStates[selectedParish.id]?.isFollowing || profile?.parish_id === selectedParish.id
                      ? 'Following'
                      : 'Follow'}
                  </button>
                  <button
                    onClick={() => setSelectedParish(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-4 pt-4 space-y-6">

          {/* ── Your parishes ── */}
          {!isSearching && !followedLoading && followedParishes.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Your parishes
              </h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {followedParishes.map((parish) => (
                  <ParishCard
                    key={parish.id}
                    parish={parish}
                    variant="compact"
                    isFollowing
                    isMyParish={profile?.parish_id === parish.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Search results / Nearby ── */}
          {(isSearching || userLocation) && (
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                {isSearching
                  ? `Search results${results.length ? ` (${results.length})` : ''}`
                  : 'Near you'}
              </h2>

              {listLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
                  ))}
                </div>
              ) : displayParishes && displayParishes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <MapPinIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-navy font-semibold text-sm">
                    {isSearching ? 'No parishes found' : 'No parishes found nearby'}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {isSearching
                      ? 'Try a different name, city, or zip code'
                      : 'Try searching by name or zip code instead'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(displayParishes ?? []).map((parish) => (
                    <ParishCard
                      key={parish.id}
                      parish={parish}
                      isFollowing={
                        followStates[parish.id]?.isFollowing ??
                        followedParishes.some((f) => f.id === parish.id)
                      }
                      isMyParish={profile?.parish_id === parish.id}
                      onFollow={() => handleFollow(parish.id)}
                      followLoading={followStates[parish.id]?.loading ?? false}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Discover prompt (no search, no location) ── */}
          {!isSearching && !userLocation && (
            <section>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <div className="w-14 h-14 bg-lightbg rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <MapPinIcon className="w-7 h-7 text-navy" />
                </div>
                <h3 className="font-bold text-navy mb-1">Find your parish</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Search by name, city, or zip — or use your location to find parishes near you.
                </p>
                <button
                  onClick={requestLocation}
                  disabled={locationLoading}
                  className="inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-60"
                >
                  <MapPinIcon className="w-4 h-4" />
                  {locationLoading ? 'Finding you…' : 'Find parishes near me'}
                </button>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  )
}
