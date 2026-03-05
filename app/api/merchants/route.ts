import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const active = searchParams.get('active')

  let query = supabase
    .from('merchants')
    .select(`
      *,
      profiles:owner_id(full_name, phone, email:id),
      merchant_categories:category_id(name, slug, icon),
      zones:zone_id(name)
    `)
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category_id', category)
  if (active === 'true') query = query.eq('is_active', true)
  if (active === 'false') query = query.eq('is_active', false)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins pueden crear comercios' }, { status: 403 })
  }

  const body = await request.json()
  const {
    name, email, password, phone, category_id, zone_id,
    address, lat, lng, commission_pct, description,
  } = body

  if (!name || !email || !password || !address || !lat || !lng) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Crear usuario con role merchant
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (authError) {
    const msg = authError.message.includes('already registered')
      ? 'Ya existe un usuario con ese correo'
      : authError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const ownerId = authData.user.id

  // 2. Actualizar profile con role merchant
  await admin.from('profiles').update({
    role: 'merchant',
    full_name: name,
    phone: phone ?? null,
  }).eq('id', ownerId)

  // 3. Generar slug
  const slug = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Math.random().toString(36).slice(2, 6)

  // 4. Crear merchant
  const { data: merchant, error: merchantError } = await admin.from('merchants').insert({
    owner_id: ownerId,
    name,
    slug,
    description: description ?? null,
    phone: phone ?? null,
    email,
    address,
    lat,
    lng,
    category_id: category_id ?? null,
    zone_id: zone_id ?? null,
    commission_pct: commission_pct ?? 15,
  }).select().single()

  if (merchantError) {
    await admin.auth.admin.deleteUser(ownerId)
    return NextResponse.json({ error: merchantError.message }, { status: 500 })
  }

  return NextResponse.json({
    data: { id: merchant.id, owner_id: ownerId, name, email },
    message: 'Comercio creado correctamente',
  }, { status: 201 })
}
