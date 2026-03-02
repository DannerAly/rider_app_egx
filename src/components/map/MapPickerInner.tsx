'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search, Loader2, X, MapPin, Check } from 'lucide-react'

export interface PickedLocation {
  lat:     number
  lng:     number
  address: string
}

interface Props {
  label:         string
  defaultCenter?: [number, number]
  onConfirm:     (loc: PickedLocation) => void
  onClose:       () => void
}

// ── Icono pin personalizado ────────────────────────────────────────────────
const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:32px; height:32px;
    border-radius:50% 50% 50% 0;
    background:#2563eb;
    border:3px solid white;
    box-shadow:0 2px 10px rgba(37,99,235,0.5);
    transform:rotate(-45deg);
  "></div>`,
  iconSize:   [32, 32],
  iconAnchor: [16, 32],
  popupAnchor:[0, -32],
})

// ── Escucha clicks en el mapa ──────────────────────────────────────────────
function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onClick(e.latlng.lat, e.latlng.lng) })
  return null
}

// ── Centra el mapa programáticamente ──────────────────────────────────────
function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 17, { animate: true, duration: 0.8 })
  }, [target, map])
  return null
}

// ── Reverse geocoding (coordenadas → dirección) ────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
      { headers: { 'Accept-Language': 'es' } }
    )
    const data = await res.json()
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

// ── Forward geocoding (dirección → coordenadas) ───────────────────────────
async function forwardGeocode(query: string): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Santa Cruz, Bolivia')}&format=json&limit=1&countrycodes=bo`,
      { headers: { 'Accept-Language': 'es' } }
    )
    const data = await res.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name }
  } catch { /* silencioso */ }
  return null
}

// ── Componente principal ──────────────────────────────────────────────────
export default function MapPickerInner({ label, defaultCenter = [-17.7863, -63.1812], onConfirm, onClose }: Props) {
  const [marker,      setMarker]      = useState<[number, number] | null>(null)
  const [address,     setAddress]     = useState<string>('')
  const [flyTarget,   setFlyTarget]   = useState<[number, number] | null>(null)
  const [searching,   setSearching]   = useState(false)
  const [geocoding,   setGeocoding]   = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const markerRef = useRef<L.Marker>(null)

  const placeMarker = useCallback(async (lat: number, lng: number) => {
    setMarker([lat, lng])
    setGeocoding(true)
    const addr = await reverseGeocode(lat, lng)
    setAddress(addr)
    setGeocoding(false)
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    const result = await forwardGeocode(searchQuery)
    setSearching(false)
    if (result) {
      setMarker([result.lat, result.lng])
      setAddress(result.display)
      setFlyTarget([result.lat, result.lng])
    }
  }

  const handleDragEnd = useCallback(async () => {
    const m = markerRef.current
    if (!m) return
    const { lat, lng } = m.getLatLng()
    setMarker([lat, lng])
    setGeocoding(true)
    const addr = await reverseGeocode(lat, lng)
    setAddress(addr)
    setGeocoding(false)
  }, [])

  const handleConfirm = () => {
    if (!marker || !address) return
    onConfirm({ lat: marker[0], lng: marker[1], address })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" style={{ height: '90vh', maxHeight: '680px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="text-zinc-900 font-semibold text-sm">{label}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buscador */}
        <div className="px-4 py-3 border-b border-zinc-100 flex-shrink-0">
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar dirección en Santa Cruz..."
              className="flex-1 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium transition-colors"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-zinc-400 text-xs mt-2">
            O haz clic en el mapa para colocar el pin · Arrastra el pin para ajustar
          </p>
        </div>

        {/* Mapa */}
        <div className="flex-1 relative">
          <MapContainer
            center={defaultCenter}
            zoom={14}
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onClick={placeMarker} />
            <FlyTo target={flyTarget} />
            {marker && (
              <Marker
                ref={markerRef}
                position={marker}
                icon={pinIcon}
                draggable
                eventHandlers={{ dragend: handleDragEnd }}
              />
            )}
          </MapContainer>

          {/* Hint inicial */}
          {!marker && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-zinc-900/80 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full pointer-events-none">
              Toca el mapa para colocar el pin
            </div>
          )}
        </div>

        {/* Footer con dirección + confirmar */}
        <div className="px-4 py-4 border-t border-zinc-100 flex-shrink-0 bg-white">
          {marker ? (
            <>
              <div className="flex items-start gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 flex-shrink-0" />
                <p className="text-zinc-700 text-sm leading-snug">
                  {geocoding ? (
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Obteniendo dirección...
                    </span>
                  ) : address}
                </p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={geocoding || !address}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4" />
                Confirmar ubicación
              </button>
            </>
          ) : (
            <p className="text-center text-zinc-400 text-sm py-1">
              Selecciona una ubicación en el mapa
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
