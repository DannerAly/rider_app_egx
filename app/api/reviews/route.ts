import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/reviews — Crear review post-entrega
 * Body: { order_id, merchant_rating, rider_rating, comment }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { order_id, merchant_rating, rider_rating, comment } = body

  if (!order_id) return NextResponse.json({ error: 'order_id requerido' }, { status: 400 })
  if (!merchant_rating && !rider_rating) {
    return NextResponse.json({ error: 'Al menos una calificación requerida' }, { status: 400 })
  }

  // Verificar que la orden pertenece al cliente y está delivered
  const { data: order } = await supabase
    .from('orders')
    .select('id, customer_id, merchant_id, rider_id, status')
    .eq('id', order_id)
    .single()

  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (order.customer_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (order.status !== 'delivered') return NextResponse.json({ error: 'Solo pedidos entregados' }, { status: 400 })

  // Verificar que no exista review
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', order_id)
    .single()

  if (existing) return NextResponse.json({ error: 'Ya calificaste este pedido' }, { status: 400 })

  const { data, error } = await supabase.from('reviews').insert({
    order_id,
    customer_id: user.id,
    merchant_id: order.merchant_id,
    rider_id: order.rider_id,
    merchant_rating: merchant_rating ?? null,
    rider_rating: rider_rating ?? null,
    comment: comment ?? null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
