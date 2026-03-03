import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('settings').select('key, value, label').order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin')
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })

  const updates: { key: string; value: string }[] = await req.json()

  for (const { key, value } of updates) {
    await supabase.from('settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)
  }

  return NextResponse.json({ ok: true })
}
