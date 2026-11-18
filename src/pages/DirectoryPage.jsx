import TopBar from '../components/shared/TopBar'
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { MagnifyingGlassIcon, MapPinIcon, ListBulletIcon, MapIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth.jsx'
import { toast } from '../components/shared/Toast'
import { useParishSearch, useNearbyParishes, useFollowedParishes, invalidateFollowedParishesCache, haversineMiles } from '../hooks/useParish.js'
import { supabase } from '../lib/supabase'
import ParishCard from '../components/parish/ParishCard'
import DirectoryDiscoveryBanner from '../components/parish/DirectoryDiscoveryBanner'
import NearbyEventSuggestions from '../components/parish/NearbyEventSuggestions'
import { useTranslation } from 'react-i18next'
import { CHURCHES, TRADITIONS, churchesForFilter, churchLabel, traditionLabel } from '../data/churches'

const ParishMap = lazy(() => import('../components/parish/ParishMap'))

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','D.C.'],['FL','Florida'],
  ['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],
  ['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],
  ['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],
  ['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],
  ['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],
  ['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],
  ['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],
  ['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

export default function DirectoryPage() {
  const { t } = useTranslation('parish')
  useEffect(() => { document.title = `${t('parish.directory_title')} | inFold` }, [t])

  const { user, profile } = useAuth()
  const { results, hasMore, loading: searchLoading, search, clear } = useParishSearch()
  const { parishes: followedParishes, loading: followedLoading } = useFollowedParishes()

  const [query, setQuery] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [riteFilter, setRiteFilter] = useState('') // '' | 'eastern' | tradition id | church id
  const churchFilter = useMemo(() => churchesForFilter(riteFilter), [riteFilter])
  const [viewMode, setViewMode] = useState('list') // 'list' | 'map'
  const [selectedParish, setSelectedParish] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [followStates, setFollowStates] = useState({}) // parishId → { isFollowing, loading }
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [mapOrgs, setMapOrgs] = useState([])

  const { parishes: nearbyParishes, loading: nearbyLoading } = useNearbyParishes(userLocation, 50, churchFilter)

  const [geocodedLocation, setGeocodedLocation] = useState(null)
  const [geoParishes, setGeoParishes] = useState([])
  const [geoLoading, setGeoLoading] = useState(false)

  // Geocode the City/ZIP field whenever it changes (debounced)
  useEffect(() => {
    const trimmed = cityQuery.trim()
    if (trimmed.length < 2) {
      setGeocodedLocation(null)
      setGeoParishes([])
      return
    }
    const timer = setTimeout(async () => {
      const q = stateFilter ? `${trimmed}, ${stateFilter}, USA` : `${trimmed}, USA`
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=us`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'inFold/1.0' } }
        )
        const json = await res.json()
        if (json?.[0]) {
          setGeocodedLocation({ lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) })
        } else {
          setGeocodedLocation(null)
          setGeoParishes([])
        }
      } catch {
        setGeocodedLocation(null)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [cityQuery, stateFilter])

  // Bounding-box parish search from geocoded city/zip location
  useEffect(() => {
    if (!geocodedLocation) { setGeoParishes([]); return }
    setGeoLoading(true)
    const { lat, lng } = geocodedLocation
    const radiusMiles = 25
    const dLat = radiusMiles / 69.0
    const dLng = radiusMiles / (69.0 * Math.cos((lat * Math.PI) / 180))
    let cancelled = false
    let geoQuery = supabase
      .from('parishes')
      .select('id, name, diocese, city, state, zip, address, phone, website, email, latitude, longitude, is_official, mass_times, data_source, data_quality, created_at, church')
      .gte('latitude', lat - dLat)
      .lte('latitude', lat + dLat)
      .gte('longitude', lng - dLng)
      .lte('longitude', lng + dLng)
    if (churchFilter) geoQuery = geoQuery.in('church', churchFilter)
    geoQuery
      .limit(200)
      .then(({ data }) => {
        if (cancelled) return
        const sorted = (data ?? [])
          .map(p => ({ ...p, distance: haversineMiles(lat, lng, p.latitude, p.longitude) }))
          .filter(p => p.distance < radiusMiles)
          .sort((a, b) => a.distance - b.distance)
        setGeoParishes(sorted)
        setGeoLoading(false)
      })
    return () => { cancelled = true }
  }, [geocodedLocation?.lat, geocodedLocation?.lng, churchFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side filter geo results by name query
  const filteredGeoParishes = useMemo(() => {
    const name = query.trim().toLowerCase()
    if (!name || name.length < 2) return geoParishes
    return geoParishes.filter(p =>
      p.name?.toLowerCase().includes(name) ||
      p.diocese?.toLowerCase().includes(name)
    )
  }, [geoParishes, query])

  // Compute nearby orgs sorted by distance whenever location or orgs change
  const nearbyOrgs = useMemo(() => {
    if (!userLocation || !mapOrgs.length) return []
    return mapOrgs
      .filter(o => o.latitude && o.longitude)
      .map(o => ({
        ...o,
        distance: haversineMiles(userLocation.lat, userLocation.lng, o.latitude, o.longitude),
      }))
      .filter(o => o.distance < 50)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8)
  }, [userLocation, mapOrgs])

  // Initialize follow states from profile + followedParishes
  useEffect(() => {
    if (!followedParishes.length) return
    const states = {}
    followedParishes.forEach((p) => {
      states[p.id] = { isFollowing: true, loading: false }
    })
    setFollowStates((prev) => ({ ...states, ...prev }))
  }, [followedParishes])

  // Fetch organizations that have been geocoded
  useEffect(() => {
    supabase
      .from('organizations')
      .select('id, name, city, state, org_type, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .then(({ data }) => {
        if (data) setMapOrgs(data)
      })
  }, [])

  // Search when any filter changes
  useEffect(() => {
    const hasName = query.trim().length >= 2
    const hasCity = cityQuery.trim().length >= 2
    const hasState = !!stateFilter
    if (hasName || hasCity || hasState || churchFilter) {
      search(query, userLocation, stateFilter, cityQuery, churchFilter)
    } else {
      clear()
    }
  }, [query, cityQuery, stateFilter, churchFilter, userLocation, search, clear])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t('parish.geo_unsupported', 'Geolocation is not supported by your browser.'))
      return
    }
    setLocationLoading(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude })
        setLocationLoading(false)
        if (query.trim().length < 2) setViewMode('map')
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? t('parish.location_denied')
            : t('parish.location_error')
        )
        setLocationLoading(false)
      },
      { timeout: 10000 }
    )
  }, [query, t])

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
        const { error } = await supabase
          .from('parish_follows')
          .delete()
          .eq('parish_id', parishId)
          .eq('user_id', user.id)
        if (error) {
          toast.error(t('parish.unfollow_failed', 'Could not unfollow parish. Please try again.'))
          setFollowStates((prev) => ({ ...prev, [parishId]: current }))
        } else {
          invalidateFollowedParishesCache()
          setFollowStates((prev) => ({ ...prev, [parishId]: { isFollowing: false, loading: false } }))
        }
      } else {
        const { error } = await supabase
          .from('parish_follows')
          .insert({ parish_id: parishId, user_id: user.id })
        if (error) {
          toast.error(t('parish.follow_failed', 'Could not follow parish. Please try again.'))
          setFollowStates((prev) => ({ ...prev, [parishId]: current }))
        } else {
          invalidateFollowedParishesCache()
          setFollowStates((prev) => ({ ...prev, [parishId]: { isFollowing: true, loading: false } }))
        }
      }
    },
    [user, followStates, t]
  )

  const clearQuery = () => {
    setQuery('')
    setCityQuery('')
    setStateFilter('')
    setRiteFilter('')
    clear()
  }

  const isSearching = query.trim().length >= 2 || cityQuery.trim().length >= 2 || !!stateFilter || !!churchFilter

  // For map: search results when searching, else nearby or followed
  const mapParishes = isSearching ? results : userLocation ? nearbyParishes : followedParishes

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-3xl mx-auto pb-24 md:pb-8">

        {/* ── Header ── */}
        <TopBar variant="navy" title={t('parish.directory_title')} />
        <div className="bg-navy px-4 pt-1 pb-5">

          {/* Search bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('parish.search_short', 'Search by name or diocese...')}
              className="w-full bg-white pl-10 pr-10 py-3 rounded-xl text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            {query && (
              <button aria-label={t('parish.clear_search', 'Clear search')}
                onClick={clearQuery}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 p-1"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* City / ZIP + State row */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="relative">
              <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder={t('parish.city_zip', 'City or ZIP')}
                aria-label={t('parish.filter_city', 'Filter by city or ZIP code')}
                className="w-full bg-white/90 pl-9 pr-3 py-2.5 rounded-xl text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                aria-label={t('parish.filter_state', 'Filter by state')}
                className="w-full bg-white/90 pl-9 pr-2 py-2.5 rounded-xl text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold appearance-none cursor-pointer"
              >
                <option value="">{t('parish.all_states', 'All states')}</option>
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Church / rite filter — the 23 Eastern Catholic Churches and the Latin Church */}
          <div className="relative mt-2">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <select
              value={riteFilter}
              onChange={(e) => setRiteFilter(e.target.value)}
              aria-label={t('parish.filter_rite', 'Filter by church or rite')}
              className="w-full bg-white/90 pl-9 pr-2 py-2.5 rounded-xl text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold appearance-none cursor-pointer"
            >
              <option value="">{t('parish.all_rites', 'All rites')}</option>
              <option value="latin">{churchLabel(t, 'latin')}</option>
              <option value="eastern">{t('parish.all_eastern', 'All Eastern Catholic')}</option>
              {TRADITIONS.filter((tr) => tr.id !== 'latin').map((tr) => {
                const members = CHURCHES.filter((c) => c.tradition === tr.id)
                return (
                  <optgroup key={tr.id} label={traditionLabel(t, tr.id)}>
                    {members.length > 1 && (
                      <option value={tr.id}>{t('parish.all_tradition', 'All {{tradition}}', { tradition: traditionLabel(t, tr.id) })}</option>
                    )}
                    {members.map((c) => (
                      <option key={c.id} value={c.id}>{churchLabel(t, c.id)}</option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={requestLocation}
              disabled={locationLoading}
              aria-label={locationLoading ? t('parish.finding_location', 'Finding your location') : userLocation ? t('parish.location_enabled', 'Location enabled') : t('parish.use_location', 'Use my location')}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-full transition-colors disabled:opacity-60"
            >
              <MapPinIcon className="w-4 h-4" />
              {locationLoading ? t('parish.finding_you', 'Finding you…') : userLocation ? t('parish.location_on') : t('parish.near_me')}
            </button>

            <div className="flex bg-white/10 rounded-full p-0.5 ml-auto">
              <button
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={`tap-target flex items-center gap-1 text-sm font-semibold px-3.5 min-h-[36px] rounded-full transition-colors ${
                  viewMode === 'list' ? 'bg-white text-navy' : 'text-white hover:bg-white/10'
                }`}
              >
                <ListBulletIcon className="w-3.5 h-3.5" />
                {t('parish.list_view')}
              </button>
              <button
                onClick={() => setViewMode('map')}
                aria-pressed={viewMode === 'map'}
                className={`tap-target flex items-center gap-1 text-sm font-semibold px-3.5 min-h-[36px] rounded-full transition-colors ${
                  viewMode === 'map' ? 'bg-white text-navy' : 'text-white hover:bg-white/10'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                {t('parish.map_view')}
              </button>
            </div>
          </div>

          {locationError && (
            <p className="text-red-300 text-xs mt-2">{locationError}</p>
          )}
        </div>

        {/* ── Map view ── */}
        {viewMode === 'map' && (
          <div className="relative h-72 md:h-96 bg-lightbg">
            <Suspense fallback={<div className="w-full h-full bg-lightbg animate-pulse" />}>
              <ParishMap
                parishes={mapParishes}
                organizations={mapOrgs}
                selectedId={selectedParish?.id}
                onSelect={(p) => {
                  setSelectedParish(p)
                  setSelectedOrg(null)
                }}
                selectedOrgId={selectedOrg?.id}
                onSelectOrg={(o) => {
                  setSelectedOrg(o)
                  setSelectedParish(null)
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
                      ? t('parish.following')
                      : t('parish.follow_short', 'Follow')}
                  </button>
                  <button aria-label={t('common:actions.close')}
                    onClick={() => setSelectedParish(null)}
                    className="text-gray-500 hover:text-gray-600 p-1"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Selected org mini-card */}
            {selectedOrg && (
              <div className="absolute bottom-3 left-3 right-3 bg-white rounded-xl shadow-lg p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-navy text-sm leading-snug truncate">
                    {selectedOrg.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {selectedOrg.org_type?.replace('_', ' ')}
                    {selectedOrg.city ? ` · ${selectedOrg.city}, ${selectedOrg.state}` : ''}
                  </p>
                </div>
                <button aria-label={t('common:actions.close')}
                  onClick={() => setSelectedOrg(null)}
                  className="text-gray-500 hover:text-gray-600 p-1 flex-shrink-0"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="px-4 pt-4 space-y-6">

          {/* ── Discovery banner (shown to users following < 3 parishes) ── */}
          {user && (
            <DirectoryDiscoveryBanner followedCount={followedParishes.length} />
          )}

          {/* ── Your parishes ── */}
          {!isSearching && !followedLoading && followedParishes.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                {t('parish.your_parishes')}
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

          {/* ── Nearest parishes + orgs (always shown when location available) ── */}
          {userLocation && (
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                {t('parish.near_you', 'Near you')}
              </h2>

              {nearbyLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
                  ))}
                </div>
              ) : (
                <>
                  {nearbyParishes.length === 0 && nearbyOrgs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                      <MapPinIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-navy font-semibold text-sm">{t('parish.no_results_nearby', 'No results nearby')}</p>
                      <p className="text-gray-500 text-xs mt-1">{t('parish.no_nearby_body')}</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {nearbyParishes.map((parish) => (
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
                      {nearbyOrgs.map((org) => (
                        <a
                          key={org.id}
                          href={`/organization/${org.id}`}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow block"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-navy font-bold text-sm">{org.name[0]}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-navy text-sm truncate">{org.name}</p>
                              <p className="text-xs text-gray-500 capitalize mt-0.5">
                                {org.org_type?.replace(/_/g, ' ')}
                                {org.city ? ` · ${org.city}, ${org.state}` : ''}
                              </p>
                              {org.distance != null && (
                                <p className="text-xs text-gold font-semibold mt-0.5">
                                  {org.distance < 1 ? '< 1 mi' : `${org.distance.toFixed(1)} mi`}
                                </p>
                              )}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* ── Search results ── */}
          {isSearching && (
            <section>
              {/* Geo-based results when city/zip was entered and geocoded */}
              {geocodedLocation ? (
                <>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    {t('parish.parishes_near', 'Parishes near {{place}}', { place: cityQuery.trim() })}
                    {filteredGeoParishes.length > 0 && ` (${filteredGeoParishes.length})`}
                  </h2>
                  {geoLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
                      ))}
                    </div>
                  ) : filteredGeoParishes.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                      <MapPinIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-navy font-semibold text-sm">{t('parish.no_nearby')}</p>
                      <p className="text-gray-500 text-xs mt-1">{t('parish.try_city', 'Try a different city or zip code')}</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredGeoParishes.map((parish) => (
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
                </>
              ) : (
                /* Text-based results (name/diocese/state search, no city geocoding) */
                <>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    {stateFilter && !query
                      ? t('parish.state_parishes', '{{state}} parishes', { state: US_STATES.find(([c]) => c === stateFilter)?.[1] ?? stateFilter })
                      : t('parish.search_results', 'Search results')}
                    {results.length > 0 && (hasMore ? ` (first ${results.length})` : ` (${results.length})`)}
                  </h2>
                  {searchLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
                      ))}
                    </div>
                  ) : results.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                      <MapPinIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-navy font-semibold text-sm">{t('parish.no_results')}</p>
                      <p className="text-gray-500 text-xs mt-1">{t('parish.no_results_body')}</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {results.map((parish) => (
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
                      {hasMore && (
                        <p className="sm:col-span-2 text-center text-xs text-gray-500 py-2">
                          {t('parish.more_match', 'More parishes match — add a city, zip code or state to narrow the list.')}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* ── Discover prompt (no location) ── */}
          {!userLocation && (
            <section>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <div className="w-14 h-14 bg-lightbg rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <MapPinIcon className="w-7 h-7 text-navy" />
                </div>
                <h3 className="font-bold text-navy mb-1">{t('parish.discover_title')}</h3>
                <p className="text-gray-500 text-sm mb-4">
                  {t('parish.discover_body')}
                </p>
                <button
                  onClick={requestLocation}
                  disabled={locationLoading}
                  className="inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-60"
                >
                  <MapPinIcon className="w-4 h-4" />
                  {locationLoading ? t('parish.finding_you', 'Finding you…') : t('parish.find_near_me')}
                </button>
              </div>
            </section>
          )}

          {/* ── Nearby event suggestions (only when location is available) ── */}
          {user && userLocation && (
            <NearbyEventSuggestions userLocation={userLocation} />
          )}

        </div>
      </div>
    </div>
  )
}
