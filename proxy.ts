import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Rutas públicas
  const publicPaths = ['/login', '/register', '/track', '/unauthorized']
  if (publicPaths.some(p => path.startsWith(p))) return supabaseResponse

  // Sin sesión → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Obtener rol
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined

  // Proteger rutas por rol
  if (path.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
  if (path.startsWith('/dispatcher') && !['admin', 'dispatcher'].includes(role ?? '')) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
  if (path.startsWith('/rider') && role !== 'rider') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg).*)'],
}
