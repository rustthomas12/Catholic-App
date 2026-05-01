import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'

const DEFAULT_CENTER = [39.5, -98.35] // geographic center of the contiguous US
const DEFAULT_ZOOM = 4

// Cross icon for parishes (navy / gold when active)
function makeParishIcon(active) {
  const bg = active ? '#C9A84C' : '#1B2A4A'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="13" fill="${bg}" stroke="white" stroke-width="2.5"/>
      <path d="M12.5 7h3v4.5H20v3h-4.5V21h-3v-6.5H8v-3h4.5z" fill="white"/>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

// Building icon for organizations
function makeOrgIcon(active) {
  const bg = active ? '#C9A84C' : '#4B6A8F'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="14" fill="${bg}" stroke="white" stroke-width="2.5"/>
      <path d="M8 22V12l7-4 7 4v10H8zm5-2h4v-4h-4v4zm-3-6h10l-5-2.9L10 14z" fill="white"/>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  })
}

// ── Parish cluster layer ───────────────────────────────────
function ClusteredMarkerLayer({ parishes, selectedId, onSelect }) {
  const map = useMap()
  const clusterRef = useRef(null)
  const markersRef = useRef(new Map())

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction(cluster) {
        const count = cluster.getChildCount()
        return L.divIcon({
          html: `<div style="
            background:#1B2A4A;border:2.5px solid white;border-radius:50%;
            width:36px;height:36px;display:flex;align-items:center;justify-content:center;
            color:white;font-size:12px;font-weight:700;
          ">${count}</div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })
      },
    })
    map.addLayer(clusterGroup)
    clusterRef.current = clusterGroup

    return () => {
      map.removeLayer(clusterGroup)
      clusterRef.current = null
      markersRef.current.clear()
    }
  }, [map])

  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return

    const newIds = new Set(parishes.map(p => p.id))

    markersRef.current.forEach((marker, id) => {
      if (!newIds.has(id)) {
        cluster.removeLayer(marker)
        markersRef.current.delete(id)
      }
    })

    parishes.forEach(parish => {
      if (!parish.latitude || !parish.longitude) return
      if (markersRef.current.has(parish.id)) return

      const marker = L.marker([parish.latitude, parish.longitude], {
        icon: makeParishIcon(parish.id === selectedId),
        zIndexOffset: parish.id === selectedId ? 1000 : 0,
      }).on('click', () => onSelect?.(parish))

      cluster.addLayer(marker)
      markersRef.current.set(parish.id, marker)
    })

    const positioned = parishes.filter(p => p.latitude && p.longitude)
    if (positioned.length > 1) {
      const bounds = L.latLngBounds(positioned.map(p => [p.latitude, p.longitude]))
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true })
    } else if (positioned.length === 1) {
      map.flyTo([positioned[0].latitude, positioned[0].longitude], 13, { animate: true, duration: 0.6 })
    }
  }, [parishes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const isActive = id === selectedId
      marker.setIcon(makeParishIcon(isActive))
      marker.setZIndexOffset(isActive ? 1000 : 0)
    })
  }, [selectedId])

  return null
}

// ── Organization marker layer (non-clustered, typically few) ──
function OrgMarkerLayer({ organizations, selectedId, onSelect }) {
  const map = useMap()
  const markersRef = useRef(new Map())

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => map.removeLayer(m))
      markersRef.current.clear()
    }
  }, [map])

  // Sync markers when orgs list changes
  useEffect(() => {
    const newIds = new Set(organizations.map(o => o.id))

    markersRef.current.forEach((marker, id) => {
      if (!newIds.has(id)) {
        map.removeLayer(marker)
        markersRef.current.delete(id)
      }
    })

    organizations.forEach(org => {
      if (!org.latitude || !org.longitude) return
      if (markersRef.current.has(org.id)) return

      const marker = L.marker([org.latitude, org.longitude], {
        icon: makeOrgIcon(org.id === selectedId),
        zIndexOffset: 500,
      }).on('click', () => onSelect?.(org))

      marker.addTo(map)
      markersRef.current.set(org.id, marker)
    })
  }, [organizations]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update icons when selection changes
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      marker.setIcon(makeOrgIcon(id === selectedId))
      marker.setZIndexOffset(id === selectedId ? 1000 : 500)
    })
  }, [selectedId])

  return null
}

// ── Map component ──────────────────────────────────────────
export default function ParishMap({
  parishes = [],
  organizations = [],
  selectedId,
  onSelect,
  selectedOrgId,
  onSelectOrg,
  userLocation,
}) {
  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : DEFAULT_CENTER
  const zoom = userLocation ? 10 : DEFAULT_ZOOM

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <ClusteredMarkerLayer
        parishes={parishes}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <OrgMarkerLayer
        organizations={organizations}
        selectedId={selectedOrgId}
        onSelect={onSelectOrg}
      />
    </MapContainer>
  )
}
