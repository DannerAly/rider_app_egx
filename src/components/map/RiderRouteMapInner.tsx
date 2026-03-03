'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Loader2, Navigation, Clock, Ruler, MapPin } from 'lucide-react'

export interface RoutePoint {
  lat:         number
  lng:         number
  heading:     number | null
  speed_kmh:   number | null
  recorded_at: string
}

interface Props {
  riderId:      string
  initialDate:  string
  initialPoints: RoutePoint[]
}

// ── Haversine entre dos puntos (km) ──────────────────────────────────────────
function haversine(a: RoutePoint, b: RoutePoint): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2
          + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180)
          * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function totalDistance(points: RoutePoint[]): number {
  let d = 0
  for (let i = 1; i < points.length; i++) d += haversine(points[i - 1], points[i])
  return d
}

function duration(points: RoutePoint[]): string {
  if (points.length < 2) return '—'
  const ms = new Date(points.at(-1)!.recorded_at).getTime()
             - new Date(points[0].recorded_at).getTime()
  const m = Math.floor(ms / 60000)
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

function fmt(ts: string) {
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

// ── Ajusta el mapa a los bounds de la ruta ───────────────────────────────────
function FitBounds({ points }: { points: RoutePoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [points, map])
  return null
}

// ── Marcadores inicio / fin ───────────────────────────────────────────────────
function EndpointMarker({ point, color, label }: { point: RoutePoint; color: string; label: string }) {
  const map = useMap()
  useEffect(() => {
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;border-radius:50%;
        background:${color};border:3px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
      "></div>`,
      iconSize:   [14, 14],
      iconAnchor: [7, 7],
    })
    const marker = L.marker([point.lat, point.lng], { icon })
      .bindTooltip(`${label} · ${fmt(point.recorded_at)}`, { permanent: false })
      .addTo(map)
    return () => { marker.remove() }
  }, [point, color, label, map])
  return null
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function RiderRouteMapInner({ riderId, initialDate, initialPoints }: Props) {
  const [date,    setDate]    = useState(initialDate)
  const [points,  setPoints]  = useState<RoutePoint[]>(initialPoints)
  const [loading, setLoading] = useState(false)

  const fetchRoute = useCallback(async (d: string) => {
    setLoading(true)
    const res  = await fetch(`/api/riders/${riderId}/route?date=${d}`)
    const json = await res.json()
    setPoints(json.points ?? [])
    setLoading(false)
  }, [riderId])

  const handleDateChange = (d: string) => {
    setDate(d)
    fetchRoute(d)
  }

  const today = new Date().toISOString().slice(0, 10)
  const dist  = totalDistance(points)
  const dur   = duration(points)
  const positions: [number, number][] = points.map(p => [p.lat, p.lng])

  return (
    <div className="flex flex-col h-full">

      {/* ── Barra superior: fecha + stats ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-white border-b border-zinc-100">

        {/* Selector de fecha */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-500">Fecha</label>
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => handleDateChange(e.target.value)}
            className="border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm text-zinc-800 focus:outline-none focus:border-blue-500"
          />
          {date !== today && (
            <button
              onClick={() => handleDateChange(today)}
              className="text-xs text-blue-600 hover:underline"
            >
              Hoy
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 text-sm text-zinc-600 flex-wrap">
          <Stat icon={<MapPin className="w-3.5 h-3.5" />}  label="Puntos GPS"  value={loading ? '…' : String(points.length)} />
          <Stat icon={<Ruler className="w-3.5 h-3.5" />}   label="Distancia"   value={loading ? '…' : points.length > 1 ? `${dist.toFixed(1)} km` : '—'} />
          <Stat icon={<Clock className="w-3.5 h-3.5" />}   label="Duración"    value={loading ? '…' : dur} />
          {points.length > 0 && (
            <Stat icon={<Navigation className="w-3.5 h-3.5" />} label="Inicio" value={fmt(points[0].recorded_at)} />
          )}
        </div>

        {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500 ml-auto" />}
      </div>

      {/* ── Mapa ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapContainer
          center={[-17.7863, -63.1812]}
          zoom={13}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {positions.length > 1 && (
            <>
              <Polyline
                positions={positions}
                pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
              />
              <FitBounds points={points} />
              <EndpointMarker point={points[0]}       color="#16a34a" label="Inicio" />
              <EndpointMarker point={points.at(-1)!}  color="#dc2626" label="Último punto" />
            </>
          )}
        </MapContainer>

        {/* Empty state overlay */}
        {!loading && points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm pointer-events-none z-[1000]">
            <div className="text-center">
              <Navigation className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-zinc-500 font-medium text-sm">Sin actividad este día</p>
              <p className="text-zinc-400 text-xs mt-1">El rider no registró ubicación</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Leyenda ──────────────────────────────────────────────────────── */}
      {points.length > 1 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-zinc-50 border-t border-zinc-100 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Inicio
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Último punto
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-blue-600 inline-block" /> Recorrido
          </span>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-zinc-400">{icon}</span>
      <span className="text-zinc-400">{label}:</span>
      <span className="font-semibold text-zinc-700">{value}</span>
    </div>
  )
}
