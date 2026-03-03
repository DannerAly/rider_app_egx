'use client'

import { useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface OrderMapProps {
  pickupLat:     number
  pickupLng:     number
  deliveryLat:   number
  deliveryLng:   number
  riderLat?:     number | null
  riderLng?:     number | null
  deliveryLabel?: string   // 'TÚ' en tracking, vacío en admin
}

// ── Pin clásico de gota (sin letra) ──────────────────────────────────────────
function dropPin(color: string, shadow: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:26px; height:26px;
        border-radius:50% 50% 50% 0;
        background:${color};
        border:3px solid white;
        box-shadow:0 3px 10px ${shadow};
        transform:rotate(-45deg);
      "></div>`,
    iconSize:   [26, 26],
    iconAnchor: [13, 26],
  })
}

// ── Badge "TÚ" para la página de tracking ────────────────────────────────────
const youIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      display:flex; flex-direction:column; align-items:center; gap:3px;
    ">
      <div style="
        background:#4f46e5;
        color:white;
        font-family:system-ui,sans-serif;
        font-size:11px;
        font-weight:800;
        letter-spacing:0.5px;
        padding:4px 10px;
        border-radius:20px;
        border:2.5px solid white;
        box-shadow:0 3px 12px rgba(79,70,229,0.45);
        white-space:nowrap;
      ">TÚ</div>
      <div style="
        width:6px; height:6px; border-radius:50%;
        background:#4f46e5; box-shadow:0 1px 4px rgba(79,70,229,0.5);
      "></div>
    </div>`,
  iconSize:   [46, 34],
  iconAnchor: [23, 34],
})

// ── Punto del rider ───────────────────────────────────────────────────────────
const riderIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative; width:22px; height:22px; display:flex; align-items:center; justify-content:center;">
      <div style="
        position:absolute; width:22px; height:22px; border-radius:50%;
        background:rgba(37,99,235,0.2);
      "></div>
      <div style="
        width:13px; height:13px; border-radius:50%;
        background:#2563eb; border:2.5px solid white;
        box-shadow:0 2px 6px rgba(37,99,235,0.5);
        position:relative; z-index:1;
      "></div>
    </div>`,
  iconSize:   [22, 22],
  iconAnchor: [11, 11],
})

// ── Marcadores + fit bounds ───────────────────────────────────────────────────
function Markers(props: OrderMapProps) {
  const { pickupLat, pickupLng, deliveryLat, deliveryLng, riderLat, riderLng, deliveryLabel } = props
  const map = useMap()
  const riderMarkerRef = useRef<L.Marker | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // ── Efecto 1: Markers estáticos (pickup / delivery) ──────────────────────
  useEffect(() => {
    const markers: L.Marker[] = []

    const pickupIcon   = dropPin('#16a34a', 'rgba(22,163,74,0.4)')
    const deliveryIcon = deliveryLabel === 'TÚ'
      ? youIcon
      : dropPin('#dc2626', 'rgba(220,38,38,0.4)')

    markers.push(
      L.marker([pickupLat, pickupLng], { icon: pickupIcon })
        .bindTooltip('Punto de recogida', { direction: 'top', offset: [0, -10] })
        .addTo(map),
      L.marker([deliveryLat, deliveryLng], { icon: deliveryIcon })
        .bindTooltip(deliveryLabel === 'TÚ' ? 'Tu dirección de entrega' : 'Punto de entrega', { direction: 'top', offset: [0, -10] })
        .addTo(map),
    )

    return () => { markers.forEach(m => m.remove()) }
  }, [map, pickupLat, pickupLng, deliveryLat, deliveryLng, deliveryLabel])

  // ── Interpolación suave para el rider ────────────────────────────────────
  const animateRiderTo = useCallback((marker: L.Marker, targetLat: number, targetLng: number) => {
    // Cancel any in-progress animation
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }

    const startPos = marker.getLatLng()
    const startLat = startPos.lat
    const startLng = startPos.lng

    // Skip animation if position hasn't actually changed
    if (Math.abs(startLat - targetLat) < 1e-7 && Math.abs(startLng - targetLng) < 1e-7) return

    const totalFrames = 30
    let frame = 0

    function step() {
      frame++
      const t = Math.min(frame / totalFrames, 1)
      // Ease-out quadratic for smooth deceleration
      const ease = t * (2 - t)
      const lat = startLat + (targetLat - startLat) * ease
      const lng = startLng + (targetLng - startLng) * ease
      marker.setLatLng([lat, lng])

      if (frame < totalFrames) {
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        animFrameRef.current = null
      }
    }

    animFrameRef.current = requestAnimationFrame(step)
  }, [])

  // ── Efecto 2: Rider marker con animación suave ──────────────────────────
  useEffect(() => {
    if (riderLat != null && riderLng != null) {
      if (riderMarkerRef.current) {
        // Marker ya existe: animar suavemente a la nueva posición
        animateRiderTo(riderMarkerRef.current, riderLat, riderLng)
      } else {
        // Crear marker nuevo
        riderMarkerRef.current = L.marker([riderLat, riderLng], { icon: riderIcon })
          .bindTooltip('Rider', { direction: 'top', offset: [0, -6] })
          .addTo(map)
      }
    } else {
      // Sin coordenadas de rider: remover marker si existe
      if (riderMarkerRef.current) {
        riderMarkerRef.current.remove()
        riderMarkerRef.current = null
      }
    }
  }, [map, riderLat, riderLng, animateRiderTo])

  // ── Fit bounds cuando cambia cualquier posición ──────────────────────────
  useEffect(() => {
    const bounds = L.latLngBounds([
      [pickupLat, pickupLng],
      [deliveryLat, deliveryLng],
      ...(riderLat != null && riderLng != null ? [[riderLat, riderLng] as [number, number]] : []),
    ])
    map.fitBounds(bounds, { padding: [52, 52] })
  }, [map, pickupLat, pickupLng, deliveryLat, deliveryLng, riderLat, riderLng])

  // ── Cleanup del rider marker y animación al desmontar ────────────────────
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
      }
      if (riderMarkerRef.current) {
        riderMarkerRef.current.remove()
        riderMarkerRef.current = null
      }
    }
  }, [])

  return null
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function OrderMapInner(props: OrderMapProps) {
  const { pickupLat, pickupLng, deliveryLat, deliveryLng } = props
  const midLat = (pickupLat + deliveryLat) / 2
  const midLng = (pickupLng + deliveryLng) / 2

  return (
    <MapContainer center={[midLat, midLng]} zoom={13} className="w-full h-full" zoomControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline
        positions={[[pickupLat, pickupLng], [deliveryLat, deliveryLng]]}
        pathOptions={{ color: '#6366f1', weight: 2.5, dashArray: '6 5', opacity: 0.6 }}
      />
      <Markers {...props} />
    </MapContainer>
  )
}
