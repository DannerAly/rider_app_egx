import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import StatusBadge from '@/components/orders/StatusBadge'
import CreateOrderForm from '../../admin/orders/CreateOrderForm'
import AssignRider from './AssignRider'
import { Package, Clock, Truck } from 'lucide-react'

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'text-red-500 font-bold',
  high:   'text-orange-500 font-semibold',
  normal: 'text-zinc-400',
  low:    'text-zinc-500',
}
const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'URGENTE', high: 'Alta', normal: 'Normal', low: 'Baja',
}

export default async function DispatcherOrdersPage() {
  const supabase = await createClient()

  const [
    { data: pendingOrders },
    { data: activeOrders },
    { data: availableRiders },
    { data: zones },
  ] = await Promise.all([
    // Pedidos pendientes sin rider
    supabase.from('orders')
      .select('id, order_number, priority, pickup_address, delivery_address, total_fee, created_at, distance_km')
      .eq('status', 'pending')
      .is('rider_id', null)
      .order('created_at', { ascending: true }),

    // Pedidos en progreso
    supabase.from('orders')
      .select(`
        id, order_number, status, priority,
        pickup_address, delivery_address, total_fee, created_at,
        riders(profiles(full_name))
      `)
      .in('status', ['assigned', 'heading_to_pickup', 'picked_up', 'in_transit'])
      .order('created_at', { ascending: true }),

    // Riders disponibles para asignar
    supabase.from('riders')
      .select('id, vehicle_type, profiles(full_name)')
      .eq('status', 'available'),

    supabase.from('zones').select('id, name').eq('is_active', true).order('name'),
  ])

  const riders = (availableRiders ?? []).map((r: any) => ({
    id:           r.id,
    full_name:    r.profiles?.full_name ?? 'Sin nombre',
    vehicle_type: r.vehicle_type,
  }))

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-zinc-900 font-semibold text-lg">Pedidos</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            <span className="text-red-600 font-semibold">{pendingOrders?.length ?? 0}</span> sin asignar ·{' '}
            <span className="text-blue-600 font-semibold">{activeOrders?.length ?? 0}</span> en progreso
          </p>
        </div>
        <CreateOrderForm zones={zones ?? []} />
      </div>

      {/* ── SIN ASIGNAR ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <h3 className="text-zinc-800 font-semibold text-sm">
            Sin asignar
            <span className="ml-2 text-xs font-normal text-zinc-400">({pendingOrders?.length ?? 0})</span>
          </h3>
        </div>

        {pendingOrders && pendingOrders.length > 0 ? (
          <div className="space-y-2">
            {pendingOrders.map((order: any) => (
              <div key={order.id} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs font-medium text-blue-600 hover:underline">
                      {order.order_number}
                    </Link>
                    <span className={`text-xs ${PRIORITY_COLOR[order.priority] ?? 'text-zinc-400'}`}>
                      {PRIORITY_LABEL[order.priority] ?? 'Normal'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex gap-2 items-start">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                      <p className="text-zinc-600 text-xs leading-snug line-clamp-1">{order.pickup_address}</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                      <p className="text-zinc-600 text-xs leading-snug line-clamp-1">{order.delivery_address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-zinc-400 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {order.distance_km && <span>{Number(order.distance_km).toFixed(1)} km</span>}
                    {order.total_fee > 0 && (
                      <span className="text-zinc-600 font-medium">Bs. {Number(order.total_fee).toFixed(2)}</span>
                    )}
                  </div>
                </div>

                <AssignRider orderId={order.id} riders={riders} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 flex items-center gap-3 px-5 py-4">
            <Package className="w-5 h-5 text-zinc-300" />
            <p className="text-zinc-400 text-sm">No hay pedidos pendientes de asignación</p>
          </div>
        )}
      </section>

      {/* ── EN PROGRESO ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="text-zinc-800 font-semibold text-sm">
            En progreso
            <span className="ml-2 text-xs font-normal text-zinc-400">({activeOrders?.length ?? 0})</span>
          </h3>
        </div>

        {activeOrders && activeOrders.length > 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
            {activeOrders.map((order: any) => (
              <div key={order.id} className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 transition-colors">
                <StatusBadge status={order.status} />
                <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs font-medium text-blue-600 hover:underline w-28 flex-shrink-0">
                  {order.order_number}
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-600 text-xs truncate">{order.delivery_address}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 text-zinc-500 text-xs">
                  <Truck className="w-3.5 h-3.5" />
                  {(order.riders as any)?.profiles?.full_name ?? '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 flex items-center gap-3 px-5 py-4">
            <Truck className="w-5 h-5 text-zinc-300" />
            <p className="text-zinc-400 text-sm">No hay pedidos en progreso</p>
          </div>
        )}
      </section>
    </div>
  )
}
