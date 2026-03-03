import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      riders(id, vehicle_type, vehicle_plate, profiles(full_name, phone)),
      zones(name),
      profiles!orders_dispatcher_id_fkey(full_name)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()

  // ── Cancelar ─────────────────────────────────────────────────────────────
  if (body.action === 'cancel') {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)
      .not('status', 'in', '("delivered","cancelled","failed")')
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'No se pudo cancelar' }, { status: 400 })

    await supabase.from('order_status_history').insert({
      order_id: id, status: 'cancelled',
      notes: body.reason ?? 'Cancelado por administrador',
      changed_by: user.id,
    })

    // Liberar rider si estaba asignado
    if (data.rider_id) {
      await supabase.from('riders').update({ status: 'available' }).eq('id', data.rider_id)
    }

    return NextResponse.json({ data })
  }

  // ── Reasignar rider ───────────────────────────────────────────────────────
  if (body.action === 'reassign') {
    const riderId = body.rider_id  // null = quitar rider

    // Obtener order actual para liberar rider anterior
    const { data: currentOrder } = await supabase
      .from('orders').select('rider_id, status').eq('id', id).single()

    if (currentOrder?.rider_id && currentOrder.rider_id !== riderId) {
      await supabase.from('riders').update({ status: 'available' }).eq('id', currentOrder.rider_id)
    }

    const newStatus = riderId ? 'assigned' : 'pending'
    const update: Record<string, unknown> = {
      rider_id: riderId,
      status:   newStatus,
    }
    if (riderId) update.assigned_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('orders').update(update).eq('id', id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (riderId) {
      await supabase.from('riders').update({ status: 'busy' }).eq('id', riderId)
      await supabase.from('order_status_history').insert({
        order_id: id, status: 'assigned',
        notes: 'Reasignado manualmente',
        changed_by: user.id,
      })
    }

    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
