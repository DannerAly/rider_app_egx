import { createClient } from '@/lib/supabase/server'
import LiveMapWrapper from '@/components/map/LiveMapWrapper'
import StatusBadge from '@/components/orders/StatusBadge'
import { Package } from 'lucide-react'

export default async function DispatcherPage() {
  const supabase = await createClient()

  const { data: pendingOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, pickup_address, delivery_address, total_fee, created_at, priority')
    .in('status', ['pending', 'assigned', 'heading_to_pickup', 'picked_up', 'in_transit'])
    .order('created_at', { ascending: false })
    .limit(50)

  const { count: activeRidersCount } = await supabase
    .from('riders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'available')

  return (
    <div className="flex gap-5 h-[calc(100vh-4rem)] overflow-hidden">

      {/* Mapa — columna principal */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex items-center justify-between flex-shrink-0">
          <p className="text-zinc-500 text-sm">
            <span className="text-green-600 font-semibold">{activeRidersCount ?? 0}</span> riders disponibles en el mapa
          </p>
        </div>
        <div className="flex-1 rounded-xl overflow-hidden border border-zinc-200">
          <LiveMapWrapper center={[-17.7863, -63.1812]} zoom={13} />
        </div>
      </div>

      {/* Panel de pedidos activos */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-hidden">
        <div className="flex-shrink-0">
          <h3 className="text-zinc-900 font-semibold text-sm">
            Pedidos activos
            <span className="ml-2 text-xs font-normal text-zinc-400">({pendingOrders?.length ?? 0})</span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {pendingOrders && pendingOrders.length > 0 ? (
            pendingOrders.map((order: any) => (
              <div key={order.id} className="bg-white rounded-xl border border-zinc-200 p-3.5">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-mono text-xs text-zinc-500 font-medium">{order.order_number}</span>
                  <StatusBadge status={order.status} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex gap-2 items-start">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                    <p className="text-zinc-700 text-xs leading-snug line-clamp-2">{order.pickup_address}</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                    <p className="text-zinc-700 text-xs leading-snug line-clamp-2">{order.delivery_address}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-zinc-100">
                  <span className="text-zinc-400 text-xs">
                    {new Date(order.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {order.total_fee > 0 && (
                    <span className="text-zinc-700 text-xs font-semibold">Bs. {Number(order.total_fee).toFixed(2)}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-7 h-7 text-zinc-300 mb-2" />
              <p className="text-zinc-400 text-sm">Sin pedidos activos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
