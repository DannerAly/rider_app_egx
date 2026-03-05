import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, phone } = body

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, contraseña y nombre son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Crear usuario en auth.users con metadata
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Este correo ya está registrado' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // Actualizar profile con role=customer y teléfono
    // (el trigger handle_new_user ya creó el profile con full_name)
    await supabase
      .from('profiles')
      .update({ role: 'customer', phone: phone || null })
      .eq('id', userId)

    // Crear registro en customers
    await supabase
      .from('customers')
      .insert({ id: userId })

    return NextResponse.json(
      { message: 'Cuenta creada exitosamente', userId },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
