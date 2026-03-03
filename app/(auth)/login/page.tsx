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
  customer:   '/orders',
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

            <p className="mt-5 text-center text-sm text-zinc-600">
              <a href="/forgot-password" className="text-blue-500 hover:text-blue-400 transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
