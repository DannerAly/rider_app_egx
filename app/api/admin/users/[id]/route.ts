import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_ROLES = ['admin', 'dispatcher', 'rider', 'customer', 'merchant'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
  }

  const body = await request.json()
  const { role: newRole, is_active } = body

  const admin = createAdminClient()

  // Get current profile
  const { data: target } = await admin
    .from('profiles').select('role, full_name').eq('id', id).single()
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Update is_active if provided
  if (typeof is_active === 'boolean') {
    await admin.from('profiles').update({ is_active }).eq('id', id)
  }

  // Update role if provided
  if (newRole && newRole !== target.role) {
    if (!VALID_ROLES.includes(newRole)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    // Update profile role
    const { error: roleError } = await admin
      .from('profiles').update({ role: newRole }).eq('id', id)
    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 })
    }

    // Create role-specific record if needed
    if (newRole === 'merchant') {
      const slug = (target.full_name ?? 'merchant')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        + '-' + Math.random().toString(36).slice(2, 6)

      const { data: authUser } = await admin.auth.admin.getUserById(id)
      const email = authUser?.user?.email ?? ''

      await admin.from('merchants').upsert({
        owner_id: id,
        name: target.full_name ?? 'Nuevo Comercio',
        slug,
        address: 'La Paz, Bolivia',
        lat: -16.5,
        lng: -68.15,
        email,
      }, { onConflict: 'owner_id' })
    }

    if (newRole === 'rider') {
      await admin.from('riders').upsert({
        id,
        vehicle_type: 'motorcycle',
        status: 'offline',
      }, { onConflict: 'id' })
    }

    if (newRole === 'customer') {
      await admin.from('customers').upsert({
        id,
      }, { onConflict: 'id' })
    }
  }

  return NextResponse.json({ message: 'Usuario actualizado' })
}
