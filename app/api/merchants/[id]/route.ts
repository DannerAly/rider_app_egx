import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('merchants')
    .select(`
      *,
      profiles:owner_id(full_name, phone),
      merchant_categories:category_id(name, slug, icon),
      zones:zone_id(name)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  // Admin o el dueño del merchant
  const { data: merchant } = await supabase
    .from('merchants').select('owner_id').eq('id', id).single()

  if (profile?.role !== 'admin' && merchant?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()

  // Campos que el merchant owner puede actualizar
  const allowedFields = [
    'name', 'description', 'logo_url', 'banner_url', 'phone', 'email',
    'address', 'lat', 'lng', 'opening_hours', 'avg_prep_time_min', 'min_order_amount',
  ]
  // Campos adicionales solo para admin
  const adminFields = ['commission_pct', 'zone_id', 'category_id', 'is_active', 'is_featured']

  const updates: Record<string, unknown> = {}
  const fields = profile?.role === 'admin' ? [...allowedFields, ...adminFields] : allowedFields

  for (const key of fields) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('merchants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins pueden eliminar comercios' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('merchants').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Comercio eliminado' })
}
