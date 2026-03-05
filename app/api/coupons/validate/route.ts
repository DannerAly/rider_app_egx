import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/coupons/validate
 * Valida un cupón y retorna el descuento aplicable.
 * Body: { code: string, subtotal: number, merchant_id?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { code, subtotal, merchant_id } = await request.json()
  if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

  const admin = createAdminClient()

  // Buscar cupón
  const { data: coupon } = await admin
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single()

  if (!coupon) {
    return NextResponse.json({ valid: false, error: 'Cupón no encontrado' })
  }

  // Verificar vigencia
  const now = new Date()
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return NextResponse.json({ valid: false, error: 'Cupón aún no vigente' })
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return NextResponse.json({ valid: false, error: 'Cupón expirado' })
  }

  // Verificar usos globales
  if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
    return NextResponse.json({ valid: false, error: 'Cupón agotado' })
  }

  // Verificar usos por usuario
  if (coupon.max_uses_per_user) {
    const { count } = await admin
      .from('coupon_usages')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('user_id', user.id)

    if ((count ?? 0) >= coupon.max_uses_per_user) {
      return NextResponse.json({ valid: false, error: 'Ya usaste este cupón' })
    }
  }

  // Verificar monto mínimo
  if (subtotal && Number(subtotal) < Number(coupon.min_order_amount)) {
    return NextResponse.json({
      valid: false,
      error: `Pedido mínimo: Bs. ${coupon.min_order_amount}`,
    })
  }

  // Verificar merchant específico
  if (coupon.merchant_id && merchant_id && coupon.merchant_id !== merchant_id) {
    return NextResponse.json({ valid: false, error: 'Cupón no aplica para este comercio' })
  }

  // Calcular descuento
  let discount = 0
  if (coupon.discount_type === 'percentage') {
    discount = (Number(subtotal) || 0) * Number(coupon.discount_value) / 100
    if (coupon.max_discount) {
      discount = Math.min(discount, Number(coupon.max_discount))
    }
  } else {
    discount = Number(coupon.discount_value)
  }

  discount = parseFloat(discount.toFixed(2))

  return NextResponse.json({
    valid: true,
    coupon_id: coupon.id,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
    discount,
    description: coupon.description,
  })
}
