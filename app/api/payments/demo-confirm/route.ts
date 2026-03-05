import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/payments/demo-confirm
 * Simula la confirmación de pago con tarjeta en modo demo (sin Stripe real).
 * Body: { order_id: string, card_last4?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { order_id, card_last4 } = await request.json()
  if (!order_id) return NextResponse.json({ error: 'order_id requerido' }, { status: 400 })

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, customer_id, payment_status')
    .eq('id', order_id)
    .single()

  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (order.customer_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (order.payment_status === 'paid') return NextResponse.json({ error: 'Ya pagado' }, { status: 400 })

  // Actualizar payment a succeeded
  await admin.from('payments')
    .update({
      status: 'succeeded',
      paid_at: new Date().toISOString(),
      metadata: { demo: true, card_last4: card_last4 ?? '4242' },
    })
    .eq('order_id', order_id)
    .eq('payment_method', 'card')
    .eq('status', 'pending')

  // Actualizar orden
  await admin.from('orders').update({
    payment_status: 'paid',
  }).eq('id', order_id)

  // Notificar al cliente
  await admin.from('notifications').insert({
    user_id: user.id,
    title: 'Pago confirmado (Demo)',
    body: `Pago simulado con tarjeta ****${card_last4 ?? '4242'} procesado exitosamente`,
    type: 'payment_succeeded',
    data: { order_id },
  })

  return NextResponse.json({ message: 'Pago demo confirmado' })
}
