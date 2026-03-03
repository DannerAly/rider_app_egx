import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Package, TrendingUp } from 'lucide-react'

export default async function RiderHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, pickup_address, delivery_address, total_fee, distance_km, created_at')
    .eq('rider_id', user.id)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })
    .limit(100)

  const totalEarnings   = (orders ?? []).reduce((sum, o) => sum + Number(o.total_fee ?? 0), 0)
  const totalDeliveries = orders?.length ?? 0
  const totalKm         = (orders ?? []).reduce((sum, o) => sum + Number(o.distance_km ?? 0), 0)

  return (
    <div className="min-h-screen bg-zinc-950 pb-10">
      {/* Header */}
      <div className="px-5 pt-12 pb-5 flex items-center gap-4">
        <Link
          href="/rider"
          className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-white font-bold text-xl">Mi historial</h1>
          <p className="text-zinc-500 text-sm">Entregas completadas</p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mb-5 grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
          <Package className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
          <p className="text-white text-xl font-bold">{totalDeliveries}</p>
          <p className="text-zinc-500 text-xs">Entregas</p>
        </div>
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
          <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1.5" />
          <p className="text-white text-xl font-bold">Bs.{totalEarnings.toFixed(0)}</p>
          <p className="text-zinc-500 text-xs">Ganancias</p>
        </div>
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
          <CheckCircle className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
          <p className="text-white text-xl font-bold">{totalKm.toFixed(0)}</p>
          <p className="text-zinc-500 text-xs">km total</p>
        </div>
      </div>

      {/* Lista */}
      <div className="px-5 space-y-3">
        {orders && orders.length > 0 ? (
          orders.map(order => (
            <div key={order.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-zinc-500 text-xs font-mono">{order.order_number}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-400 text-xs font-medium">Entregado</span>
                  </div>
                </div>
                {Number(order.total_fee) > 0 && (
                  <span className="text-white font-bold text-sm">
                    Bs. {Number(order.total_fee).toFixed(2)}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex gap-2 items-start">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <p className="text-zinc-400 text-xs leading-snug line-clamp-1">{order.pickup_address}</p>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <p className="text-zinc-400 text-xs leading-snug line-clamp-1">{order.delivery_address}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-600">
                <span>
                  {new Date(order.created_at).toLocaleDateString('es', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                {order.distance_km && (
                  <span>{Number(order.distance_km).toFixed(1)} km</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-10 h-10 text-zinc-700 mb-3" />
            <p className="text-zinc-400 font-medium">Sin entregas aún</p>
            <p className="text-zinc-600 text-sm mt-1">Las entregas completadas aparecerán aquí</p>
          </div>
        )}
      </div>
    </div>
  )
}
