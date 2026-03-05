import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getMerchantForUser(supabase: any, userId: string) {
  const { data } = await supabase.from('merchants').select('id').eq('owner_id', userId).single()
  return data?.id ?? null
}

async function verifyProductOwnership(supabase: any, productId: string, merchantId: string) {
  const { data } = await supabase.from('products').select('merchant_id').eq('id', productId).single()
  return data?.merchant_id === merchantId
}

// POST: Crear grupo de modificadores con sus opciones
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const merchantId = await getMerchantForUser(supabase, user.id)
  if (!merchantId) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const owns = await verifyProductOwnership(supabase, productId, merchantId)
  if (!owns) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  const { name, min_selections, max_selections, is_required, modifiers } = await request.json()
  if (!name) return NextResponse.json({ error: 'Nombre del grupo requerido' }, { status: 400 })

  // Crear grupo
  const { data: group, error: groupError } = await supabase
    .from('modifier_groups')
    .insert({
      product_id: productId,
      name,
      min_selections: min_selections ?? 0,
      max_selections: max_selections ?? 1,
      is_required: is_required ?? false,
    })
    .select()
    .single()

  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 })

  // Crear modificadores si se enviaron
  if (modifiers && Array.isArray(modifiers) && modifiers.length > 0) {
    const rows = modifiers.map((m: any, i: number) => ({
      modifier_group_id: group.id,
      name: m.name,
      price_addition: m.price_addition ?? 0,
      sort_order: i,
    }))

    const { error: modError } = await supabase.from('modifiers').insert(rows)
    if (modError) return NextResponse.json({ error: modError.message }, { status: 500 })
  }

  // Retornar grupo con modifiers
  const { data: full } = await supabase
    .from('modifier_groups')
    .select('*, modifiers(*)')
    .eq('id', group.id)
    .single()

  return NextResponse.json({ data: full }, { status: 201 })
}

// DELETE: Eliminar grupo de modificadores
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const merchantId = await getMerchantForUser(supabase, user.id)
  if (!merchantId) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const owns = await verifyProductOwnership(supabase, productId, merchantId)
  if (!owns) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')
  if (!groupId) return NextResponse.json({ error: 'groupId requerido' }, { status: 400 })

  const { error } = await supabase.from('modifier_groups').delete().eq('id', groupId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Grupo eliminado' })
}
