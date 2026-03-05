'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Package2, Eye, EyeOff } from 'lucide-react'

const ROLE_REDIRECT: Record<string, string> = {
  admin:      '/admin',
  dispatcher: '/dispatcher',
  rider:      '/rider',
  customer:   '/customer',
  merchant:   '/merchant',
}

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Correo o contraseña incorrectos.')
      setIsLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()

    if (profileError || !profile) {
      setError('No se pudo obtener el perfil del usuario.')
      setIsLoading(false)
      return
    }

    router.push(ROLE_REDIRECT[profile.role] ?? '/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-zinc-950 to-zinc-950 pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/30">
            <Package2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-2xl tracking-tight">rider-egx</h1>
            <p className="text-zinc-500 text-sm mt-1">Plataforma de entregas</p>
          </div>
        </div>

        {/* Card del formulario */}
        <Card className="border-zinc-800 bg-zinc-900/80 backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Iniciar sesión</CardTitle>
            <CardDescription className="text-zinc-400">
              Ingresa tus credenciales para continuar
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-zinc-300 text-sm font-medium">
                  Correo electrónico
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 text-sm font-medium">
                  Contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-600 pr-10 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-950/60 border border-red-900/60 rounded-lg px-3.5 py-2.5">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold h-10"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-zinc-900 px-2 text-zinc-500">o continúa con</span></div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${window.location.origin}/auth/callback` },
                })
              }}
              className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>

            <div className="mt-5 text-center text-sm text-zinc-600 space-y-2">
              <p>
                <a href="/forgot-password" className="text-blue-500 hover:text-blue-400 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </p>
              <p>
                ¿No tienes cuenta?{' '}
                <a href="/register" className="text-blue-500 hover:text-blue-400 transition-colors font-medium">
                  Regístrate
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
