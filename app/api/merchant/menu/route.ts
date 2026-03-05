import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Helper: obtener el merchant del usuario autenticado
async function getMerchantForUser(supabase: any, userId: string) {
  const { data } = await supabase
    .from('merchants')
    .select('id')
    .eq('owner_id', userId)
    .single()
  return data?.id ?? null
}

// GET: Obtener categorías de menú con productos
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const merchantId = await getMerchantForUser(supabase, user.id)
  if (!merchantId) return NextResponse.json({ error: 'No eres dueño de un comercio' }, { status: 403 })

  const { data: categories, error } = await supabase
    .from('menu_categories')
    .select(`
      id, name, description, sort_order, is_active,
      products(id, name, description, price, image_url, prep_time_min, is_available, is_featured, sort_order)
    `)
    .eq('merchant_id', merchantId)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: categories, merchantId })
}

// POST: Crear categoría de menú
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const merchantId = await getMerchantForUser(supabase, user.id)
  if (!merchantId) return NextResponse.json({ error: 'No eres dueño de un comercio' }, { status: 403 })

  const { name, description, sort_order } = await request.json()
  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('menu_categories')
    .insert({ merchant_id: merchantId, name, description: description ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
