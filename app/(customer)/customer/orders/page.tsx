'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Package, Loader2, Clock, CheckCircle,
  Truck, XCircle, ArrowRight, Store,
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

const MERCHANT_STATUS_LABEL: Record<string, string> = {
  pending: 'Esperando comercio',
  accepted: 'Aceptado',
  preparing: 'Preparando',
  ready: 'Listo para recoger',
  rejected: 'Rechazado',
}

interface Order {
  id: string; order_number: string; status: string; tracking_code: string
  pickup_address: string; delivery_address: string; total_fee: number
  subtotal: number; service_fee: number; delivery_fee: number; tip_amount: number
  merchant_status: string | null; order_items: any[] | null
  created_at: string
  merchants?: { name: string } | null
}

export default function MyOrdersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('orders')
      .select('*, merchants:merchant_id(name)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }

  const activeOrders = orders.filter(o => !['delivered', 'cancelled', 'failed'].includes(o.status))
  const pastOrders = orders.filter(o => ['delivered', 'cancelled', 'failed'].includes(o.status))

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/customer')} className="text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-zinc-900 font-bold text-lg">Mis Pedidos</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-5">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">No tienes pedidos aún</p>
            <button onClick={() => router.push('/customer')} className="mt-3 text-blue-600 text-sm font-medium">Explorar comercios</button>
          </div>
        ) : (
          <>
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-700 mb-3">En curso ({activeOrders.length})</h2>
                <div className="space-y-3">
                  {activeOrders.map(order => <OrderCard key={order.id} order={order} />)}
                </div>
              </div>
            )}

            {pastOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-700 mb-3">Historial ({pastOrders.length})</h2>
                <div className="space-y-3">
                  {pastOrders.map(order => <OrderCard key={order.id} order={order} />)}
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
  const merchantName = (order.merchants as any)?.name

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-zinc-400 font-mono">{order.order_number}</p>
          {merchantName && (
            <p className="text-sm font-semibold text-zinc-900 mt-0.5 flex items-center gap-1">
              <Store className="w-3 h-3 text-orange-500" />
              {merchantName}
            </p>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${config.bg} ${config.color}`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      {/* Merchant status */}
      {order.merchant_status && order.merchant_status !== 'none' && (
        <p className="text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 mb-2 inline-block">
          {MERCHANT_STATUS_LABEL[order.merchant_status] ?? order.merchant_status}
        </p>
      )}

      {/* Items resumen */}
      {order.order_items && (
        <p className="text-xs text-zinc-500 mb-2">
          {(order.order_items as any[]).map(i => `${i.quantity}x ${i.name}`).join(', ')}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-semibold text-zinc-800">Bs. {Number(order.total_fee).toFixed(2)}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">
            {new Date(order.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
          </span>
          <Link
            href={`/customer/orders/${order.id}`}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
          >
            Ver detalle <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
