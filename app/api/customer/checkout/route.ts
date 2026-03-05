import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CartItem {
  product_id: string
  name: string
  quantity: number
  price: number
  modifiers: { name: string; price_addition: number }[]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const {
    merchant_id,
    items,
    delivery_address_id,
    delivery_address,
    delivery_lat,
    delivery_lng,
    payment_method = 'cash',
    tip_amount = 0,
    customer_notes,
  } = body as {
    merchant_id: string
    items: CartItem[]
    delivery_address_id?: string
    delivery_address: string
    delivery_lat: number
    delivery_lng: number
    payment_method?: string
    tip_amount?: number
    customer_notes?: string
  }

  if (!merchant_id || !items?.length || !delivery_address || !delivery_lat || !delivery_lng) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  // 1. Validar merchant
  const { data: merchant, error: merchantErr } = await supabase
    .from('merchants')
    .select('id, name, address, lat, lng, min_order_amount, commission_pct, avg_prep_time_min')
    .eq('id', merchant_id)
    .eq('is_active', true)
    .single()

  if (merchantErr || !merchant) {
    return NextResponse.json({ error: 'Comercio no encontrado o inactivo' }, { status: 404 })
  }

  // 2. Validar productos y construir snapshot
  const productIds = items.map(i => i.product_id)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, is_available, merchant_id')
    .in('id', productIds)
    .eq('merchant_id', merchant_id)

  if (!products || products.length !== productIds.length) {
    return NextResponse.json({ error: 'Algunos productos no están disponibles' }, { status: 400 })
  }

  const unavailable = products.filter(p => !p.is_available)
  if (unavailable.length > 0) {
    return NextResponse.json({
      error: `Productos no disponibles: ${unavailable.map(p => p.name).join(', ')}`,
    }, { status: 400 })
  }

  // 3. Calcular subtotal con precios reales de DB
  const priceMap = Object.fromEntries(products.map(p => [p.id, Number(p.price)]))
  const orderItems: CartItem[] = items.map(item => ({
    ...item,
    price: priceMap[item.product_id] ?? item.price,
  }))

  const subtotal = orderItems.reduce((sum, item) => {
    const modTotal = (item.modifiers ?? []).reduce((ms, m) => ms + m.price_addition, 0)
    return sum + (item.price + modTotal) * item.quantity
  }, 0)

  if (subtotal < Number(merchant.min_order_amount)) {
    return NextResponse.json({
      error: `Pedido mínimo: Bs. ${merchant.min_order_amount}`,
    }, { status: 400 })
  }

  // 4. Calcular tarifas
  const R = 6371
  const dLat = (delivery_lat - merchant.lat) * Math.PI / 180
  const dLng = (delivery_lng - merchant.lng) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(merchant.lat * Math.PI / 180) * Math.cos(delivery_lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  const distance_km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const { data: settingsRows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['base_fee', 'fee_per_km', 'service_fee_pct'])

  const settings = Object.fromEntries((settingsRows ?? []).map(s => [s.key, parseFloat(s.value)]))
  const base_fee = settings['base_fee'] ?? 10
  const fee_per_km = settings['fee_per_km'] ?? 2
  const service_fee_pct = settings['service_fee_pct'] ?? 5

  const delivery_fee = parseFloat((base_fee + distance_km * fee_per_km).toFixed(2))
  const service_fee = parseFloat((subtotal * service_fee_pct / 100).toFixed(2))
  const total_fee = parseFloat((subtotal + delivery_fee + service_fee + (tip_amount ?? 0)).toFixed(2))

  // 5. Crear order
  const { data: order, error: orderErr } = await supabase.from('orders').insert({
    // Actores
    customer_id: user.id,
    merchant_id,
    dispatcher_id: null,

    // Pickup = merchant
    pickup_address: merchant.address,
    pickup_lat: merchant.lat,
    pickup_lng: merchant.lng,
    pickup_contact_name: merchant.name,

    // Delivery = cliente
    delivery_address,
    delivery_lat,
    delivery_lng,
    delivery_contact_name: user.user_metadata?.full_name ?? null,
    delivery_notes: customer_notes ?? null,

    // Items y precios
    order_items: orderItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    service_fee,
    delivery_fee,
    base_fee,
    total_fee,
    tip_amount: tip_amount ?? 0,
    distance_km: parseFloat(distance_km.toFixed(2)),

    // Estado inicial: merchant debe aceptar primero
    status: 'pending',
    merchant_status: 'pending',
    payment_method,
    payment_status: payment_method === 'cash' ? 'pending' : 'pending',

    estimated_prep_time_min: merchant.avg_prep_time_min,
    customer_notes: customer_notes ?? null,
  }).select().single()

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 })

  // 6. Historial de estado
  await supabase.from('order_status_history').insert({
    order_id: order.id,
    status: 'pending',
    changed_by: user.id,
    notes: 'Pedido creado por cliente',
  })

  return NextResponse.json({ data: order }, { status: 201 })
}
