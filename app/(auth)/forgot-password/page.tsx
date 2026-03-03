'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Package, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (err) { setError('No se pudo enviar el correo. Verifica la dirección.'); return }
    setSent(true)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-semibold text-xl tracking-tight">rider-egx</span>
      </div>

      {sent ? (
        <div className="text-center">
          <div className="w-14 h-14 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-400" />
          </div>
          <h1 className="text-white text-xl font-semibold mb-2">Revisa tu correo</h1>
          <p className="text-zinc-400 text-sm mb-6">
            Enviamos un enlace de recuperación a <strong className="text-zinc-200">{email}</strong>
          </p>
          <Link href="/login" className="text-blue-400 text-sm hover:underline flex items-center justify-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al login
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-white text-2xl font-semibold mb-1">Recuperar contraseña</h1>
          <p className="text-zinc-400 text-sm mb-8">Te enviaremos un enlace para restablecer tu contraseña.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-300 text-sm font-medium">Correo electrónico</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded-lg px-3.5 py-2.5">{error}</p>}
            <button type="submit" disabled={loading}
              className="mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2.5 text-sm flex items-center justify-center gap-2 transition-colors">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <Link href="/login" className="text-center text-zinc-500 text-sm hover:text-zinc-300 flex items-center justify-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al login
            </Link>
          </form>
        </>
      )}
    </div>
  )
}
