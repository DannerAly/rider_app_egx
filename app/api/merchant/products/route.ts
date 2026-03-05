import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getMerchantForUser(supabase: any, userId: string) {
  const { data } = await supabase.from('merchants').select('id').eq('owner_id', userId).single()
  return data?.id ?? null
}

// POST: Crear producto
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const merchantId = await getMerchantForUser(supabase, user.id)
  if (!merchantId) return NextResponse.json({ error: 'No eres dueño de un comercio' }, { status: 403 })

  const body = await request.json()
  const { name, description, price, category_id, image_url, prep_time_min } = body

  if (!name || price === undefined) {
    return NextResponse.json({ error: 'Nombre y precio son requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      merchant_id: merchantId,
      category_id: category_id ?? null,
      name,
      description: description ?? null,
      price,
      image_url: image_url ?? null,
      prep_time_min: prep_time_min ?? 15,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
