import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Obtener merchant del usuario
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No eres dueño de un comercio' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // filter by merchant_status
  const limit = parseInt(searchParams.get('limit') ?? '100')

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, tracking_code, status, merchant_status,
      order_items, subtotal, service_fee, delivery_fee, tip_amount, total_fee,
      customer_notes, estimated_prep_time_min, payment_method, payment_status,
      delivery_address, delivery_contact_name,
      created_at, assigned_at, picked_up_at, delivered_at,
      riders:rider_id(profiles(full_name, phone)),
      customers:customer_id(profiles(full_name, phone))
    `)
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('merchant_status', status)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
