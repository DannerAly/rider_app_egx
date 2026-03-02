'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'

// ─── Tipos ───────────────────────────────────────────────────────────────────
type RiderStatus = 'offline' | 'available' | 'busy' | 'on_break'

interface RiderOnMap {
  id:                   string
  current_lat:          number
  current_lng:          number
  status:               RiderStatus
  last_location_update: string | null
  profiles: {
    full_name: string | null
  } | null
  vehicle_type: string
}

// ─── Colores por estado ───────────────────────────────────────────────────────
const STATUS_COLOR: Record<RiderStatus, string> = {
  available: '#22c55e',   // verde
  busy:      '#eab308',   // amarillo
  on_break:  '#f97316',   // naranja
  offline:   '#71717a',   // gris
}

const STATUS_LABEL: Record<RiderStatus, string> = {
  available: 'Disponible',
  busy:      'En pedido',
  on_break:  'En descanso',
  offline:   'Desconectado',
}

// ─── Marcador SVG custom (sin imágenes externas) ──────────────────────────────
function riderIcon(status: RiderStatus) {
  const color = STATUS_COLOR[status] ?? '#71717a'
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 16px; height: 16px;
        border-radius: 50%;
        background: ${color};
        border: 2.5px solid white;
        box-shadow: 0 1px 6px rgba(0,0,0,0.35);
      "></div>`,
    iconSize:   [16, 16],
    iconAnchor: [8, 8],
  })
}

// ─── Leyenda ─────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-xl shadow-md border border-zinc-100 px-4 py-3 flex flex-col gap-1.5">
      {(Object.entries(STATUS_COLOR) as [RiderStatus, string][]).map(([status, color]) => (
        <div key={status} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full border-2 border-white shadow-sm flex-shrink-0"
            style={{ background: color }}
          />
          <span className="text-xs text-zinc-600 font-medium">{STATUS_LABEL[status]}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface LiveMapProps {
  /** Centro inicial del mapa [lat, lng] */
  center?: [number, number]
  zoom?:   number
}

export default function LiveMap({ center = [4.711, -74.0721], zoom = 12 }: LiveMapProps) {
  const [riders, setRiders] = useState<RiderOnMap[]>([])
  const supabase = createClient()

  // Carga inicial
  useEffect(() => {
    async function fetchRiders() {
      const { data } = await supabase
        .from('riders')
        .select('id, current_lat, current_lng, status, last_location_update, vehicle_type, profiles(full_name)')
        .not('current_lat', 'is', null)
        .not('current_lng', 'is', null)

      if (data) setRiders(data as unknown as RiderOnMap[])
    }
    fetchRiders()
  }, [])

  // Suscripción Realtime — actualiza posición de cada rider en vivo
  useEffect(() => {
    const channel = supabase
      .channel('riders-live-map')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'riders' },
        (payload) => {
          const updated = payload.new as Partial<RiderOnMap> & { id: string }

          setRiders(prev => {
            const exists = prev.find(r => r.id === updated.id)

            // Si tiene ubicación y ya estaba en el mapa → actualizar
            if (exists) {
              return prev.map(r =>
                r.id === updated.id ? { ...r, ...updated } : r
              )
            }

            // Si es nuevo con ubicación → agregar
            if (updated.current_lat && updated.current_lng) {
              return [...prev, updated as RiderOnMap]
            }

            return prev
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {riders.map(rider => (
          <Marker
            key={rider.id}
            position={[rider.current_lat, rider.current_lng]}
            icon={riderIcon(rider.status)}
          >
            <Popup>
              <div className="text-sm leading-relaxed min-w-[140px]">
                <p className="font-semibold text-zinc-900">
                  {rider.profiles?.full_name ?? 'Sin nombre'}
                </p>
                <p className="text-zinc-500 capitalize">{rider.vehicle_type}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: STATUS_COLOR[rider.status] }}
                  />
                  <span className="text-zinc-600">{STATUS_LABEL[rider.status]}</span>
                </div>
                {rider.last_location_update && (
                  <p className="text-zinc-400 text-xs mt-1">
                    Última actualización:{' '}
                    {new Date(rider.last_location_update).toLocaleTimeString('es', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <Legend />

      {/* Contador de riders */}
      <div className="absolute top-3 right-3 z-[1000] bg-white rounded-lg shadow border border-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700">
        {riders.length} rider{riders.length !== 1 ? 's' : ''} en mapa
      </div>
    </div>
  )
}
