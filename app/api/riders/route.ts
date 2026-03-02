import { NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  // Verificar que quien llama es admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins pueden crear riders' }, { status: 403 })
  }

  const body = await request.json()
  const { full_name, email, password, phone, vehicle_type, vehicle_plate, vehicle_model, zone_id } = body

  if (!full_name || !email || !password || !vehicle_type) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Crear usuario en Supabase Auth (sin email de confirmación)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authError) {
    const msg = authError.message.includes('already registered')
      ? 'Ya existe un usuario con ese correo'
      : authError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const newUserId = authData.user.id

  // 2. Actualizar profile con rol y datos
  await admin.from('profiles').update({
    role:      'rider',
    full_name,
    phone:     phone ?? null,
  }).eq('id', newUserId)

  // 3. Crear fila en riders
  const { error: riderError } = await admin.from('riders').insert({
    id:            newUserId,
    vehicle_type,
    vehicle_plate: vehicle_plate ?? null,
    vehicle_model: vehicle_model ?? null,
    zone_id:       zone_id       ?? null,
  })

  if (riderError) {
    // Limpiar usuario creado si falla la inserción del rider
    await admin.auth.admin.deleteUser(newUserId)
    return NextResponse.json({ error: riderError.message }, { status: 500 })
  }

  return NextResponse.json({
    data: { id: newUserId, email, full_name },
    message: 'Rider creado correctamente',
  }, { status: 201 })
}
