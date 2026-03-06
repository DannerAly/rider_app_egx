import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const search = searchParams.get('search')

  const admin = createAdminClient()

  let query = admin
    .from('profiles')
    .select('id, full_name, phone, role, is_active, avatar_url, created_at')
    .order('created_at', { ascending: false })

  if (role) query = query.eq('role', role)
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data: profiles, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get emails from auth.users via admin API
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers.map(u => [u.id, u.email]))

  const usersWithEmail = (profiles ?? []).map(p => ({
    ...p,
    email: emailMap.get(p.id) ?? null,
  }))

  // If searching by email, filter client-side
  const filtered = search
    ? usersWithEmail.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : usersWithEmail

  return NextResponse.json({ data: filtered })
}
