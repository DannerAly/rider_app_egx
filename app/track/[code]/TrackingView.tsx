'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Package, MapPin, Flag, CheckCircle, Clock, XCircle, Bike, RefreshCw } from 'lucide-react'

const OrderMap = dynamic(() => import('@/components/map/OrderMap'), { ssr: false })

interface TrackingData {
  order_number:    string
  tracking_code:   string
  status:          string
  priority:        string
  created_at:      string
  assigned_at:     string | null
  picked_up_at:    string | null
  delivered_at:    string | null
  cancelled_at:    string | null
  pickup_address:  string
  pickup_lat:      number
  pickup_lng:      number
  delivery_address: string
  delivery_lat:    number
  delivery_lng:    number
  distance_km:     number
  total_fee:       number
  rider: {
    name:                 string | null
    vehicle_type:         string
    current_lat:          number | null
    current_lng:          number | null
    last_location_update: string | null
  } | null
}

const STEPS = [
  { status: 'pending',           icon: Package,      label: 'Pedido creado'   },
  { status: 'assigned',          icon: Bike,         label: 'Rider asignado'  },
  { status: 'heading_to_pickup', icon: MapPin,       label: 'Hacia recogida'  },
  { status: 'picked_up',         icon: Package,      label: 'Paquete recogido'},
  { status: 'in_transit',        icon: Bike,         label: 'En camino'       },
  { status: 'delivered',         icon: CheckCircle,  label: 'Entregado'       },
]

const STATUS_ORDER = ['pending','assigned','heading_to_pickup','picked_up','in_transit','delivered']

const STATUS_MSG: Record<string, { title: string; subtitle: string; color: string }> = {
  pending:           { title: 'Buscando rider',          subtitle: 'Tu pedido está esperando ser asignado a un rider.',        color: 'text-yellow-600' },
  assigned:          { title: 'Rider asignado',          subtitle: 'Un rider ha aceptado tu pedido y se está preparando.',      color: 'text-blue-600'   },
  heading_to_pickup: { title: 'Rider en camino',         subtitle: 'El rider está en camino a recoger tu paquete.',             color: 'text-purple-600' },
  picked_up:         { title: 'Paquete recogido',        subtitle: 'El rider ya tiene tu paquete y se dirige hacia ti.',        color: 'text-indigo-600' },
  in_transit:        { title: '¡En camino a ti!',        subtitle: 'Tu paquete está en camino. ¡Ya casi llega!',                color: 'text-cyan-600'   },
  delivered:         { title: '¡Entregado! 🎉',          subtitle: 'Tu pedido fue entregado exitosamente. ¡Gracias!',           color: 'text-green-600'  },
  cancelled:         { title: 'Pedido cancelado',        subtitle: 'Este pedido fue cancelado.',                                color: 'text-red-600'    },
  failed:            { title: 'Pedido no completado',    subtitle: 'No se pudo completar la entrega de este pedido.',           color: 'text-zinc-500'   },
}

const VEHICLE_LABEL: Record<string, string> = {
  bicycle: '🚲 Bicicleta', motorcycle: '🏍️ Moto',
  car: '🚗 Auto', truck: '🚛 Camión', walking: '🚶 A pie',
}

