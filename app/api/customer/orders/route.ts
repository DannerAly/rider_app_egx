import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')?.trim()

  if (!phone || phone.length < 6) {
    return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 })
  }

  const supabase = await createClient()

  // Buscar pedidos donde el teléfono del cliente coincida
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, tracking_code, pickup_address, delivery_address, delivery_contact_name, total_fee, created_at, delivered_at, delivery_photo_url')
    .or(`customer_phone.eq.${phone},delivery_contact_phone.eq.${phone}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}
