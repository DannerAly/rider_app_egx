import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/coupons — Lista cupones (admin)
 * POST /api/coupons — Crear cupón (admin)
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('coupons')
    .select('*, merchants(name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const body = await request.json()
  const admin = createAdminClient()

  const { data, error } = await admin.from('coupons').insert({
    code: body.code?.toUpperCase().trim(),
    description: body.description,
    discount_type: body.discount_type,
    discount_value: body.discount_value,
    min_order_amount: body.min_order_amount ?? 0,
    max_discount: body.max_discount,
    max_uses: body.max_uses,
    max_uses_per_user: body.max_uses_per_user ?? 1,
    starts_at: body.starts_at ?? new Date().toISOString(),
    expires_at: body.expires_at,
    merchant_id: body.merchant_id,
    is_active: true,
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
