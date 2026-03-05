import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── GET: Obtener mensajes de un pedido (paginados, más recientes primero) ──
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params
  const supabase = await createClient()

  // Verificar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar que el usuario es participante del pedido
  const admin = createAdminClient()
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, customer_id, rider_id, status')
    .eq('id', orderId)
    .single()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  const isParticipant = order.customer_id === user.id || order.rider_id === user.id
  if (!isParticipant) {
    // Permitir admins/dispatchers también
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'dispatcher'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos para ver estos mensajes' }, { status: 403 })
    }
  }

  // Paginación
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(url.searchParams.get('offset') ?? '0')

  const { data: messages, error, count } = await admin
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: messages ?? [],
    pagination: {
      total: count ?? 0,
      limit,
      offset,
    },
  })
}

// ── POST: Enviar mensaje ──────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params
  const supabase = await createClient()

  // Verificar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Obtener perfil del usuario para determinar sender_role
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  // Verificar que el pedido existe y el usuario es participante
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, customer_id, rider_id, status')
    .eq('id', orderId)
    .single()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  const isParticipant = order.customer_id === user.id || order.rider_id === user.id
  if (!isParticipant) {
    return NextResponse.json({ error: 'No eres participante de este pedido' }, { status: 403 })
  }

  // Verificar que el pedido está activo (no terminado)
  const terminalStatuses = ['delivered', 'cancelled', 'failed']
  if (terminalStatuses.includes(order.status)) {
    return NextResponse.json(
      { error: 'No se pueden enviar mensajes a un pedido finalizado' },
      { status: 400 }
    )
  }

  // Parsear y validar body
  let body: { content?: string; msg_type?: string; metadata?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 })
  }

  const { content, msg_type = 'text', metadata } = body

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'content es requerido y debe ser texto' }, { status: 400 })
  }

  if (content.length > 1000) {
    return NextResponse.json({ error: 'El mensaje no puede exceder 1000 caracteres' }, { status: 400 })
  }

  const validTypes = ['text', 'image', 'location', 'system']
  if (!validTypes.includes(msg_type)) {
    return NextResponse.json(
      { error: `msg_type invalido. Valores permitidos: ${validTypes.join(', ')}` },
      { status: 400 }
    )
  }

  // Solo admins pueden enviar mensajes de tipo 'system'
  if (msg_type === 'system' && !['admin', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json(
      { error: 'Solo administradores pueden enviar mensajes de sistema' },
      { status: 403 }
    )
  }

  // Determinar sender_role basado en la relación con el pedido
  let senderRole: string
  if (order.customer_id === user.id) {
    senderRole = 'customer'
  } else if (order.rider_id === user.id) {
    senderRole = 'rider'
  } else {
    senderRole = profile.role // admin o dispatcher
  }

  // Insertar mensaje usando admin client para bypass de RLS
  const { data: message, error: insertErr } = await admin
    .from('messages')
    .insert({
      order_id: orderId,
      sender_id: user.id,
      sender_role: senderRole,
      content: content.trim(),
      msg_type: msg_type,
      metadata: metadata ?? null,
    })
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Crear notificacion push para el otro participante
  const recipientId = order.customer_id === user.id ? order.rider_id : order.customer_id
  if (recipientId) {
    try {
      await admin.from('notifications').insert({
        user_id: recipientId,
        title: 'Nuevo mensaje',
        body: content.trim().length > 80 ? content.trim().slice(0, 80) + '...' : content.trim(),
        type: 'chat_message',
        data: { order_id: orderId, message_id: message.id },
      })
    } catch { /* notification is best-effort */ }

    // Push notification
    import('@/lib/web-push').then(({ sendPushToUser }) => {
      sendPushToUser(recipientId, {
        title: 'Nuevo mensaje',
        body: content.trim().length > 80 ? content.trim().slice(0, 80) + '...' : content.trim(),
        url: senderRole === 'rider'
          ? `/customer/orders/${orderId}`
          : `/rider`,
      }).catch(() => {})
    }).catch(() => {})
  }

  return NextResponse.json({ data: message }, { status: 201 })
}
