'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Phone, Shield } from 'lucide-react'

const ROLE_REDIRECT: Record<string, string> = {
  admin:      '/admin',
  dispatcher: '/dispatcher',
  rider:      '/rider',
  customer:   '/customer',
  merchant:   '/merchant',
}

export default function VerifyPhonePage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step,      setStep]      = useState<1 | 2>(1)
  const [phone,     setPhone]     = useState('')
  const [digits,    setDigits]    = useState<string[]>(['', '', '', '', '', ''])
  const [error,     setError]     = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [demoOtp,   setDemoOtp]   = useState<string | null>(null)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend
  useEffect(() => {
    if (step !== 2 || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [step, countdown])

  const handleSendOtp = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+591' + phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al enviar el codigo')
        setIsLoading(false)
        return
      }

      // Check if demo mode returned the OTP
      if (data.demo && data.otp) {
        setDemoOtp(data.otp)
      }

      setStep(2)
      setCountdown(60)
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setDigits(['', '', '', '', '', ''])
    setError(null)
    await handleSendOtp()
  }

  const handleVerifyOtp = async () => {
    const code = digits.join('')
    if (code.length !== 6) {
      setError('Ingresa el codigo completo de 6 digitos')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+591' + phone, code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Codigo incorrecto')
        setIsLoading(false)
        return
      }

      // Redirect based on role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const role = profile?.role ?? 'customer'
        router.push(ROLE_REDIRECT[role] ?? '/customer')
        router.refresh()
      } else {
        router.push('/customer')
        router.refresh()
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
      setIsLoading(false)
    }
  }

  const handleDigitChange = (index: number, value: string) => {
    // Only allow numeric
    if (value && !/^\d$/.test(value)) return

    const newDigits = [...digits]
    newDigits[index] = value
    setDigits(newDigits)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 0) return

    const newDigits = [...digits]
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || ''
    }
    setDigits(newDigits)

    // Focus the last filled input or the next empty one
    const focusIndex = Math.min(pasted.length, 5)
    inputRefs.current[focusIndex]?.focus()
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-zinc-950 to-zinc-950 pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/30">
            {step === 1 ? (
              <Phone className="w-7 h-7 text-white" />
            ) : (
              <Shield className="w-7 h-7 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-white font-bold text-2xl tracking-tight">rider-egx</h1>
            <p className="text-zinc-500 text-sm mt-1">Plataforma de entregas</p>
          </div>
        </div>

        {/* Card */}
        <Card className="border-zinc-800 bg-zinc-900/80 backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">
              {step === 1 ? 'Verificacion de telefono' : 'Ingresa el codigo'}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {step === 1
                ? 'Ingresa tu numero para verificar tu cuenta'
                : `Codigo enviado a +591${phone}`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 1 ? (
              /* ---- Step 1: Phone input ---- */
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-zinc-300 text-sm font-medium">
                    Numero de telefono
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 rounded-md border border-zinc-700 bg-zinc-800/80 text-zinc-300 text-sm font-medium shrink-0">
                      +591
                    </div>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="7XXXXXXX"
                      required
                      inputMode="numeric"
                      className="bg-zinc-800/80 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-400 text-sm bg-red-950/60 border border-red-900/60 rounded-lg px-3.5 py-2.5">
                    {error}
                  </div>
                )}

                <Button
                  type="button"
                  disabled={isLoading || !phone}
                  onClick={handleSendOtp}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold h-10"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {isLoading ? 'Enviando...' : 'Enviar codigo'}
                </Button>
              </div>
            ) : (
              /* ---- Step 2: OTP input ---- */
              <div className="space-y-4">
                {/* Demo mode info box */}
                {demoOtp && (
                  <div className="text-blue-300 text-sm bg-blue-950/60 border border-blue-900/60 rounded-lg px-3.5 py-2.5">
                    Modo demo — Tu codigo es: <span className="font-bold font-mono">{demoOtp}</span>
                  </div>
                )}

                {/* 6 OTP digit inputs */}
                <div className="flex justify-center gap-2">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => { inputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigitChange(index, e.target.value)}
                      onKeyDown={e => handleDigitKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="w-12 h-14 text-center text-2xl font-bold bg-zinc-800/80 border border-zinc-700 text-white rounded-md outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                    />
                  ))}
                </div>

                {error && (
                  <div className="text-red-400 text-sm bg-red-950/60 border border-red-900/60 rounded-lg px-3.5 py-2.5">
                    {error}
                  </div>
                )}

                <Button
                  type="button"
                  disabled={isLoading || digits.join('').length !== 6}
                  onClick={handleVerifyOtp}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold h-10"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {isLoading ? 'Verificando...' : 'Verificar'}
                </Button>

                {/* Resend */}
                <div className="text-center text-sm">
                  {countdown > 0 ? (
                    <p className="text-zinc-500">
                      Reenviar codigo en <span className="text-zinc-300 font-medium">{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isLoading}
                      className="text-blue-500 hover:text-blue-400 transition-colors font-medium"
                    >
                      Reenviar codigo
                    </button>
                  )}
                </div>

                {/* Go back */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1)
                      setDigits(['', '', '', '', '', ''])
                      setError(null)
                      setDemoOtp(null)
                    }}
                    className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                  >
                    Cambiar numero
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
