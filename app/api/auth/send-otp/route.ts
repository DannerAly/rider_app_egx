import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEMO_MODE = !process.env.TWILIO_ACCOUNT_SID

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

    // Parse and validate phone
    const body = await request.json()
    const { phone } = body as { phone?: string }

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'El campo phone es requerido' },
        { status: 400 }
      )
    }

    const phoneRegex = /^\+\d{8,15}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Formato de telefono invalido. Debe iniciar con + y tener entre 8 y 15 digitos (ej. +59170000000)' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Rate limiting: check otp_sent_at
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('otp_sent_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: 'Error al consultar perfil' },
        { status: 500 }
      )
    }

    if (profile?.otp_sent_at) {
      const sentAt = new Date(profile.otp_sent_at).getTime()
      const now = Date.now()
      const elapsedSeconds = (now - sentAt) / 1000

      if (elapsedSeconds < 60) {
        const remaining = Math.ceil(60 - elapsedSeconds)
        return NextResponse.json(
          { error: `Debes esperar ${remaining} segundos antes de solicitar otro codigo` },
          { status: 429 }
        )
      }
    }

    // Generate 6-digit OTP
    const code = String(crypto.randomInt(100000, 999999))
    const otpHash = crypto.createHash('sha256').update(code).digest('hex')

    // Save OTP hash to profile
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        otp_hash: otpHash,
        otp_sent_at: new Date().toISOString(),
        otp_attempts: 0,
        phone,
      })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Error al guardar OTP' },
        { status: 500 }
      )
    }

    // Demo mode: return OTP in response
    if (DEMO_MODE) {
      console.log(`[DEMO OTP] Usuario ${user.id} | Telefono ${phone} | Codigo: ${code}`)
      return NextResponse.json(
        { data: { success: true, demo: true, otp: code } },
        { status: 200 }
      )
    }

    // Production: send SMS via Twilio
    const twilioSid = process.env.TWILIO_ACCOUNT_SID!
    const twilioToken = process.env.TWILIO_AUTH_TOKEN!
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER!

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
    const credentials = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')

    const smsResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: twilioPhone,
        Body: `Tu codigo de verificacion es: ${code}`,
      }),
    })

    if (!smsResponse.ok) {
      const smsError = await smsResponse.text()
      console.error('[Twilio Error]', smsError)
      return NextResponse.json(
        { error: 'Error al enviar SMS' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { data: { success: true } },
      { status: 200 }
    )
  } catch (error) {
    console.error('[send-otp] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
