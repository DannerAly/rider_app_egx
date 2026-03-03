'use client'

import { useRiderSession } from '@/hooks/useRiderSession'
import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Power, MapPin, Phone, Navigation,
  Package, CheckCircle, Loader2, ChevronRight, Clock, AlertCircle, History,
  Camera, X,
} from 'lucide-react'

const ORDER_STEPS: Record<string, { label: string; next: string; nextLabel: string; color: string }> = {
  assigned:          { label: 'Pedido asignado',        next: 'heading_to_pickup', nextLabel: '🛵  Salir a recoger',    color: 'bg-blue-600' },
  heading_to_pickup: { label: 'Yendo al pickup',        next: 'picked_up',         nextLabel: '📦  Confirmar recogida', color: 'bg-purple-600' },
  picked_up:         { label: 'Paquete en mano',        next: 'in_transit',        nextLabel: '🚀  Iniciar entrega',    color: 'bg-indigo-600' },
  in_transit:        { label: 'En camino al destino',   next: 'delivered',         nextLabel: '✅  Confirmar entrega',  color: 'bg-cyan-600' },
}

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  urgent: { label: 'URGENTE', color: 'text-red-400' },
  high:   { label: 'Alta',    color: 'text-orange-400' },
  normal: { label: 'Normal',  color: 'text-zinc-400' },
  low:    { label: 'Baja',    color: 'text-zinc-500' },
}

interface Props { riderId: string; name: string }

