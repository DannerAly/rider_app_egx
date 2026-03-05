import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

/**
 * POST /api/payments/webhook
 * Webhook de Stripe para confirmar pagos.
 * Stripe envía eventos cuando un PaymentIntent se completa, falla, etc.
 */
export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Sin firma' }, { status: 400 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  const admin = createAdminClient()

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object
      const orderId = pi.metadata.order_id

      // Actualizar payment
      await admin.from('payments')
        .update({
          status: 'succeeded',
          paid_at: new Date().toISOString(),
        })
        .eq('stripe_payment_intent_id', pi.id)

      // Actualizar orden
      if (orderId) {
        await admin.from('orders')
          .update({ payment_status: 'paid' })
          .eq('id', orderId)

        // Notificar al cliente
        const { data: order } = await admin
          .from('orders')
          .select('customer_id, order_number')
          .eq('id', orderId)
          .single()

        if (order?.customer_id) {
          await admin.from('notifications').insert({
            user_id: order.customer_id,
            title: 'Pago confirmado',
            body: `Tu pago para el pedido ${order.order_number} fue procesado exitosamente`,
            type: 'payment_succeeded',
            data: { order_id: orderId },
          })
        }
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object
      const orderId = pi.metadata.order_id

      await admin.from('payments')
        .update({
          status: 'failed',
          failure_reason: pi.last_payment_error?.message ?? 'Pago fallido',
        })
        .eq('stripe_payment_intent_id', pi.id)

      if (orderId) {
        await admin.from('orders')
          .update({ payment_status: 'pending' })
          .eq('id', orderId)
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object
      const piId = charge.payment_intent

      if (piId) {
        await admin.from('payments')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', piId)

        // Buscar orden para actualizar
        const { data: payment } = await admin
          .from('payments')
          .select('order_id')
          .eq('stripe_payment_intent_id', piId)
          .single()

        if (payment?.order_id) {
          await admin.from('orders')
            .update({ payment_status: 'refunded' })
            .eq('id', payment.order_id)
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
