import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const formData = await request.formData()
  const file = formData.get('photo') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `delivery-photos/${id}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('delivery-photos')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('delivery-photos')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
