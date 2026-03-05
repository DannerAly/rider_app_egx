import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /auth/callback
 * Callback para OAuth providers (Google, Apple, etc).
 * Supabase redirige aquí después del login social.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`)
  }

  // Verificar si tiene perfil
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Nuevo usuario OAuth → crear perfil como customer
    const fullName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuario'

    await admin.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      role: 'customer',
    })

    await admin.from('customers').upsert({
      id: user.id,
      phone: user.phone ?? null,
    })

    return NextResponse.redirect(`${origin}/customer`)
  }

  // Redirigir según rol
  const ROLE_HOME: Record<string, string> = {
    admin: '/admin', dispatcher: '/dispatcher', rider: '/rider',
    customer: '/customer', merchant: '/merchant',
  }

  return NextResponse.redirect(`${origin}${ROLE_HOME[profile.role] ?? '/customer'}`)
}
