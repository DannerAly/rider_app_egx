import { createAdminClient } from '@/lib/supabase/admin'
import TrackingView from './TrackingView'
import { Package, AlertCircle } from 'lucide-react'

interface PageProps { params: Promise<{ code: string }> }

export default async function TrackingPage({ params }: PageProps) {
  const { code } = await params
  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select(`
      order_number, tracking_code, status, priority,
      created_at, assigned_at, picked_up_at, delivered_at, cancelled_at,
      pickup_address, pickup_lat, pickup_lng,
      delivery_address, delivery_lat, delivery_lng,
      distance_km, total_fee,
      riders(
        vehicle_type,
        profiles(full_name),
        current_lat, current_lng, last_location_update
      )
    `)
    .eq('tracking_code', code.toUpperCase())
    .single()

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-zinc-400" />
          </div>
          <h1 className="text-zinc-800 font-semibold text-lg mb-2">Pedido no encontrado</h1>
          <p className="text-zinc-500 text-sm">
            El código <span className="font-mono font-semibold text-zinc-700">{code.toUpperCase()}</span> no corresponde a ningún pedido.
          </p>
          <p className="text-zinc-400 text-xs mt-3">Verifica el código e intenta nuevamente.</p>
        </div>
      </div>
    )
  }

  const rider = order.riders as any
  const initial = {
    order_number:     order.order_number,
    tracking_code:    order.tracking_code,
    status:           order.status,
    priority:         order.priority,
    created_at:       order.created_at,
    assigned_at:      order.assigned_at,
    picked_up_at:     order.picked_up_at,
    delivered_at:     order.delivered_at,
    cancelled_at:     order.cancelled_at,
    pickup_address:   order.pickup_address,
    pickup_lat:       order.pickup_lat,
    pickup_lng:       order.pickup_lng,
    delivery_address: order.delivery_address,
    delivery_lat:     order.delivery_lat,
    delivery_lng:     order.delivery_lng,
    distance_km:      Number(order.distance_km),
    total_fee:        Number(order.total_fee),
    rider: rider ? {
      name:                 rider.profiles?.full_name ?? null,
      vehicle_type:         rider.vehicle_type,
      current_lat:          rider.current_lat ?? null,
      current_lng:          rider.current_lng ?? null,
      last_location_update: rider.last_location_update ?? null,
    } : null,
  }

  return <TrackingView initial={initial} code={code.toUpperCase()} />
}
