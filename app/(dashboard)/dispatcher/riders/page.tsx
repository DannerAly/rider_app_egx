import { createClient } from '@/lib/supabase/server'
import RiderStatusBadge from '@/components/riders/RiderStatusBadge'
import { Users, Package } from 'lucide-react'

const VEHICLE_LABEL: Record<string, string> = {
  bicycle: '🚲', motorcycle: '🏍️', car: '🚗', truck: '🚛', walking: '🚶',
}

export default async function DispatcherRidersPage() {
  const supabase = await createClient()

  const [{ data: riders }, { data: activeOrders }] = await Promise.all([
    supabase.from('riders')
      .select('id, status, vehicle_type, vehicle_plate, last_location_update, profiles(full_name, phone)')
      .neq('status', 'offline')
      .order('status'),

    supabase.from('orders')
      .select('rider_id, order_number, delivery_address, status')
      .in('status', ['assigned', 'heading_to_pickup', 'picked_up', 'in_transit']),
  ])

  // Mapa rider_id → pedido activo
  const orderByRider: Record<string, { order_number: string; delivery_address: string; status: string }> =
    Object.fromEntries((activeOrders ?? []).map(o => [o.rider_id, o]))

  const counts = {
    available: riders?.filter(r => r.status === 'available').length ?? 0,
    busy:      riders?.filter(r => r.status === 'busy').length      ?? 0,
    on_break:  riders?.filter(r => r.status === 'on_break').length  ?? 0,
  }

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div>
        <h2 className="text-zinc-900 font-semibold text-lg">Riders activos</h2>
        <p className="text-zinc-500 text-sm mt-0.5">
          <span className="text-green-600 font-semibold">{counts.available}</span> disponibles ·{' '}
          <span className="text-blue-600 font-semibold">{counts.busy}</span> en pedido ·{' '}
          <span className="text-yellow-600 font-semibold">{counts.on_break}</span> en descanso
        </p>
      </div>

      {riders && riders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {riders.map((rider: any) => {
            const currentOrder = orderByRider[rider.id]
            return (
              <div key={rider.id} className="bg-white rounded-xl border border-zinc-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-zinc-600 font-semibold text-sm">
                        {rider.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-zinc-900 font-semibold text-sm">{rider.profiles?.full_name ?? 'Sin nombre'}</p>
                      <p className="text-zinc-400 text-xs">{rider.profiles?.phone ?? '—'}</p>
                    </div>
                  </div>
                  <RiderStatusBadge status={rider.status} />
                </div>

                {/* Vehículo */}
                <div className="flex items-center gap-1.5 text-sm text-zinc-500 mb-3">
                  <span>{VEHICLE_LABEL[rider.vehicle_type] ?? '🚗'}</span>
                  <span>{rider.vehicle_plate ?? 'Sin placa'}</span>
                </div>

                {/* Pedido activo */}
                {currentOrder ? (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Package className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-blue-700 font-mono text-xs font-semibold">{currentOrder.order_number}</span>
                    </div>
                    <p className="text-zinc-600 text-xs line-clamp-1">{currentOrder.delivery_address}</p>
                  </div>
                ) : (
                  <div className="bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100">
                    <p className="text-zinc-400 text-xs italic">
                      {rider.status === 'on_break' ? 'En descanso' : 'Esperando pedido'}
                    </p>
                  </div>
                )}

                {/* Última ubicación */}
                {rider.last_location_update && (
                  <p className="text-zinc-400 text-xs mt-3 pt-3 border-t border-zinc-100">
                    GPS actualizado:{' '}
                    {new Date(rider.last_location_update).toLocaleTimeString('es', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-16">
          <Users className="w-8 h-8 text-zinc-300 mb-3" />
          <p className="text-zinc-500 font-medium">Sin riders activos</p>
          <p className="text-zinc-400 text-sm mt-1">Los riders aparecen aquí cuando inician turno</p>
        </div>
      )}
    </div>
  )
}
