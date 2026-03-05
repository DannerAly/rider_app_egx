import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { pin } = await request.json() as { pin: string }

  if (!pin || pin.length !== 4) {
    return NextResponse.json({ error: 'PIN debe ser de 4 dígitos' }, { status: 400 })
  }

  // Verificar que el rider es el asignado al pedido
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, pickup_pin, pin_verified_at, rider_id, status')
    .eq('id', id)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  if (order.rider_id !== user.id) {
    return NextResponse.json({ error: 'Solo el rider asignado puede verificar el PIN' }, { status: 403 })
  }

  if (order.pin_verified_at) {
    return NextResponse.json({ error: 'PIN ya fue verificado', verified: true }, { status: 400 })
  }

  if (!order.pickup_pin) {
    return NextResponse.json({ error: 'Este pedido no tiene PIN' }, { status: 400 })
  }

  if (order.pickup_pin !== pin) {
    return NextResponse.json({ error: 'PIN incorrecto', verified: false }, { status: 400 })
  }

  // Marcar como verificado
  await supabase
    .from('orders')
    .update({ pin_verified_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ verified: true, message: 'PIN verificado correctamente' })
}
