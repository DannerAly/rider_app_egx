import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type OrderStatus =
  | 'pending' | 'assigned' | 'heading_to_pickup'
  | 'picked_up' | 'in_transit' | 'delivered'
  | 'cancelled' | 'failed'

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

  return NextResponse.json({ data })
}
