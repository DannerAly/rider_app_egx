import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit  = parseInt(searchParams.get('limit') ?? '50')

  let query = supabase
    .from('orders')
    .select('*, riders(profiles(full_name)), customers(profiles(full_name))')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const {
    pickup_address, pickup_lat, pickup_lng,
    pickup_contact_name, pickup_contact_phone, pickup_notes,
    delivery_address, delivery_lat, delivery_lng,
    delivery_contact_name, delivery_contact_phone, delivery_notes,
    package_description, package_weight_kg,
    priority = 'normal',
    scheduled_at,
    zone_id,
  } = body

  if (!pickup_address || !pickup_lat || !pickup_lng || !delivery_address || !delivery_lat || !delivery_lng) {
    return NextResponse.json({ error: 'Faltan campos obligatorios de pickup o delivery' }, { status: 400 })
  }

  // Calcular distancia con fórmula Haversine
  const R = 6371
  const dLat = (delivery_lat - pickup_lat) * Math.PI / 180
  const dLng = (delivery_lng - pickup_lng) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(pickup_lat * Math.PI / 180) * Math.cos(delivery_lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  const distance_km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const base_fee     = 10                            // Bs. tarifa base
  const delivery_fee = parseFloat((distance_km * 2).toFixed(2))  // Bs. 2 por km
  const total_fee    = parseFloat((base_fee + delivery_fee).toFixed(2))

  const { data, error } = await supabase.from('orders').insert({
    pickup_address, pickup_lat, pickup_lng,
    pickup_contact_name, pickup_contact_phone, pickup_notes,
    delivery_address, delivery_lat, delivery_lng,
    delivery_contact_name, delivery_contact_phone, delivery_notes,
    package_description, package_weight_kg,
    priority, scheduled_at, zone_id,
    distance_km: parseFloat(distance_km.toFixed(2)),
    base_fee, delivery_fee, total_fee,
    dispatcher_id: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Historial de estado inicial
  await supabase.from('order_status_history').insert({
    order_id: data.id, status: 'pending', changed_by: user.id,
  })

  return NextResponse.json({ data }, { status: 201 })
}
