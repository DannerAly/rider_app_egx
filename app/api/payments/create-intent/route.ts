import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { randomUUID } from 'crypto'

const DEMO_MODE = !process.env.STRIPE_SECRET_KEY

/**
 * POST /api/payments/create-intent
 * Crea un PaymentIntent de Stripe o simula uno en modo demo.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { order_id } = await request.json()
  if (!order_id) return NextResponse.json({ error: 'order_id requerido' }, { status: 400 })

  const admin = createAdminClient()

  // Obtener orden
  const { data: order } = await admin
    .from('orders')
    .select('id, total_fee, customer_id, payment_status, payment_method, merchant_id, delivery_fee, tip_amount')
    .eq('id', order_id)
    .single()

  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (order.customer_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (order.payment_status === 'paid') return NextResponse.json({ error: 'Ya pagado' }, { status: 400 })

  // Verificar si ya existe un payment para esta orden
  const { data: existingPayment } = await admin
    .from('payments')
    .select('id, stripe_payment_intent_id, stripe_client_secret, status')
    .eq('order_id', order_id)
    .eq('payment_method', 'card')
    .in('status', ['pending', 'processing'])
    .single()

  if (existingPayment?.stripe_client_secret) {
    return NextResponse.json({
      client_secret: existingPayment.stripe_client_secret,
      payment_id: existingPayment.id,
      demo: DEMO_MODE,
    })
  }

  // Obtener comisión del merchant
  const { data: merchant } = await admin
    .from('merchants')
    .select('commission_pct')
    .eq('id', order.merchant_id)
    .single()

  const commissionPct = Number(merchant?.commission_pct ?? 15)
  const amount = Number(order.total_fee)

  // Calcular comisiones
  const commissionAmount = parseFloat((amount * commissionPct / 100).toFixed(2))
  const riderPayout = parseFloat((Number(order.delivery_fee ?? 0) + Number(order.tip_amount ?? 0)).toFixed(2))
  const merchantPayout = parseFloat((amount - commissionAmount - riderPayout).toFixed(2))

  let piId: string
  let clientSecret: string

  if (DEMO_MODE) {
    // Modo demo: generar IDs ficticios
    piId = `pi_demo_${randomUUID().replace(/-/g, '').slice(0, 24)}`
    clientSecret = `${piId}_secret_demo`
  } else {
    // Modo producción: Stripe real
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'bob',
      metadata: { order_id: order.id, customer_id: user.id },
    })
    piId = paymentIntent.id
    clientSecret = paymentIntent.client_secret!
  }

  // Registrar payment
  await admin.from('payments').insert({
    order_id: order.id,
    customer_id: user.id,
    amount,
    payment_method: 'card',
    stripe_payment_intent_id: piId,
    stripe_client_secret: clientSecret,
    status: 'pending',
    commission_pct: commissionPct,
    commission_amount: commissionAmount,
    merchant_payout: merchantPayout,
    rider_payout: riderPayout,
    platform_fee: commissionAmount,
  })

  // Actualizar orden
  await admin.from('orders').update({
    stripe_payment_intent_id: piId,
    payment_method: 'card',
  }).eq('id', order_id)

  return NextResponse.json({
    client_secret: clientSecret,
    payment_id: piId,
    demo: DEMO_MODE,
  })
}
