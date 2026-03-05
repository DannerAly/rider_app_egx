import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/rider/wallet
 * Retorna balance del wallet y últimas transacciones.
 * Query: ?limit=20&offset=0
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') ?? '30')
  const offset = parseInt(url.searchParams.get('offset') ?? '0')
  const category = url.searchParams.get('category')

  const admin = createAdminClient()

  // Obtener o crear wallet
  let { data: wallet } = await admin
    .from('rider_wallets')
    .select('*')
    .eq('rider_id', user.id)
    .single()

  if (!wallet) {
    const { data: newWallet } = await admin
      .from('rider_wallets')
      .insert({ rider_id: user.id })
      .select()
      .single()
    wallet = newWallet
  }

  if (!wallet) return NextResponse.json({ error: 'Error creando wallet' }, { status: 500 })

  // Transacciones
  let txnQuery = admin
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('rider_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) txnQuery = txnQuery.eq('category', category)

  const { data: transactions, count } = await txnQuery

  // Resumen semanal (últimos 7 días)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: weekTxns } = await admin
    .from('wallet_transactions')
    .select('amount, category, created_at')
    .eq('rider_id', user.id)
    .eq('type', 'credit')
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: true })

  // Agrupar por día para el gráfico
  const dailyMap = new Map<string, { deliveries: number; tips: number; total: number }>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    dailyMap.set(key, { deliveries: 0, tips: 0, total: 0 })
  }

  for (const txn of weekTxns ?? []) {
    const key = txn.created_at.slice(0, 10)
    const entry = dailyMap.get(key)
    if (entry) {
      const amt = Number(txn.amount)
      entry.total += amt
      if (txn.category === 'tip') entry.tips += amt
      else entry.deliveries += amt
    }
  }

  const weeklyChart = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    day: new Date(date + 'T12:00:00').toLocaleDateString('es', { weekday: 'short' }),
    ...data,
  }))

  // Resumen del día
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayData = dailyMap.get(todayKey) ?? { deliveries: 0, tips: 0, total: 0 }

  return NextResponse.json({
    wallet: {
      balance: Number(wallet.balance),
      total_earned: Number(wallet.total_earned),
      total_withdrawn: Number(wallet.total_withdrawn),
    },
    today: todayData,
    weekly_chart: weeklyChart,
    transactions: transactions ?? [],
    total_transactions: count ?? 0,
  })
}

/**
 * POST /api/rider/wallet
 * Solicitar retiro de dinero.
 * Body: { amount: number }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { amount } = await request.json()
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    const { data: txnId, error } = await admin.rpc('debit_rider_wallet', {
      p_rider_id: user.id,
      p_amount: amount,
      p_category: 'withdrawal',
      p_description: `Retiro solicitado: Bs. ${Number(amount).toFixed(2)}`,
    })

    if (error) {
      if (error.message.includes('Saldo insuficiente')) {
        return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Notificar al rider
    await admin.from('notifications').insert({
      user_id: user.id,
      title: 'Retiro procesado',
      body: `Se procesó tu retiro de Bs. ${Number(amount).toFixed(2)}`,
      type: 'wallet_withdrawal',
      data: { transaction_id: txnId },
    })

    return NextResponse.json({ message: 'Retiro procesado', transaction_id: txnId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error procesando retiro' }, { status: 500 })
  }
}
