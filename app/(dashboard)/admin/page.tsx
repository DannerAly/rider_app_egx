import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import LiveMapWrapper from '@/components/map/LiveMapWrapper'
import { Package, CheckCircle, XCircle, Users, TrendingUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

async function getStats() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalOrders },
    { count: deliveredOrders },
    { count: cancelledOrders },
    { count: activeRiders },
    { count: pendingOrders },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered').gte('created_at', today),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled').gte('created_at', today),
    supabase.from('riders').select('*', { count: 'exact', head: true }).neq('status', 'offline'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const inProgress = (totalOrders ?? 0) - (deliveredOrders ?? 0) - (cancelledOrders ?? 0)
  const successRate = (totalOrders ?? 0) > 0
    ? Math.round(((deliveredOrders ?? 0) / (totalOrders ?? 1)) * 100)
    : 0

  return {
    totalOrders:     totalOrders     ?? 0,
    deliveredOrders: deliveredOrders ?? 0,
    cancelledOrders: cancelledOrders ?? 0,
    activeRiders:    activeRiders    ?? 0,
    pendingOrders:   pendingOrders   ?? 0,
    inProgress,
    successRate,
  }
}

export default async function AdminPage() {
  const stats = await getStats()

  const kpis = [
    {
      label:    'Pedidos hoy',
      value:    stats.totalOrders,
      icon:     Package,
      gradient: 'from-blue-500 to-blue-600',
      bg:       'bg-blue-50',
      text:     'text-blue-600',
      change:   `${stats.inProgress} en curso`,
    },
    {
      label:    'Entregados',
      value:    stats.deliveredOrders,
      icon:     CheckCircle,
      gradient: 'from-emerald-500 to-emerald-600',
      bg:       'bg-emerald-50',
      text:     'text-emerald-600',
      change:   `${stats.successRate}% tasa de éxito`,
    },
    {
      label:    'Pendientes',
      value:    stats.pendingOrders,
      icon:     Clock,
      gradient: 'from-amber-500 to-amber-600',
      bg:       'bg-amber-50',
      text:     'text-amber-600',
      change:   'Sin rider asignado',
    },
    {
      label:    'Cancelados',
      value:    stats.cancelledOrders,
      icon:     XCircle,
      gradient: 'from-red-500 to-red-600',
      bg:       'bg-red-50',
      text:     'text-red-600',
      change:   'Hoy',
    },
    {
      label:    'Riders activos',
      value:    stats.activeRiders,
      icon:     Users,
      gradient: 'from-violet-500 to-violet-600',
      bg:       'bg-violet-50',
      text:     'text-violet-600',
      change:   'En turno ahora',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-zinc-900 font-bold text-xl">Resumen del día</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('es', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        {stats.inProgress > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-blue-700 text-sm font-medium">{stats.inProgress} en progreso</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(({ label, value, icon: Icon, gradient, bg, text, change }) => (
          <Card key={label} className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <CardContent className="p-5">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg)}>
                <Icon className={cn('w-5 h-5', text)} />
              </div>
              <p className="text-3xl font-bold text-zinc-900 tabular-nums">{value}</p>
              <p className="text-zinc-600 text-sm font-medium mt-0.5">{label}</p>
              <p className="text-zinc-400 text-xs mt-1.5">{change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mapa en vivo */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-zinc-900 font-semibold">Riders en vivo</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Los marcadores se actualizan en tiempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-500 text-sm">{stats.activeRiders} activos</span>
          </div>
        </div>
        <Card className="border-zinc-200 overflow-hidden shadow-sm">
          <div style={{ height: '460px' }}>
            <LiveMapWrapper center={[-17.7863, -63.1812]} zoom={13} />
          </div>
        </Card>
      </div>
    </div>
  )
}
