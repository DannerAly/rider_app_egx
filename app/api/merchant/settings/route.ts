import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Datos del merchant actual
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: 'No eres dueño de un comercio' }, { status: 403 })
  return NextResponse.json({ data })
}

// PATCH: Actualizar datos del merchant
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No eres dueño de un comercio' }, { status: 403 })

  const body = await request.json()
  const allowed = ['name', 'description', 'phone', 'email', 'address', 'lat', 'lng', 'opening_hours', 'avg_prep_time_min', 'min_order_amount', 'logo_url', 'banner_url']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('merchants')
    .update(updates)
    .eq('id', merchant.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
