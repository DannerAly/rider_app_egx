import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_ATTEMPTS = 5
const OTP_EXPIRY_MINUTES = 10

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Parse body
    const body = await request.json()
    const { phone, code } = body as { phone?: string; code?: string }

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Los campos phone y code son requeridos' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Fetch OTP data from profile
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('otp_hash, otp_sent_at, otp_attempts, phone')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Error al consultar perfil' },
        { status: 500 }
      )
    }

    // Validate OTP exists
    if (!profile.otp_hash || !profile.otp_sent_at) {
      return NextResponse.json(
        { error: 'No hay un codigo de verificacion pendiente. Solicita uno nuevo.' },
        { status: 400 }
      )
    }

    // Validate phone matches
    if (profile.phone !== phone) {
      return NextResponse.json(
        { error: 'El telefono no coincide con el que solicito el codigo' },
        { status: 400 }
      )
    }

    // Check expiry
    const sentAt = new Date(profile.otp_sent_at).getTime()
    const now = Date.now()
    const elapsedMinutes = (now - sentAt) / (1000 * 60)

    if (elapsedMinutes > OTP_EXPIRY_MINUTES) {
      // Clear expired OTP
      await admin
        .from('profiles')
        .update({ otp_hash: null, otp_sent_at: null, otp_attempts: 0 })
        .eq('id', user.id)

      return NextResponse.json(
        { error: 'El codigo ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      )
    }

    // Check max attempts
    const currentAttempts = profile.otp_attempts ?? 0
    if (currentAttempts >= MAX_ATTEMPTS) {
      // Clear OTP after too many attempts
      await admin
        .from('profiles')
        .update({ otp_hash: null, otp_sent_at: null, otp_attempts: 0 })
        .eq('id', user.id)

      return NextResponse.json(
        { error: 'Demasiados intentos. Solicita un nuevo codigo.' },
        { status: 429 }
      )
    }

    // Increment attempts before checking
    const { error: incError } = await admin
      .from('profiles')
      .update({ otp_attempts: currentAttempts + 1 })
      .eq('id', user.id)

    if (incError) {
      return NextResponse.json(
        { error: 'Error al actualizar intentos' },
        { status: 500 }
      )
    }

    // Hash provided code and compare
    const providedHash = crypto.createHash('sha256').update(code).digest('hex')

    if (providedHash !== profile.otp_hash) {
      const remaining = MAX_ATTEMPTS - (currentAttempts + 1)
      return NextResponse.json(
        { error: `Codigo incorrecto. Te quedan ${remaining} intento${remaining !== 1 ? 's' : ''}.` },
        { status: 400 }
      )
    }

    // OTP matches - verify phone
    const { error: verifyError } = await admin
      .from('profiles')
      .update({
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        otp_hash: null,
        otp_sent_at: null,
        otp_attempts: 0,
      })
      .eq('id', user.id)

    if (verifyError) {
      return NextResponse.json(
        { error: 'Error al verificar telefono' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: { success: true } },
      { status: 200 }
    )
  } catch (error) {
    console.error('[verify-otp] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
