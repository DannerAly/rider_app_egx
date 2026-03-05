import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CreateMerchantForm from './CreateMerchantForm'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Store, Star, Package, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
]

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function MerchantsPage({ searchParams }: PageProps) {
  const { status = '' } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('merchants')
    .select(`
      id, name, slug, description, logo_url, phone, email, address, lat, lng,
      commission_pct, rating, total_orders, total_revenue,
      is_active, is_featured,
      merchant_categories:category_id(name, slug, icon),
      zones:zone_id(name)
    `)
    .order('created_at', { ascending: false })

  if (status === 'active') query = query.eq('is_active', true)
  if (status === 'inactive') query = query.eq('is_active', false)

  const [{ data: merchants }, { data: categories }, { data: zones }] = await Promise.all([
    query,
    supabase.from('merchant_categories').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('zones').select('id, name').eq('is_active', true).order('name'),
  ])

  const counts = {
    total: merchants?.length ?? 0,
    active: merchants?.filter(m => m.is_active).length ?? 0,
  }

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-zinc-900 font-bold text-xl">Comercios</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            {counts.total} registrados ·{' '}
            <span className="text-emerald-600 font-medium">{counts.active} activos</span>
          </p>
        </div>
        <CreateMerchantForm categories={categories ?? []} zones={zones ?? []} />
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <a
            key={f.value}
            href={f.value ? `/admin/merchants?status=${f.value}` : '/admin/merchants'}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              status === f.value
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
            )}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* Grid */}
      {merchants && merchants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {merchants.map((merchant: any) => {
            const initials = merchant.name
              .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            const category = merchant.merchant_categories as any

            return (
              <Card key={merchant.id} className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-11 h-11">
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-700 text-white text-sm font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-zinc-900 font-semibold text-sm leading-tight">{merchant.name}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">{category?.name ?? 'Sin categoría'}</p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      merchant.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-zinc-100 text-zinc-500'
                    )}>
                      {merchant.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-xs">Dirección</span>
                      <span className="text-zinc-700 text-xs truncate max-w-[60%] text-right">{merchant.address}</span>
                    </div>
                    {merchant.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 text-xs">Teléfono</span>
                        <span className="text-zinc-700 text-xs">{merchant.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-xs">Comisión</span>
                      <span className="text-zinc-700 font-medium text-xs">{merchant.commission_pct}%</span>
                    </div>
                    {(merchant as any).zones && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 text-xs">Zona</span>
                        <span className="text-zinc-700 text-xs">{(merchant as any).zones.name}</span>
                      </div>
                    )}
                  </div>

                  <Separator className="my-3" />

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <Package className="w-3 h-3 text-blue-500 mx-auto mb-0.5" />
                      <p className="text-zinc-900 font-bold text-sm">{merchant.total_orders}</p>
                      <p className="text-zinc-400 text-[10px]">Pedidos</p>
                    </div>
                    <div>
                      <Star className="w-3 h-3 text-amber-500 mx-auto mb-0.5" />
                      <p className="text-zinc-900 font-bold text-sm">{Number(merchant.rating).toFixed(1)}</p>
                      <p className="text-zinc-400 text-[10px]">Rating</p>
                    </div>
                    <div>
                      <MapPin className="w-3 h-3 text-emerald-500 mx-auto mb-0.5" />
                      <p className="text-zinc-900 font-bold text-sm">Bs. {Number(merchant.total_revenue).toFixed(0)}</p>
                      <p className="text-zinc-400 text-[10px]">Ingresos</p>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex items-center justify-end">
                    <Link
                      href={`/admin/merchants/${merchant.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                      <Store className="w-3.5 h-3.5" />
                      Ver detalle
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
              <Store className="w-7 h-7 text-zinc-400" />
            </div>
            <p className="text-zinc-700 font-semibold">No hay comercios</p>
            <p className="text-zinc-400 text-sm mt-1">Crea el primer comercio con el botón "Nuevo comercio".</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
