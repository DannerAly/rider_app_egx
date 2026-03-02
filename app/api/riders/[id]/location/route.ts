import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id }   = await params
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { lat, lng, heading, speed_kmh, accuracy_m, order_id } = await request.json()

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat y lng son requeridos' }, { status: 400 })
  }

  // Actualizar posición actual del rider
  const { error: riderError } = await supabase
    .from('riders')
    .update({
      current_lat:          lat,
      current_lng:          lng,
      current_heading:      heading ?? null,
      last_location_update: new Date().toISOString(),
    })
    .eq('id', id)

  if (riderError) return NextResponse.json({ error: riderError.message }, { status: 500 })

  // Guardar en historial solo si hay pedido activo
  if (order_id) {
    await supabase.from('rider_location_history').insert({
      rider_id: id,
      order_id,
      lat, lng,
      heading:    heading    ?? null,
      speed_kmh:  speed_kmh  ?? null,
      accuracy_m: accuracy_m ?? null,
    })
  }

  return NextResponse.json({ ok: true })
}
