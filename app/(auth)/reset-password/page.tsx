'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Package, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [show,      setShow]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 8)  { setError('Mínimo 8 caracteres'); return }

    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) { setError('No se pudo actualizar. El enlace puede haber expirado.'); return }
    router.push('/login')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-semibold text-xl tracking-tight">rider-egx</span>
      </div>

      <h1 className="text-white text-2xl font-semibold mb-1">Nueva contraseña</h1>
      <p className="text-zinc-400 text-sm mb-8">Elige una contraseña segura para tu cuenta.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-300 text-sm font-medium">Nueva contraseña</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'} required minLength={8}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 pr-10 transition-colors"
            />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-300 text-sm font-medium">Confirmar contraseña</label>
          <input
            type={show ? 'text' : 'password'} required
            value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Repite la contraseña"
            className="bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {error && <p className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded-lg px-3.5 py-2.5">{error}</p>}

        <button type="submit" disabled={loading}
          className="mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2.5 text-sm flex items-center justify-center gap-2 transition-colors">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
      </form>
    </div>
  )
}
