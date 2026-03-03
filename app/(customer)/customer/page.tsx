'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Package, Search, Loader2, MapPin, Clock, CheckCircle,
  Truck, XCircle, ArrowRight, Phone,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending:           { label: 'Pendiente',       icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  assigned:          { label: 'Asignado',        icon: Package,     color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
  heading_to_pickup: { label: 'Hacia recogida',  icon: Truck,       color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200' },
  picked_up:         { label: 'Recogido',        icon: Package,     color: 'text-indigo-600',  bg: 'bg-indigo-50 border-indigo-200' },
  in_transit:        { label: 'En camino',       icon: Truck,       color: 'text-cyan-600',    bg: 'bg-cyan-50 border-cyan-200' },
  delivered:         { label: 'Entregado',       icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  cancelled:         { label: 'Cancelado',       icon: XCircle,     color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
  failed:            { label: 'Fallido',         icon: XCircle,     color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
}

interface Order {
  id: string
  order_number: string
  status: string
  tracking_code: string
  pickup_address: string
  delivery_address: string
  delivery_contact_name: string | null
  total_fee: number
  created_at: string
  delivered_at: string | null
  delivery_photo_url: string | null
}

export default function CustomerPortal() {
  const [phone, setPhone]       = useState('')
  const [orders, setOrders]     = useState<Order[]>([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/customer/orders?phone=${encodeURIComponent(phone.trim())}`)
      const json = await res.json()
      setOrders(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  const activeOrders    = orders.filter(o => !['delivered', 'cancelled', 'failed'].includes(o.status))
  const completedOrders = orders.filter(o => ['delivered', 'cancelled', 'failed'].includes(o.status))

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-lg mx-auto px-5 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Mis Pedidos</h1>
          <p className="text-zinc-500 text-sm mt-1">Ingresa tu teléfono para ver tus entregas</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
        {/* Buscador */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+591 700 00000"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </form>

        {/* Resultados */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : searched && orders.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">No se encontraron pedidos</p>
            <p className="text-zinc-400 text-sm mt-1">Verifica el número ingresado</p>
          </div>
        ) : (
          <>
            {/* Pedidos activos */}
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-700 mb-3">En curso ({activeOrders.length})</h2>
                <div className="space-y-3">
                  {activeOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Historial */}
            {completedOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-700 mb-3">Historial ({completedOrders.length})</h2>
                <div className="space-y-3">
                  {completedOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-zinc-400 font-mono">{order.order_number}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {new Date(order.created_at).toLocaleDateString('es', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${config.bg} ${config.color}`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex gap-2 items-start">
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
          <p className="text-sm text-zinc-600 line-clamp-1">{order.pickup_address}</p>
        </div>
        <div className="flex gap-2 items-start">
          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
          <p className="text-sm text-zinc-600 line-clamp-1">{order.delivery_address}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-800">Bs. {Number(order.total_fee).toFixed(2)}</span>
        <Link
          href={`/track/${order.tracking_code}`}
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Ver tracking <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Foto de entrega si existe */}
      {order.delivery_photo_url && (
        <div className="mt-3 pt-3 border-t border-zinc-100">
          <p className="text-xs text-zinc-400 mb-2">Foto de entrega</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={order.delivery_photo_url}
            alt="Foto de entrega"
            className="w-full h-32 object-cover rounded-lg"
          />
        </div>
      )}
    </div>
  )
}
