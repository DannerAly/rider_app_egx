'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Package } from 'lucide-react'

const ROLE_REDIRECT: Record<string, string> = {
  admin:      '/admin',
  dispatcher: '/dispatcher',
  rider:      '/rider',
  customer:   '/orders',
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Correo o contraseña incorrectos.')
      setIsLoading(false)
      return
    }

    // Obtener rol para redirigir
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      setError(`No se pudo obtener el perfil del usuario. (${profileError?.message ?? 'sin datos'})`)
      setIsLoading(false)
      return
    }

    const redirect = ROLE_REDIRECT[profile.role] ?? '/'
    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-semibold text-xl tracking-tight">rider-egx</span>
      </div>

      <h1 className="text-white text-2xl font-semibold mb-1">Iniciar sesión</h1>
      <p className="text-zinc-400 text-sm mb-8">Ingresa tus credenciales para continuar</p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-300 text-sm font-medium">Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            className="bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-300 text-sm font-medium">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded-lg px-3.5 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
