import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const admin = createAdminClient()

  const { data: order, error } = await admin
    .from('orders')
    .select(`
      id, order_number, tracking_code, status, priority,
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

  if (error || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  // Solo exponer lo necesario para el tracking (sin datos sensibles)
  const rider = order.riders as any
  return NextResponse.json({
    order_number:   order.order_number,
    tracking_code:  order.tracking_code,
    status:         order.status,
    priority:       order.priority,
    created_at:     order.created_at,
    assigned_at:    order.assigned_at,
    picked_up_at:   order.picked_up_at,
    delivered_at:   order.delivered_at,
    cancelled_at:   order.cancelled_at,
    pickup_address:   order.pickup_address,
    pickup_lat:       order.pickup_lat,
    pickup_lng:       order.pickup_lng,
    delivery_address: order.delivery_address,
    delivery_lat:     order.delivery_lat,
    delivery_lng:     order.delivery_lng,
    distance_km:      order.distance_km,
    total_fee:        order.total_fee,
    rider: rider ? {
      name:                rider.profiles?.full_name ?? null,
      vehicle_type:        rider.vehicle_type,
      current_lat:         rider.current_lat,
      current_lng:         rider.current_lng,
      last_location_update: rider.last_location_update,
    } : null,
  })
}
