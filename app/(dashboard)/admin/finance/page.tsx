'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DollarSign, TrendingUp, Store, Truck, Building2,
  Loader2, Calendar, Filter,
} from 'lucide-react'

interface PaymentRow {
  id: string
  order_id: string
  amount: number
  payment_method: string
  status: string
  commission_pct: number
  commission_amount: number
  merchant_payout: number
  rider_payout: number
  platform_fee: number
  paid_at: string | null
  created_at: string
  orders?: {
    order_number: string
    merchants?: { name: string } | null
    riders?: { profiles: { full_name: string | null } } | null
  } | null
}

interface Summary {
  totalRevenue: number
  totalCommission: number
  totalMerchantPayout: number
  totalRiderPayout: number
  totalOrders: number
}

export default function FinancePage() {
  const supabase = createClient()
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'succeeded' | 'pending' | 'failed'>('all')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month')

  useEffect(() => { fetchPayments() }, [filter, dateRange])

  const fetchPayments = async () => {
    setLoading(true)
    let query = supabase
      .from('payments')
      .select('*, orders(order_number, merchants:merchant_id(name), riders:rider_id(profiles(full_name)))')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter !== 'all') query = query.eq('status', filter)

    if (dateRange !== 'all') {
      const now = new Date()
      let from: Date
      if (dateRange === 'today') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (dateRange === 'week') {
        from = new Date(now.getTime() - 7 * 86400000)
      } else {
        from = new Date(now.getFullYear(), now.getMonth(), 1)
      }
      query = query.gte('created_at', from.toISOString())
    }

    const { data } = await query
    setPayments((data as PaymentRow[]) ?? [])
    setLoading(false)
  }

  const succeeded = payments.filter(p => p.status === 'succeeded')
  const summary: Summary = {
    totalRevenue: succeeded.reduce((s, p) => s + Number(p.amount), 0),
    totalCommission: succeeded.reduce((s, p) => s + Number(p.commission_amount ?? 0), 0),
    totalMerchantPayout: succeeded.reduce((s, p) => s + Number(p.merchant_payout ?? 0), 0),
    totalRiderPayout: succeeded.reduce((s, p) => s + Number(p.rider_payout ?? 0), 0),
    totalOrders: succeeded.length,
  }

  const kpis = [
    { label: 'Ingresos totales', value: `Bs. ${summary.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Comisión plataforma', value: `Bs. ${summary.totalCommission.toFixed(2)}`, icon: Building2, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pago a comercios', value: `Bs. ${summary.totalMerchantPayout.toFixed(2)}`, icon: Store, color: 'bg-purple-50 text-purple-600' },
    { label: 'Pago a riders', value: `Bs. ${summary.totalRiderPayout.toFixed(2)}`, icon: Truck, color: 'bg-orange-50 text-orange-600' },
  ]

  const STATUS_BADGE: Record<string, string> = {
    succeeded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  }

  const METHOD_LABEL: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    qr: 'QR',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Finanzas</h1>
          <p className="text-sm text-zinc-500">Ingresos, comisiones y liquidaciones</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as typeof dateRange)}
            className="text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-700"
          >
            <option value="today">Hoy</option>
            <option value="week">Última semana</option>
            <option value="month">Este mes</option>
            <option value="all">Todo</option>
          </select>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as typeof filter)}
            className="text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-700"
          >
            <option value="all">Todos</option>
            <option value="succeeded">Completados</option>
            <option value="pending">Pendientes</option>
            <option value="failed">Fallidos</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">{kpi.label}</p>
                  <p className="text-lg font-bold text-zinc-900">{kpi.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla de pagos */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Transacciones ({payments.length})</h2>
          <span className="text-xs text-zinc-400">{summary.totalOrders} completadas</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm">No hay transacciones</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Pedido</th>
                  <th className="text-left px-5 py-3 font-medium">Comercio</th>
                  <th className="text-left px-5 py-3 font-medium">Método</th>
                  <th className="text-right px-5 py-3 font-medium">Total</th>
                  <th className="text-right px-5 py-3 font-medium">Comisión</th>
                  <th className="text-right px-5 py-3 font-medium">Comercio</th>
                  <th className="text-right px-5 py-3 font-medium">Rider</th>
                  <th className="text-center px-5 py-3 font-medium">Estado</th>
                  <th className="text-left px-5 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-mono text-xs text-zinc-600">
                      {(p.orders as any)?.order_number ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-zinc-700">
                      {(p.orders as any)?.merchants?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      {METHOD_LABEL[p.payment_method] ?? p.payment_method}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-900">
                      Bs. {Number(p.amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right text-blue-600 font-medium">
                      Bs. {Number(p.commission_amount ?? 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right text-purple-600">
                      Bs. {Number(p.merchant_payout ?? 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right text-orange-600">
                      Bs. {Number(p.rider_payout ?? 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[p.status] ?? ''}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-400">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) :
                       new Date(p.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
