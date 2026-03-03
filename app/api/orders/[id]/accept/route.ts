import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id }   = await params
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar que el rider no tenga ya un pedido activo
  const { data: activeOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('rider_id', user.id)
    .in('status', ['assigned', 'heading_to_pickup', 'picked_up', 'in_transit'])
    .limit(1)
    .single()

  if (activeOrder) {
    return NextResponse.json(
      { error: 'Ya tienes un pedido activo. Termínalo antes de aceptar otro.' },
      { status: 409 }
    )
  }

  // Aceptar el pedido atómicamente — solo funciona si sigue pending y sin rider
  const { data, error } = await supabase
    .from('orders')
    .update({
      rider_id:    user.id,
      status:      'assigned',
      assigned_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .is('rider_id', null)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'El pedido ya fue tomado por otro rider o no está disponible.' },
      { status: 409 }
    )
  }

  // Registrar en historial
  await supabase.from('order_status_history').insert({
    order_id:   id,
    status:     'assigned',
    notes:      'Aceptado por el rider',
    changed_by: user.id,
  })

  // Actualizar estado del rider a busy
  await supabase.from('riders').update({ status: 'busy' }).eq('id', user.id)

  // Push de confirmación
  import('@/lib/web-push').then(({ sendPushToUser }) => {
    sendPushToUser(user.id, {
      title: 'Pedido aceptado',
      body: `Has aceptado el pedido ${data.order_number}`,
      url: '/rider',
    }).catch(() => {})
  }).catch(() => {})

  return NextResponse.json({ data })
}
