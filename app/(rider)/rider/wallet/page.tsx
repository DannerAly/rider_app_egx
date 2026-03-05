'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  Loader2, Gift, Truck, HandCoins, AlertTriangle, Wrench,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface WalletData {
  balance: number
  total_earned: number
  total_withdrawn: number
}

interface Transaction {
  id: string
  type: 'credit' | 'debit'
  category: string
  amount: number
  balance_after: number
  description: string | null
  order_id: string | null
  created_at: string
}

interface DailyChart {
  date: string
  day: string
  deliveries: number
  tips: number
  total: number
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  delivery_fee: { label: 'Entrega', icon: Truck, color: 'text-blue-400' },
  tip:          { label: 'Propina', icon: HandCoins, color: 'text-emerald-400' },
  bonus:        { label: 'Bono', icon: Gift, color: 'text-purple-400' },
  withdrawal:   { label: 'Retiro', icon: ArrowUpFromLine, color: 'text-orange-400' },
  adjustment:   { label: 'Ajuste', icon: Wrench, color: 'text-zinc-400' },
  penalty:      { label: 'Penalización', icon: AlertTriangle, color: 'text-red-400' },
}

export default function RiderWalletPage() {
  const router = useRouter()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [chart, setChart] = useState<DailyChart[]>([])
  const [today, setToday] = useState({ deliveries: 0, tips: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  // Retiro
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  useEffect(() => { fetchWallet() }, [])

  const fetchWallet = async () => {
    const res = await fetch('/api/rider/wallet')
    if (!res.ok) { router.push('/login'); return }
    const data = await res.json()
    setWallet(data.wallet)
    setTransactions(data.transactions)
    setChart(data.weekly_chart)
    setToday(data.today)
    setLoading(false)
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0) { setWithdrawError('Monto inválido'); return }
    if (wallet && amount > wallet.balance) { setWithdrawError('Saldo insuficiente'); return }

    setWithdrawing(true)
    setWithdrawError(null)

    const res = await fetch('/api/rider/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })

    if (res.ok) {
      setShowWithdraw(false)
      setWithdrawAmount('')
      await fetchWallet()
    } else {
      const json = await res.json()
      setWithdrawError(json.error ?? 'Error al procesar retiro')
    }
    setWithdrawing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-10">
      {/* Header */}
      <div className="px-5 pt-12 pb-5 flex items-center gap-4">
        <Link
          href="/rider"
          className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-white font-bold text-xl">Mi Wallet</h1>
          <p className="text-zinc-500 text-sm">Balance y transacciones</p>
        </div>
      </div>

      {/* Balance card */}
      <div className="px-5 mb-5">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-blue-200" />
              <span className="text-blue-200 text-xs font-medium">Saldo disponible</span>
            </div>
            <p className="text-white text-3xl font-bold">
              Bs. {wallet?.balance.toFixed(2) ?? '0.00'}
            </p>
            <div className="flex gap-4 mt-4">
              <div>
                <p className="text-blue-200 text-xs">Ganado total</p>
                <p className="text-white font-semibold text-sm">Bs. {wallet?.total_earned.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs">Retirado</p>
                <p className="text-white font-semibold text-sm">Bs. {wallet?.total_withdrawn.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hoy */}
      <div className="px-5 mb-5 grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 text-center">
          <Truck className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="text-white text-lg font-bold">Bs. {today.deliveries.toFixed(0)}</p>
          <p className="text-zinc-500 text-xs">Entregas hoy</p>
        </div>
        <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 text-center">
          <HandCoins className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-white text-lg font-bold">Bs. {today.tips.toFixed(0)}</p>
          <p className="text-zinc-500 text-xs">Propinas hoy</p>
        </div>
        <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 text-center">
          <TrendingUp className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="text-white text-lg font-bold">Bs. {today.total.toFixed(0)}</p>
          <p className="text-zinc-500 text-xs">Total hoy</p>
        </div>
      </div>

      {/* Gráfico semanal */}
      <div className="px-5 mb-5">
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <h3 className="text-white font-semibold text-sm mb-3">Últimos 7 días</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a1a1aa' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value) => [`Bs. ${Number(value ?? 0).toFixed(2)}`, '']}
                />
                <Bar dataKey="deliveries" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Entregas" />
                <Bar dataKey="tips" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Propinas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Botón retiro */}
      <div className="px-5 mb-5">
        {!showWithdraw ? (
          <button
            onClick={() => setShowWithdraw(true)}
            disabled={!wallet || wallet.balance <= 0}
            className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 border border-zinc-700 transition-colors"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Solicitar retiro
          </button>
        ) : (
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 space-y-3">
            <p className="text-white font-semibold text-sm">Solicitar retiro</p>
            <p className="text-zinc-500 text-xs">Disponible: Bs. {wallet?.balance.toFixed(2)}</p>
            <input
              type="number"
              step="0.01"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder="Monto a retirar"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            {withdrawError && (
              <p className="text-red-400 text-xs">{withdrawError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowWithdraw(false); setWithdrawError(null) }}
                className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white text-sm font-medium flex items-center justify-center gap-2"
              >
                {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {withdrawing ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historial de transacciones */}
      <div className="px-5">
        <h3 className="text-white font-semibold text-sm mb-3">Historial</h3>
        {transactions.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
            <Wallet className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-500 text-sm">Sin transacciones aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(txn => {
              const config = CATEGORY_CONFIG[txn.category] ?? CATEGORY_CONFIG.adjustment
              const Icon = config.icon
              const isCredit = txn.type === 'credit'

              return (
                <div key={txn.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{config.label}</p>
                    {txn.description && (
                      <p className="text-zinc-500 text-xs truncate">{txn.description}</p>
                    )}
                    <p className="text-zinc-600 text-xs">
                      {new Date(txn.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isCredit ? '+' : '-'}Bs. {Number(txn.amount).toFixed(2)}
                    </p>
                    <p className="text-zinc-600 text-xs">
                      Bs. {Number(txn.balance_after).toFixed(2)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
