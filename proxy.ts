import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas que NO requieren autenticación
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/track', '/unauthorized', '/auth/callback']

// Mapeo de rol → ruta home
const ROLE_HOME: Record<string, string> = {
  admin:      '/admin',
  dispatcher: '/dispatcher',
  rider:      '/rider',
  customer:   '/customer',
  merchant:   '/merchant',
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión (obligatorio en middleware con @supabase/ssr)
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // ── Rutas públicas ──
  const isPublicPath = PUBLIC_PATHS.some(p => path.startsWith(p))

  if (isPublicPath) {
    // Si ya está autenticado y va a login/register, redirigir a su home
    if (user && (path === '/login' || path === '/register')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const home = ROLE_HOME[profile?.role ?? 'customer'] ?? '/customer'
      return NextResponse.redirect(new URL(home, request.url))
    }
    return supabaseResponse
  }

  // ── Sin sesión → login ──
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(loginUrl)
  }

  // ── Obtener rol ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined

  // Ruta raíz → home del rol
  if (path === '/') {
    return NextResponse.redirect(new URL(ROLE_HOME[role ?? 'customer'] ?? '/customer', request.url))
  }

  // ── Proteger rutas por rol ──
  // Admin tiene acceso a todo
  if (role === 'admin') return supabaseResponse

  if (path.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
  if (path.startsWith('/dispatcher') && !['admin', 'dispatcher'].includes(role ?? '')) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
  if (path.startsWith('/rider') && role !== 'rider') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
  if (path.startsWith('/merchant') && role !== 'merchant') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons/|sw\\.js|api/|.*\\..*).*)',],
}