function fmt(ts: string | null) {
  if (!ts) return null
  return new Date(ts).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function secondsAgo(ts: string | null) {
  if (!ts) return null
  return Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
}

export default function TrackingView({ initial, code }: { initial: TrackingData; code: string }) {
  const [data,          setData]          = useState<TrackingData>(initial)
  const [lastRefresh,   setLastRefresh]   = useState<Date>(new Date())
  const [refreshing,    setRefreshing]    = useState(false)
  const [statusChanged, setStatusChanged] = useState(false)
  const prevStatusRef = useRef<string>(initial.status)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    const res = await fetch(`/api/track/${code}`)
    if (res.ok) {
      const json = await res.json()
      if (json.status !== prevStatusRef.current) {
        prevStatusRef.current = json.status
        setStatusChanged(true)
        setTimeout(() => setStatusChanged(false), 3000)
      }
      setData(json)
      setLastRefresh(new Date())
    }
    setRefreshing(false)
  }, [code])

  // Auto-refresh cada 5 segundos si el pedido está activo
  useEffect(() => {
    const active = !['delivered', 'cancelled', 'failed'].includes(data.status)
    if (!active) return
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [data.status, refresh])

  const msg        = STATUS_MSG[data.status] ?? STATUS_MSG['pending']
  const stepIndex  = STATUS_ORDER.indexOf(data.status)
  const isTerminal = ['delivered', 'cancelled', 'failed'].includes(data.status)
  const showMap    = !['cancelled', 'failed'].includes(data.status)
  const riderLat   = data.rider?.current_lat ?? null
  const riderLng   = data.rider?.current_lng ?? null
  const riderFresh = data.rider?.last_location_update
    ? (secondsAgo(data.rider.last_location_update) ?? 999) < 120
    : false

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

      {/* ── Branding ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-zinc-800">rider-egx</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-400 font-mono">{data.tracking_code}</p>
          <p className="text-xs text-zinc-500">{data.order_number}</p>
        </div>
      </div>

      {/* ── Status hero ───────────────────────────────────────────────────── */}
      <div className={`bg-white rounded-2xl border border-zinc-200 p-6 text-center transition-all duration-500 ${
        statusChanged ? 'ring-2 ring-blue-400 animate-pulse scale-105' : ''
      }`}>
        <p className={`text-2xl font-bold mb-1 ${msg.color}`}>{msg.title}</p>
        <p className="text-zinc-500 text-sm">{msg.subtitle}</p>

        {/* Rider info si está asignado */}
        {data.rider && !isTerminal && (
          <div className="mt-4 inline-flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm">
            <span>{VEHICLE_LABEL[data.rider.vehicle_type] ?? '🏍️'}</span>
            <span className="font-medium text-zinc-700">{data.rider.name ?? 'Rider'}</span>
            {riderFresh && (
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Posición reciente" />
            )}
          </div>
        )}
      </div>

      {/* ── Stepper ───────────────────────────────────────────────────────── */}
      {!['cancelled', 'failed'].includes(data.status) && (
        <div className="bg-white rounded-2xl border border-zinc-200 px-4 py-5">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
              const done    = i < stepIndex
              const current = i === stepIndex
              const future  = i > stepIndex
              const Icon    = step.icon
              return (
                <div key={step.status} className="flex flex-col items-center gap-1 flex-1">
                  {/* Línea izquierda */}
                  <div className="flex items-center w-full">
                    <div className={`flex-1 h-0.5 ${i === 0 ? 'opacity-0' : done || current ? 'bg-blue-500' : 'bg-zinc-200'}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      done    ? 'bg-blue-600 text-white'      :
                      current ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-400 ring-offset-1' :
                                'bg-zinc-100 text-zinc-400'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className={`flex-1 h-0.5 ${i === STEPS.length - 1 ? 'opacity-0' : done ? 'bg-blue-500' : 'bg-zinc-200'}`} />
                  </div>
                  <span className={`text-[10px] text-center leading-tight ${
                    current ? 'text-blue-600 font-semibold' :
                    done    ? 'text-zinc-600' : 'text-zinc-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Mapa ──────────────────────────────────────────────────────────── */}
      {showMap && (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden" style={{ height: '300px' }}>
          <OrderMap
            pickupLat={data.pickup_lat}
            pickupLng={data.pickup_lng}
            deliveryLat={data.delivery_lat}
            deliveryLng={data.delivery_lng}
            riderLat={riderLat}
            riderLng={riderLng}
            deliveryLabel="TÚ"
          />
        </div>
      )}

      {/* ── Direcciones ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100">
        <div className="flex gap-3 p-4">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-0.5">Recogida</p>
            <p className="text-sm text-zinc-700">{data.pickup_address}</p>
            {data.picked_up_at && (
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {fmt(data.picked_up_at)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 p-4">
          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Flag className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-0.5">Entrega</p>
            <p className="text-sm text-zinc-700">{data.delivery_address}</p>
            {data.delivered_at && (
              <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle className="w-3 h-3" /> Entregado {fmt(data.delivered_at)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Refresh indicator ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <span>
          {isTerminal
            ? 'Pedido finalizado'
            : `Actualiza automáticamente cada 5 seg`}
        </span>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1 hover:text-zinc-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>
    </div>
  )
}
