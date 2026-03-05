import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getMerchantForUser(supabase: any, userId: string) {
  const { data } = await supabase.from('merchants').select('id').eq('owner_id', userId).single()
  return data?.id ?? null
}

// GET: Producto con modificadores
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      modifier_groups(
        id, name, min_selections, max_selections, is_required, sort_order,
        modifiers(id, name, price_addition, is_available, sort_order)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

// PATCH: Actualizar producto
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const merchantId = await getMerchantForUser(supabase, user.id)
  if (!merchantId) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  // Verificar que el producto pertenece al merchant
  const { data: product } = await supabase
    .from('products').select('merchant_id').eq('id', id).single()
  if (product?.merchant_id !== merchantId) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  const allowed = ['name', 'description', 'price', 'image_url', 'prep_time_min', 'is_available', 'is_featured', 'category_id', 'sort_order', 'available_from', 'available_until', 'available_days']
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('products').update(updates).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE: Eliminar producto
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const merchantId = await getMerchantForUser(supabase, user.id)
  if (!merchantId) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { data: product } = await supabase
    .from('products').select('merchant_id').eq('id', id).single()
  if (product?.merchant_id !== merchantId) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  }

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Producto eliminado' })
}
