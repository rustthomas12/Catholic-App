import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'

// Default center: geographic center of Massachusetts
const DEFAULT_CENTER = [42.2, -71.5]
const DEFAULT_ZOOM = 8

// Custom cross marker icon (navy/gold)
function makeIcon(active) {
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

// Inner component: manages a MarkerClusterGroup imperatively
function ClusteredMarkerLayer({ parishes, selectedId, onSelect }) {
  const map = useMap()
  const clusterRef = useRef(null)
  const markersRef = useRef(new Map()) // id → L.Marker

  // Create cluster group once on mount
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

  // Sync markers when parishes list changes
  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return

    const newIds = new Set(parishes.map(p => p.id))

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!newIds.has(id)) {
        cluster.removeLayer(marker)
        markersRef.current.delete(id)
      }
    })

    // Add new markers
    parishes.forEach(parish => {
      if (!parish.latitude || !parish.longitude) return
      if (markersRef.current.has(parish.id)) return

      const isActive = parish.id === selectedId
      const marker = L.marker([parish.latitude, parish.longitude], {
        icon: makeIcon(isActive),
        zIndexOffset: isActive ? 1000 : 0,
      }).on('click', () => onSelect?.(parish))

      cluster.addLayer(marker)
      markersRef.current.set(parish.id, marker)
    })

    // Fit bounds
    const positioned = parishes.filter(p => p.latitude && p.longitude)
    if (positioned.length > 1) {
      const bounds = L.latLngBounds(positioned.map(p => [p.latitude, p.longitude]))
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true })
    } else if (positioned.length === 1) {
      map.flyTo([positioned[0].latitude, positioned[0].longitude], 13, { animate: true, duration: 0.6 })
    }
  }, [parishes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update icon highlights when selection changes (no re-render needed)
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const isActive = id === selectedId
      marker.setIcon(makeIcon(isActive))
      marker.setZIndexOffset(isActive ? 1000 : 0)
    })
  }, [selectedId])

  return null
}

export default function ParishMap({ parishes = [], selectedId, onSelect, userLocation }) {
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
    </MapContainer>
  )
}
