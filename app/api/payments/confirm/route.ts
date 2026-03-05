import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/payments/confirm
 * Confirma pagos manuales: efectivo (rider cobra) o QR (verificación manual).
 * Body: { order_id, payment_method: 'cash' | 'qr' }
 *
 * Para QR: en el futuro se integrará con la pasarela QR de Bolivia.
 * Para efectivo: el rider confirma al entregar.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { order_id, payment_method } = await request.json() as {
    order_id: string
    payment_method: 'cash' | 'qr'
  }

  if (!order_id || !payment_method) {
    return NextResponse.json({ error: 'order_id y payment_method requeridos' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar la orden existe y el usuario tiene permisos (rider o admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: order } = await admin
    .from('orders')
    .select('id, total_fee, customer_id, rider_id, merchant_id, payment_status, delivery_fee, tip_amount')
    .eq('id', order_id)
    .single()

  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (order.payment_status === 'paid') return NextResponse.json({ error: 'Ya pagado' }, { status: 400 })

  // Permisos: rider/admin para cash, customer/rider/admin para QR
  const isCustomer = order.customer_id === user.id
  const isRider = order.rider_id === user.id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'dispatcher'

  if (payment_method === 'cash' && !isRider && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado para confirmar pago en efectivo' }, { status: 403 })
  }
  if (payment_method === 'qr' && !isCustomer && !isRider && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado para confirmar pago QR' }, { status: 403 })
  }

  const amount = Number(order.total_fee)

  // Obtener comisión del merchant
  const { data: merchant } = await admin
    .from('merchants')
    .select('commission_pct')
    .eq('id', order.merchant_id)
    .single()

  const commissionPct = Number(merchant?.commission_pct ?? 15)
  const commissionAmount = parseFloat((amount * commissionPct / 100).toFixed(2))
  const riderPayout = parseFloat((Number(order.delivery_fee ?? 0) + Number(order.tip_amount ?? 0)).toFixed(2))
  const merchantPayout = parseFloat((amount - commissionAmount - riderPayout).toFixed(2))

  // Crear registro de payment
  await admin.from('payments').insert({
    order_id: order.id,
    customer_id: order.customer_id,
    amount,
    payment_method,
    status: 'succeeded',
    paid_at: new Date().toISOString(),
    commission_pct: commissionPct,
    commission_amount: commissionAmount,
    merchant_payout: merchantPayout,
    rider_payout: riderPayout,
    platform_fee: commissionAmount,
  })

  // Actualizar orden
  await admin.from('orders').update({
    payment_status: 'paid',
    payment_method,
  }).eq('id', order_id)

  return NextResponse.json({
    message: 'Pago confirmado',
    breakdown: {
      total: amount,
      commission_pct: commissionPct,
      commission_amount: commissionAmount,
      merchant_payout: merchantPayout,
      rider_payout: riderPayout,
    },
  })
}
