import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoAssignRider } from '@/lib/matching-engine'

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ['accepted', 'rejected'],
  accepted:  ['preparing'],
  preparing: ['ready'],
  ready:     [],  // rider pickup happens via rider flow
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar ownership
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No eres dueño de un comercio' }, { status: 403 })

  // Obtener order actual
  const { data: order } = await supabase
    .from('orders')
    .select('id, merchant_id, merchant_status, status')
    .eq('id', orderId)
    .single()

  if (!order || order.merchant_id !== merchant.id) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  const { merchant_status: newStatus, estimated_prep_time_min } = await request.json()

  if (!newStatus) {
    return NextResponse.json({ error: 'merchant_status requerido' }, { status: 400 })
  }

  // Validar transición
  const allowed = VALID_TRANSITIONS[order.merchant_status ?? 'pending'] ?? []
  if (!allowed.includes(newStatus)) {
    return NextResponse.json({
      error: `No se puede cambiar de "${order.merchant_status}" a "${newStatus}"`,
    }, { status: 400 })
  }

  const admin = createAdminClient()
  const updates: Record<string, unknown> = { merchant_status: newStatus }

  // Acciones según el nuevo estado
  if (newStatus === 'accepted') {
    if (estimated_prep_time_min) {
      updates.estimated_prep_time_min = estimated_prep_time_min
    }
  }

  if (newStatus === 'rejected') {
    // Cancelar el pedido completamente
    updates.status = 'cancelled'
    updates.cancelled_at = new Date().toISOString()
  }

  if (newStatus === 'ready') {
    // Pedido listo para pickup → auto-assign rider
    // Se ejecuta después de actualizar el status abajo
  }

  const { error: updateError } = await admin
    .from('orders')
    .update(updates)
    .eq('id', orderId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Registrar en historial
  await admin.from('order_status_history').insert({
    order_id: orderId,
    status: newStatus === 'rejected' ? 'cancelled' : order.status,
    notes: `Merchant: ${newStatus}`,
    changed_by: user.id,
  })

  // Notificar al cliente
  const { data: orderFull } = await admin
    .from('orders')
    .select('customer_id')
    .eq('id', orderId)
    .single()

  if (orderFull?.customer_id) {
    const notifMessages: Record<string, { title: string; body: string }> = {
      accepted:  { title: 'Pedido aceptado', body: 'El comercio está preparando tu pedido' },
      preparing: { title: 'En preparación', body: 'Tu pedido se está preparando' },
      ready:     { title: 'Pedido listo', body: 'Tu pedido está listo. Buscando un rider...' },
      rejected:  { title: 'Pedido cancelado', body: 'El comercio no pudo aceptar tu pedido' },
    }

    const notif = notifMessages[newStatus]
    if (notif) {
      await admin.from('notifications').insert({
        user_id: orderFull.customer_id,
        title: notif.title,
        body: notif.body,
        type: `merchant_${newStatus}`,
        data: { order_id: orderId },
      })
    }
  }

  // Auto-assign rider cuando el pedido está listo
  let assignResult = null
  if (newStatus === 'ready') {
    assignResult = await autoAssignRider(admin, orderId)
  }

  return NextResponse.json({
    message: `Estado actualizado a ${newStatus}`,
    auto_assign: assignResult,
  })
}
