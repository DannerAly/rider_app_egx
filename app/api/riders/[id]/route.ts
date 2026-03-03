import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  if (!profile || profile.role !== 'admin')
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })

  const body = await req.json()

  // ── Desconectar (force offline) ────────────────────────────────────────────
  if (body.status) {
    const { error } = await supabase.from('riders').update({ status: body.status }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Actualizar datos del rider ─────────────────────────────────────────────
  if (body.action === 'update') {
    const admin = createAdminClient()

    // Actualizar profile (nombre y teléfono requieren service role)
    const profileUpdate: Record<string, string> = {}
    if (body.full_name !== undefined) profileUpdate.full_name = body.full_name
    if (body.phone     !== undefined) profileUpdate.phone     = body.phone

    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await admin.from('profiles').update(profileUpdate).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Actualizar datos del rider
    const riderUpdate: Record<string, unknown> = {}
    if (body.vehicle_type  !== undefined) riderUpdate.vehicle_type  = body.vehicle_type
    if (body.vehicle_plate !== undefined) riderUpdate.vehicle_plate = body.vehicle_plate || null
    if (body.vehicle_model !== undefined) riderUpdate.vehicle_model = body.vehicle_model || null
    if (body.zone_id       !== undefined) riderUpdate.zone_id       = body.zone_id       || null

    if (Object.keys(riderUpdate).length > 0) {
      const { error } = await supabase.from('riders').update(riderUpdate).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
