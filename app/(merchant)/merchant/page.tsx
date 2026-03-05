import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UtensilsCrossed, Settings, Package, TrendingUp, Star, Store, ClipboardList } from 'lucide-react'

export default async function MerchantHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: merchant } = await supabase
    .from('merchants')
    .select('*, merchant_categories:category_id(name)')
    .eq('owner_id', user.id)
    .single()

  if (!merchant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Store className="w-16 h-16 text-zinc-300 mb-4" />
        <p className="text-zinc-700 font-semibold text-lg">Sin comercio asignado</p>
        <p className="text-zinc-400 text-sm mt-1">Contacta al administrador para configurar tu cuenta.</p>
      </div>
    )
  }

  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{merchant.name}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {(merchant.merchant_categories as any)?.name ?? 'Comercio'} · {merchant.address}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${merchant.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
          {merchant.is_active ? 'Abierto' : 'Cerrado'}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={<Package className="w-5 h-5 text-blue-500" />} label="Pedidos" value={String(merchant.total_orders)} />
        <KPICard icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} label="Ingresos" value={`Bs. ${Number(merchant.total_revenue).toFixed(0)}`} />
        <KPICard icon={<Star className="w-5 h-5 text-amber-500" />} label="Rating" value={Number(merchant.rating).toFixed(1)} />
        <KPICard icon={<UtensilsCrossed className="w-5 h-5 text-purple-500" />} label="Productos" value={String(productCount ?? 0)} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/merchant/orders" className="flex items-center gap-4 bg-white rounded-xl border border-zinc-200 p-5 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-zinc-900 font-semibold">Pedidos (KDS)</p>
            <p className="text-zinc-400 text-sm">Recibe y gestiona pedidos en tiempo real</p>
          </div>
        </Link>

        <Link href="/merchant/menu" className="flex items-center gap-4 bg-white rounded-xl border border-zinc-200 p-5 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-zinc-900 font-semibold">Mi Menú</p>
            <p className="text-zinc-400 text-sm">Categorías, productos y modificadores</p>
          </div>
        </Link>

        <Link href="/merchant/settings" className="flex items-center gap-4 bg-white rounded-xl border border-zinc-200 p-5 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
            <Settings className="w-6 h-6 text-zinc-600" />
          </div>
          <div>
            <p className="text-zinc-900 font-semibold">Configuración</p>
            <p className="text-zinc-400 text-sm">Datos, horarios y preferencias</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

function KPICard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
    </div>
  )
}
