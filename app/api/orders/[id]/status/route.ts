import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type OrderStatus =
  | 'pending' | 'assigned' | 'heading_to_pickup'
  | 'picked_up' | 'in_transit' | 'delivered'
  | 'cancelled' | 'failed'

const CUSTOMER_NOTIF: Partial<Record<OrderStatus, { title: string; body: string }>> = {
  assigned:          { title: 'Rider asignado',     body: 'Un rider ha sido asignado a tu pedido' },
  heading_to_pickup: { title: 'Rider en camino',    body: 'El rider va camino al comercio a recoger tu pedido' },
  picked_up:         { title: 'Pedido recogido',    body: 'El rider ya recogió tu pedido y va en camino' },
  in_transit:        { title: 'En camino',           body: 'Tu pedido está en camino a tu dirección' },
  delivered:         { title: 'Pedido entregado',    body: '¡Tu pedido ha sido entregado! Buen provecho' },
  cancelled:         { title: 'Pedido cancelado',    body: 'Tu pedido ha sido cancelado' },
}

const TIMESTAMP_FIELD: Partial<Record<OrderStatus, string>> = {
  assigned:    'assigned_at',
  picked_up:   'picked_up_at',
  delivered:   'delivered_at',
  cancelled:   'cancelled_at',
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase  = await createClient()
  const { id }    = await params
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { status, notes, delivery_photo_url } = await request.json() as {
    status: OrderStatus; notes?: string; delivery_photo_url?: string
  }

  if (!status) return NextResponse.json({ error: 'status requerido' }, { status: 400 })

  const update: Record<string, unknown> = { status }
  const tsField = TIMESTAMP_FIELD[status]
  if (tsField) update[tsField] = new Date().toISOString()
  if (delivery_photo_url) update.delivery_photo_url = delivery_photo_url

  const { data, error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Registrar en historial
  await supabase.from('order_status_history').insert({
    order_id: id, status, notes: notes ?? null, changed_by: user.id,
  })

  // Si se entregó, incrementar contador del rider
  if (status === 'delivered' && data.rider_id) {
    try {
      await supabase.rpc('increment_rider_deliveries', { rider_id: data.rider_id })
    } catch { /* función opcional, no bloquea */ }
  }

  // Notificar al rider por push si se le asigna
  if (status === 'assigned' && data.rider_id) {
    import('@/lib/web-push').then(({ sendPushToUser }) => {
      sendPushToUser(data.rider_id, {
        title: 'Nuevo pedido asignado',
        body: `Pedido ${data.order_number} te ha sido asignado`,
        url: '/rider',
      }).catch(() => {})
    }).catch(() => {})
  }

  // Notificar al cliente en cada cambio de estado
  const notif = CUSTOMER_NOTIF[status]
  if (notif && data.customer_id) {
    const admin = createAdminClient()
    await admin.from('notifications').insert({
      user_id: data.customer_id,
      title: notif.title,
      body: notif.body,
      type: `order_${status}`,
      data: { order_id: id },
    })

    // Push notification al cliente
    import('@/lib/web-push').then(({ sendPushToUser }) => {
      sendPushToUser(data.customer_id, {
        title: notif.title,
        body: notif.body,
        url: `/customer/orders/${id}`,
      }).catch(() => {})
    }).catch(() => {})
  }

  // Si se entregó: liberar rider + confirmar pago + acreditar wallet
  if (status === 'delivered' && data.rider_id) {
    const admin = createAdminClient()
    await admin.from('riders').update({ status: 'available' }).eq('id', data.rider_id)

    const deliveryFee = Number(data.delivery_fee ?? 0)
    const tipAmount = Number(data.tip_amount ?? 0)

    // Auto-confirmar pago si es efectivo
    if (data.payment_method === 'cash' && data.payment_status !== 'paid') {
      const amount = Number(data.total_fee)

      const { data: merchant } = await admin
        .from('merchants')
        .select('commission_pct')
        .eq('id', data.merchant_id)
        .single()

      const commissionPct = Number(merchant?.commission_pct ?? 15)
      const commissionAmount = parseFloat((amount * commissionPct / 100).toFixed(2))
      const riderPayout = parseFloat((deliveryFee + tipAmount).toFixed(2))
      const merchantPayout = parseFloat((amount - commissionAmount - riderPayout).toFixed(2))

      await admin.from('payments').insert({
        order_id: id,
        customer_id: data.customer_id,
        amount,
        payment_method: 'cash',
        status: 'succeeded',
        paid_at: new Date().toISOString(),
        commission_pct: commissionPct,
        commission_amount: commissionAmount,
        merchant_payout: merchantPayout,
        rider_payout: riderPayout,
        platform_fee: commissionAmount,
      })

      await admin.from('orders').update({ payment_status: 'paid' }).eq('id', id)
    }

    // Acreditar wallet del rider: delivery fee + propina
    try {
      if (deliveryFee > 0) {
        await admin.rpc('credit_rider_wallet', {
          p_rider_id: data.rider_id,
          p_amount: deliveryFee,
          p_category: 'delivery_fee',
          p_description: `Entrega #${data.order_number}`,
          p_order_id: id,
        })
      }

      if (tipAmount > 0) {
        await admin.rpc('credit_rider_wallet', {
          p_rider_id: data.rider_id,
          p_amount: tipAmount,
          p_category: 'tip',
          p_description: `Propina pedido #${data.order_number}`,
          p_order_id: id,
        })
      }
    } catch { /* wallet function may not exist yet */ }
  }

  return NextResponse.json({ data })
}
