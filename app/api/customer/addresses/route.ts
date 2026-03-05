import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { label, address, lat, lng, instructions, is_default } = body

  if (!address || !lat || !lng) {
    return NextResponse.json({ error: 'Dirección y coordenadas son requeridas' }, { status: 400 })
  }

  // Si es default, desmarcar las demás
  if (is_default) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', user.id)
  }

  const { data, error } = await supabase
    .from('customer_addresses')
    .insert({
      customer_id: user.id,
      label: label ?? 'Casa',
      address,
      lat,
      lng,
      instructions: instructions ?? null,
      is_default: is_default ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', id)
    .eq('customer_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Dirección eliminada' })
}
