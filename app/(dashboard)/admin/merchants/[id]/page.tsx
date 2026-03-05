import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditMerchantForm from './EditMerchantForm'
import { ArrowLeft, Star, Package, MapPin, Store, Clock, Percent } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MerchantDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: merchant, error }, { data: categories }, { data: zones }] = await Promise.all([
    supabase
      .from('merchants')
      .select(`
        *,
        profiles:owner_id(full_name, phone),
        merchant_categories:category_id(id, name, slug),
        zones:zone_id(id, name)
      `)
      .eq('id', id)
      .single(),
    supabase.from('merchant_categories').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('zones').select('id, name').eq('is_active', true).order('name'),
  ])

  if (error || !merchant) notFound()

  const profile = merchant.profiles as any
  const category = merchant.merchant_categories as any

  // Contar productos del comercio
  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', id)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white rounded-xl border border-zinc-200 px-5 py-4">
        <Link
          href="/admin/merchants"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-500 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {merchant.name[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-zinc-900 text-sm leading-tight">{merchant.name}</p>
            <p className="text-zinc-400 text-xs">{category?.name ?? 'Sin categoría'}</p>
          </div>
        </div>

        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${merchant.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
          {merchant.is_active ? 'Activo' : 'Inactivo'}
        </span>

        <div className="hidden md:flex items-center gap-5 text-sm ml-4 flex-wrap">
          <QuickStat icon={<Star className="w-3.5 h-3.5 text-yellow-500" />} value={Number(merchant.rating).toFixed(1)} label="rating" />
          <QuickStat icon={<Package className="w-3.5 h-3.5 text-blue-500" />} value={String(merchant.total_orders)} label="pedidos" />
          <QuickStat icon={<Store className="w-3.5 h-3.5 text-purple-500" />} value={String(productCount ?? 0)} label="productos" />
          <QuickStat icon={<Percent className="w-3.5 h-3.5 text-orange-500" />} value={`${merchant.commission_pct}%`} label="comisión" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info principal */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="border-zinc-200">
            <CardContent className="p-6">
              <h3 className="text-zinc-900 font-semibold mb-4">Información del comercio</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Dueño" value={profile?.full_name ?? 'N/A'} />
                <InfoRow label="Teléfono" value={merchant.phone ?? 'N/A'} />
                <InfoRow label="Email" value={merchant.email ?? 'N/A'} />
                <InfoRow label="Dirección" value={merchant.address} />
                <InfoRow label="Zona" value={(merchant.zones as any)?.name ?? 'Sin zona'} />
                <InfoRow label="Prep. promedio" value={`${merchant.avg_prep_time_min} min`} />
                <InfoRow label="Pedido mínimo" value={`Bs. ${merchant.min_order_amount}`} />
                <InfoRow label="Slug" value={merchant.slug} />
              </div>
              {merchant.description && (
                <p className="text-zinc-600 text-sm mt-4 border-t border-zinc-100 pt-4">{merchant.description}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-200">
            <CardContent className="p-6">
              <h3 className="text-zinc-900 font-semibold mb-4">Horarios de apertura</h3>
              {merchant.opening_hours && Object.keys(merchant.opening_hours).length > 0 ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(merchant.opening_hours as Record<string, { open: string; close: string }>).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between bg-zinc-50 rounded-lg px-3 py-2">
                      <span className="text-zinc-600 capitalize">{day}</span>
                      <span className="text-zinc-900 font-medium">{hours.open} - {hours.close}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Sin horarios configurados
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral */}
        <div className="space-y-5">
          <Card className="border-zinc-200">
            <CardContent className="p-6">
              <h3 className="text-zinc-900 font-semibold mb-4">Métricas</h3>
              <div className="space-y-4">
                <MetricRow label="Pedidos totales" value={String(merchant.total_orders)} />
                <MetricRow label="Ingresos totales" value={`Bs. ${Number(merchant.total_revenue).toFixed(2)}`} />
                <MetricRow label="Rating" value={Number(merchant.rating).toFixed(1)} />
                <MetricRow label="Comisión" value={`${merchant.commission_pct}%`} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200">
            <CardContent className="p-6">
              <h3 className="text-zinc-900 font-semibold mb-4">Acciones</h3>
              <div className="space-y-2">
                <EditMerchantForm merchant={merchant} categories={categories ?? []} zones={zones ?? []} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function QuickStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-zinc-600">
      {icon}
      <span className="font-semibold text-zinc-800">{value}</span>
      <span className="text-zinc-400">{label}</span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-500 text-xs mb-0.5">{label}</p>
      <p className="text-zinc-900 font-medium">{value}</p>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500 text-sm">{label}</span>
      <span className="text-zinc-900 font-semibold text-sm">{value}</span>
    </div>
  )
}
