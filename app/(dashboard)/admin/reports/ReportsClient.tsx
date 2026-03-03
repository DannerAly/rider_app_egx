'use client'

import { useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts'
import { Package, TrendingUp, Users, DollarSign, Download } from 'lucide-react'

// ── Types ──────────────────────────────────────────
interface DailyEntry {
  date: string
  total: number
  delivered: number
  revenue: number
}

interface Summary {
  totalOrders: number
  totalDelivered: number
  successRate: number
  totalRevenue: number
  avgDeliveryTimeMins?: number
}

interface TopRider {
  name: string
  deliveries: number
  earnings: number
}

export interface ReportsData {
  daily: DailyEntry[]
  statusCounts: Record<string, number>
  topRiders: TopRider[]
  summary: Summary
}

// ── Constants ──────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308',
  assigned: '#3b82f6',
  heading_to_pickup: '#a855f7',
  picked_up: '#6366f1',
  in_transit: '#06b6d4',
  delivered: '#22c55e',
  cancelled: '#ef4444',
  failed: '#71717a',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendientes',
  assigned: 'Asignados',
  heading_to_pickup: 'Al pickup',
  picked_up: 'Recogidos',
  in_transit: 'En camino',
  delivered: 'Entregados',
  cancelled: 'Cancelados',
  failed: 'Fallidos',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es', { month: 'short', day: 'numeric' })
}

// ── Component ──────────────────────────────────────
export default function ReportsClient({ initialData }: { initialData: ReportsData }) {
  const [data, setData] = useState<ReportsData>(initialData)
  const [loading, setLoading] = useState(false)

  // Default date range: last 30 days
  const defaultTo = new Date().toISOString().split('T')[0]
  const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0]
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)

  const handleFilter = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?from=${fromDate}&to=${toDate}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Error fetching reports:', err)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  // ── Export CSV ────────────────────────────────────
  const exportCSV = useCallback(() => {
    const headers = ['Fecha', 'Total Pedidos', 'Entregados', 'Ingresos (Bs.)']
    const rows = data.daily.map((d) => [d.date, d.total, d.delivered, d.revenue.toFixed(2)])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_${fromDate}_${toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [data.daily, fromDate, toDate])

  // ── Prepare chart data ───────────────────────────
  const dailyChart = data.daily.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }))

  const pieData = Object.entries(data.statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] ?? status,
      value: count,
      color: STATUS_COLORS[status] ?? '#71717a',
    }))

  const { summary } = data

  // ── KPI Cards ────────────────────────────────────
  const kpiCards = [
    {
      label: 'Total pedidos',
      value: summary.totalOrders.toLocaleString('es'),
      icon: Package,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Entregados',
      value: summary.totalDelivered.toLocaleString('es'),
      icon: TrendingUp,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Tasa de éxito',
      value: `${summary.successRate}%`,
      icon: Users,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Ingresos (Bs.)',
      value: summary.totalRevenue.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      icon: DollarSign,
      color: 'text-yellow-600 bg-yellow-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-zinc-900 font-semibold text-lg">Reportes</h2>
          <p className="text-zinc-500 text-sm mt-0.5">Métricas detalladas de la operación</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Desde</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Hasta</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleFilter}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'Cargando...' : 'Filtrar'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            <p className="text-zinc-500 text-sm mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LineChart: Entregas por día */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-5">
          <h3 className="text-zinc-900 font-semibold text-sm mb-4">Pedidos por día</h3>
          {dailyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyChart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '13px' }}
                />
                <Legend wrapperStyle={{ fontSize: '13px' }} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="delivered"
                  name="Entregados"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-zinc-400 text-sm text-center py-12">Sin datos para el rango seleccionado</p>
          )}
        </div>

        {/* PieChart: Distribución por estado */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h3 className="text-zinc-900 font-semibold text-sm mb-4">Distribución por estado</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '13px' }}
                  formatter={(value) => [`${value} pedidos`]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  layout="horizontal"
                  verticalAlign="bottom"
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-zinc-400 text-sm text-center py-12">Sin datos</p>
          )}
        </div>
      </div>

      {/* BarChart: Ingresos por día */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h3 className="text-zinc-900 font-semibold text-sm mb-4">Ingresos por día (Bs.)</h3>
        {dailyChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyChart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
              <YAxis tick={{ fontSize: 12 }} stroke="#a1a1aa" />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '13px' }}
                formatter={(value) => [`Bs. ${Number(value).toFixed(2)}`, 'Ingresos']}
              />
              <Bar dataKey="revenue" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-zinc-400 text-sm text-center py-12">Sin datos para el rango seleccionado</p>
        )}
      </div>

      {/* Top riders table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="text-zinc-900 font-semibold text-sm">Top riders por entregas</h3>
        </div>
        {data.topRiders && data.topRiders.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">#</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Rider</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Entregas</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Ganancias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.topRiders.map((rider, i) => (
                <tr key={i} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 text-zinc-400 font-medium">{i + 1}</td>
                  <td className="px-5 py-3 text-zinc-900 font-medium">{rider.name}</td>
                  <td className="px-5 py-3 text-right text-zinc-700">{rider.deliveries}</td>
                  <td className="px-5 py-3 text-right text-zinc-700">Bs. {rider.earnings.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-zinc-400 text-sm text-center py-8">Sin datos de riders para este rango.</p>
        )}
      </div>
    </div>
  )
}
