import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Default center: geographic center of contiguous US
const DEFAULT_CENTER = [39.8283, -98.5795]
const DEFAULT_ZOOM = 4

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

// Inner component: syncs markers imperatively on the Leaflet map instance
function MarkerLayer({ parishes, selectedId, onSelect }) {
  const map = useMap()
  const markersRef = useRef(new Map()) // id → L.Marker

  useEffect(() => {
    // Remove stale markers
    const newIds = new Set(parishes.map(p => p.id))
    markersRef.current.forEach((marker, id) => {
      if (!newIds.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    })

    // Add new markers
    parishes.forEach(parish => {
      if (!parish.latitude || !parish.longitude) return
      const isActive = parish.id === selectedId

      if (markersRef.current.has(parish.id)) {
        // Update icon if active state changed
        markersRef.current.get(parish.id).setIcon(makeIcon(isActive))
        return
      }

      const marker = L.marker([parish.latitude, parish.longitude], {
        icon: makeIcon(isActive),
        zIndexOffset: isActive ? 1000 : 0,
      })
        .addTo(map)
        .on('click', () => onSelect?.(parish))

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

  // Update icon highlights when selection changes
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const isActive = id === selectedId
      marker.setIcon(makeIcon(isActive))
      marker.setZIndexOffset(isActive ? 1000 : 0)
    })
  }, [selectedId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current.clear()
    }
  }, [])

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
      <MarkerLayer
        parishes={parishes}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </MapContainer>
  )
}
