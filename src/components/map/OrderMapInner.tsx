'use client'

import { useEffect } from 'react'
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

    if (riderLat && riderLng) {
      markers.push(
        L.marker([riderLat, riderLng], { icon: riderIcon })
          .bindTooltip('Rider', { direction: 'top', offset: [0, -6] })
          .addTo(map)
      )
    }

    const bounds = L.latLngBounds([
      [pickupLat, pickupLng],
      [deliveryLat, deliveryLng],
      ...(riderLat && riderLng ? [[riderLat, riderLng] as [number, number]] : []),
    ])
    map.fitBounds(bounds, { padding: [52, 52] })

    return () => { markers.forEach(m => m.remove()) }
  }, [map, pickupLat, pickupLng, deliveryLat, deliveryLng, riderLat, riderLng, deliveryLabel])

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