export default function RiderDashboard({ riderId, name }: Props) {
  const {
    riderStatus, activeOrder, availableOrders,
    isLoading, acceptingId, acceptError,
    toggleStatus, acceptOrder, updateOrderStatus,
  } = useRiderSession(riderId)

  const [photoFile, setPhotoFile]     = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDeliveryConfirm = async () => {
    if (!activeOrder) return
    let photoUrl: string | undefined
    if (photoFile) {
      setUploading(true)
      const fd = new FormData()
      fd.append('photo', photoFile)
      try {
        const res = await fetch(`/api/orders/${activeOrder.id}/upload-photo`, {
          method: 'POST', body: fd,
        })
        const json = await res.json()
        photoUrl = json.url
      } finally {
        setUploading(false)
      }
    }
    await updateOrderStatus('delivered', photoUrl)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  const isOnline  = riderStatus !== 'offline'
  const orderStep = activeOrder ? ORDER_STEPS[activeOrder.status] : null

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col pb-8">

      {/* Header */}
      <div className="px-5 pt-12 pb-5 flex items-start justify-between">
        <div>
          <p className="text-zinc-500 text-sm">Bienvenido,</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">{name}</h1>
        </div>
        <Link
          href="/rider/history"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-sm transition-colors mt-1"
        >
          <History className="w-4 h-4" />
          Historial
        </Link>
      </div>

      {/* Toggle de turno */}
      <div className="px-5 mb-5">
        <button
          onClick={toggleStatus}
          disabled={!!activeOrder}
          className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${
            isOnline
              ? 'bg-green-600 hover:bg-green-500'
              : 'bg-zinc-800 hover:bg-zinc-700'
          } disabled:opacity-70 disabled:cursor-not-allowed`}
        >
          <div>
            <p className="text-white font-semibold text-base">
              {isOnline ? 'Turno activo' : 'Offline'}
            </p>
            <p className="text-white/60 text-sm mt-0.5">
              {isOnline
                ? activeOrder ? 'Tienes un pedido activo' : 'Esperando pedidos...'
                : 'Toca para iniciar turno'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOnline ? 'bg-white/20' : 'bg-zinc-700'}`}>
            <Power className={`w-5 h-5 ${isOnline ? 'text-white' : 'text-zinc-400'}`} />
          </div>
        </button>
      </div>

      <div className="flex-1 px-5 space-y-4">

        {/* ── PEDIDO ACTIVO ──────────────────────────────────────────────── */}
        {activeOrder && orderStep ? (
          <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
            <div className={`${orderStep.color} px-5 py-3 flex items-center gap-2`}>
              <Package className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-semibold">{orderStep.label}</span>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-zinc-500 text-xs font-mono">{activeOrder.order_number}</p>

              {/* Punto de pickup */}
              <AddressBlock
                dot="bg-blue-500"
                label="RECOGIDA"
                address={activeOrder.pickup_address}
                contact={activeOrder.pickup_contact_name}
                phone={activeOrder.pickup_contact_phone}
                notes={activeOrder.pickup_notes}
              />

              <div className="border-t border-zinc-800" />

              {/* Punto de entrega */}
              <AddressBlock
                dot="bg-green-500"
                label="ENTREGA"
                address={activeOrder.delivery_address}
                contact={activeOrder.delivery_contact_name}
                phone={activeOrder.delivery_contact_phone}
                notes={activeOrder.delivery_notes}
              />

              {/* Abrir Maps */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${
                  ['assigned', 'heading_to_pickup'].includes(activeOrder.status)
                    ? `${activeOrder.pickup_lat},${activeOrder.pickup_lng}`
                    : `${activeOrder.delivery_lat},${activeOrder.delivery_lng}`
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Navegar
              </a>

              {/* Avanzar estado — en in_transit pide foto */}
              {activeOrder.status === 'in_transit' ? (
                <div className="space-y-3">
                  {/* Selector de foto */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  {photoPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Foto de entrega" className="w-full h-40 object-cover rounded-xl" />
                      <button
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Tomar foto de entrega (opcional)
                    </button>
                  )}

                  <button
                    onClick={handleDeliveryConfirm}
                    disabled={uploading}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-white text-zinc-900 font-bold text-base transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-60"
                  >
                    {uploading
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <CheckCircle className="w-5 h-5" />}
                    {uploading ? 'Subiendo foto...' : '✅  Confirmar entrega'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => updateOrderStatus(orderStep.next)}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-white text-zinc-900 font-bold text-base transition-all hover:bg-zinc-100 active:scale-95"
                >
                  <CheckCircle className="w-5 h-5" />
                  {orderStep.nextLabel}
                </button>
              )}

              {activeOrder.total_fee > 0 && (
                <p className="text-center text-zinc-500 text-sm">
                  Ganancia: <span className="text-white font-semibold">Bs. {Number(activeOrder.total_fee).toFixed(2)}</span>
                </p>
              )}
            </div>
          </div>
        ) : isOnline ? (
          <>
            {/* ── PEDIDOS DISPONIBLES ─────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold">
                  Pedidos disponibles
                  {availableOrders.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-zinc-400">({availableOrders.length})</span>
                  )}
                </h2>
                {isOnline && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400 text-xs">GPS activo</span>
                  </div>
                )}
              </div>

              {/* Error al aceptar */}
              {acceptError && (
                <div className="flex items-center gap-2 bg-red-950/50 border border-red-900 rounded-xl px-4 py-3 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{acceptError}</p>
                </div>
              )}

              {availableOrders.length > 0 ? (
                <div className="space-y-3">
                  {availableOrders.map(order => {
                    const prio = PRIORITY_LABEL[order.priority] ?? PRIORITY_LABEL.normal
                    return (
                      <div key={order.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-zinc-500 text-xs font-mono">{order.order_number}</span>
                          <span className={`text-xs font-semibold ${prio.color}`}>{prio.label}</span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex gap-2.5 items-start">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                            <p className="text-zinc-300 text-sm leading-snug line-clamp-2">{order.pickup_address}</p>
                          </div>
                          <div className="flex gap-2.5 items-start">
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                            <p className="text-zinc-300 text-sm leading-snug line-clamp-2">{order.delivery_address}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {order.distance_km && (
                              <span className="text-zinc-400 text-xs flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {Number(order.distance_km).toFixed(1)} km
                              </span>
                            )}
                            <span className="text-zinc-400 text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(order.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {order.total_fee > 0 && (
                            <span className="text-white font-bold text-sm">
                              Bs. {Number(order.total_fee).toFixed(2)}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => acceptOrder(order.id)}
                          disabled={!!acceptingId}
                          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
                        >
                          {acceptingId === order.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <ChevronRight className="w-4 h-4" />
                          }
                          {acceptingId === order.id ? 'Aceptando...' : 'Aceptar pedido'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-10 flex flex-col items-center text-center">
                  <MapPin className="w-8 h-8 text-zinc-700 mb-3" />
                  <p className="text-zinc-400 font-medium">Sin pedidos disponibles</p>
                  <p className="text-zinc-600 text-sm mt-1">Los pedidos nuevos aparecerán aquí en tiempo real</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── OFFLINE ────────────────────────────────────────────────────── */
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-10 flex flex-col items-center text-center">
            <Power className="w-8 h-8 text-zinc-700 mb-3" />
            <p className="text-zinc-400 font-medium">Estás offline</p>
            <p className="text-zinc-600 text-sm mt-1">Activa tu turno para recibir pedidos</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AddressBlock({ dot, label, address, contact, phone, notes }: {
  dot: string; label: string; address: string
  contact: string | null; phone: string | null; notes: string | null
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-white text-sm leading-snug ml-4">{address}</p>
      {contact && (
        <div className="flex items-center justify-between ml-4 mt-1.5">
          <p className="text-zinc-400 text-sm">{contact}</p>
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-blue-400 text-sm">
              <Phone className="w-3.5 h-3.5" /> Llamar
            </a>
          )}
        </div>
      )}
      {notes && <p className="text-zinc-600 text-xs ml-4 mt-1">{notes}</p>}
    </div>
  )
}
