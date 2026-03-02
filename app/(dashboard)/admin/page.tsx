import { createClient } from '@/lib/supabase/server'
import { Package, Users, CheckCircle, XCircle } from 'lucide-react'
import LiveMapWrapper from '@/components/map/LiveMapWrapper'

async function getStats() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalOrders },
    { count: deliveredOrders },
    { count: cancelledOrders },
    { count: activeRiders },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered').gte('created_at', today),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled').gte('created_at', today),
    supabase.from('riders').select('*', { count: 'exact', head: true }).neq('status', 'offline'),
  ])

  return {
    totalOrders:     totalOrders     ?? 0,
    deliveredOrders: deliveredOrders ?? 0,
    cancelledOrders: cancelledOrders ?? 0,
    activeRiders:    activeRiders    ?? 0,
    inProgressOrders: (totalOrders ?? 0) - (deliveredOrders ?? 0) - (cancelledOrders ?? 0),
  }
}

export default async function AdminPage() {
  const stats = await getStats()

  const kpis = [
    {
      label:   'Pedidos hoy',
      value:   stats.totalOrders,
      icon:    Package,
      color:   'bg-blue-50 text-blue-600',
    },
    {
      label:   'En curso',
      value:   stats.inProgressOrders,
      icon:    Package,
      color:   'bg-yellow-50 text-yellow-600',
    },
    {
      label:   'Entregados',
      value:   stats.deliveredOrders,
      icon:    CheckCircle,
      color:   'bg-green-50 text-green-600',
    },
    {
      label:   'Cancelados',
      value:   stats.cancelledOrders,
      icon:    XCircle,
      color:   'bg-red-50 text-red-600',
    },
    {
      label:   'Riders activos',
      value:   stats.activeRiders,
      icon:    Users,
      color:   'bg-purple-50 text-purple-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-zinc-900 font-semibold text-lg">Resumen del día</h2>
        <p className="text-zinc-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            <p className="text-zinc-500 text-sm mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Mapa en vivo */}
      <div>
        <h2 className="text-zinc-900 font-semibold text-base mb-3">Riders en vivo</h2>
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden" style={{ height: '480px' }}>
          <LiveMapWrapper center={[-17.7863, -63.1812]} zoom={13} />
        </div>
        <p className="text-zinc-400 text-xs mt-2">
          Los marcadores se actualizan automáticamente cuando los riders envían su ubicación.
        </p>
      </div>
    </div>
  )
}
