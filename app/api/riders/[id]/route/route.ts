import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

  // Fecha: por defecto hoy en Bolivia (UTC-4)
  const dateParam = req.nextUrl.searchParams.get('date')
  const date = dateParam ?? new Date().toISOString().slice(0, 10)

  const from = `${date}T00:00:00+00:00`
  const to   = `${date}T23:59:59+00:00`

  const { data: points, error } = await supabase
    .from('rider_location_history')
    .select('lat, lng, heading, speed_kmh, recorded_at')
    .eq('rider_id', id)
    .gte('recorded_at', from)
    .lte('recorded_at', to)
    .order('recorded_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ points: points ?? [] })
}
