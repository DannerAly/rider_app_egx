import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react'

async function getReportData() {
  const supabase = await createClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const [
    { data: ordersByStatus },
    { data: recentOrders },
    { data: topRiders },
    { data: totalStats },
  ] = await Promise.all([
    // Pedidos por estado
    supabase.from('orders').select('status'),

    // Pedidos de los últimos 7 días
    supabase
      .from('orders')
      .select('created_at, status, total_fee')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at'),

    // Top 5 riders
    supabase
      .from('riders')
      .select('total_deliveries, total_earnings, rating, profiles(full_name)')
      .order('total_deliveries', { ascending: false })
      .limit(5),

    // Totales globales
    supabase
      .from('orders')
      .select('total_fee, status'),
  ])

  // Agrupar pedidos por día
  const dailyMap: Record<string, { total: number; delivered: number; revenue: number }> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().split('T')[0]
    dailyMap[key] = { total: 0, delivered: 0, revenue: 0 }
  }
  recentOrders?.forEach((o: any) => {
    const key = o.created_at.split('T')[0]
    if (dailyMap[key]) {
      dailyMap[key].total++
      if (o.status === 'delivered') {
        dailyMap[key].delivered++
        dailyMap[key].revenue += Number(o.total_fee ?? 0)
      }
    }
  })
  const daily = Object.entries(dailyMap).map(([date, d]) => ({
    date,
    label: new Date(date + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric' }),
    ...d,
  }))

  const maxTotal = Math.max(...daily.map(d => d.total), 1)

  // Conteo por estado
  const statusCount: Record<string, number> = {}
  ordersByStatus?.forEach((o: any) => {
    statusCount[o.status] = (statusCount[o.status] ?? 0) + 1
  })

  const totalRevenue = totalStats
    ?.filter((o: any) => o.status === 'delivered')
    .reduce((sum: number, o: any) => sum + Number(o.total_fee ?? 0), 0) ?? 0

  const totalDelivered = statusCount['delivered'] ?? 0
  const totalAll = totalStats?.length ?? 0

  return { daily, maxTotal, statusCount, topRiders, totalRevenue, totalDelivered, totalAll }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendientes', assigned: 'Asignados',
  heading_to_pickup: 'Al pickup', picked_up: 'Recogidos',
  in_transit: 'En camino', delivered: 'Entregados',
  cancelled: 'Cancelados', failed: 'Fallidos',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-400', assigned: 'bg-blue-400',
  heading_to_pickup: 'bg-purple-400', picked_up: 'bg-indigo-400',
  in_transit: 'bg-cyan-400', delivered: 'bg-green-400',
  cancelled: 'bg-red-400', failed: 'bg-zinc-400',
}

export default async function ReportsPage() {
  const { daily, maxTotal, statusCount, topRiders, totalRevenue, totalDelivered, totalAll } = await getReportData()

  const summaryCards = [
    { label: 'Total pedidos',  value: totalAll,       icon: Package,     color: 'text-blue-600 bg-blue-50' },
    { label: 'Entregados',     value: totalDelivered, icon: TrendingUp,  color: 'text-green-600 bg-green-50' },
    { label: 'Tasa de éxito',  value: totalAll > 0 ? `${Math.round((totalDelivered / totalAll) * 100)}%` : '—', icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'Ingresos (Bs.)', value: `${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-yellow-600 bg-yellow-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-zinc-900 font-semibold text-lg">Reportes</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Métricas globales de la operación</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            <p className="text-zinc-500 text-sm mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pedidos últimos 7 días */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-5">
          <h3 className="text-zinc-900 font-semibold text-sm mb-5">Pedidos últimos 7 días</h3>
          <div className="flex items-end gap-3 h-40">
            {daily.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: '120px' }}>
                  <div
                    className="w-full bg-blue-500 rounded-t-sm transition-all"
                    style={{ height: `${maxTotal > 0 ? (d.total / maxTotal) * 100 : 0}%`, minHeight: d.total > 0 ? '4px' : '0' }}
                    title={`${d.total} pedidos`}
                  />
                </div>
                <span className="text-zinc-400 text-xs capitalize">{d.label}</span>
                <span className="text-zinc-600 text-xs font-semibold">{d.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pedidos por estado */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h3 className="text-zinc-900 font-semibold text-sm mb-4">Por estado</h3>
          <div className="space-y-2.5">
            {Object.entries(statusCount).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-zinc-600 text-xs">{STATUS_LABEL[status] ?? status}</span>
                  <span className="text-zinc-900 text-xs font-semibold">{count}</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STATUS_COLOR[status] ?? 'bg-zinc-400'}`}
                    style={{ width: `${totalAll > 0 ? (count / totalAll) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(statusCount).length === 0 && (
              <p className="text-zinc-400 text-sm text-center py-4">Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Top riders */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="text-zinc-900 font-semibold text-sm">Top riders por entregas</h3>
        </div>
        {topRiders && topRiders.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">#</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Rider</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Entregas</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Ganancias</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {topRiders.map((rider: any, i: number) => (
                <tr key={i} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 text-zinc-400 font-medium">{i + 1}</td>
                  <td className="px-5 py-3 text-zinc-900 font-medium">{rider.profiles?.full_name ?? 'Sin nombre'}</td>
                  <td className="px-5 py-3 text-right text-zinc-700">{rider.total_deliveries}</td>
                  <td className="px-5 py-3 text-right text-zinc-700">Bs. {Number(rider.total_earnings).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-zinc-700">⭐ {Number(rider.rating).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-zinc-400 text-sm text-center py-8">Sin datos de riders aún.</p>
        )}
      </div>
    </div>
  )
}
