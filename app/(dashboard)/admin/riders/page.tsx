import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import RiderStatusBadge from '@/components/riders/RiderStatusBadge'
import CreateRiderForm from './CreateRiderForm'
import RiderActions from './RiderActions'
import EditRiderForm from './EditRiderForm'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Users, Route, Star, Package, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

const VEHICLE_LABEL: Record<string, string> = {
  bicycle: '🚲 Bicicleta', motorcycle: '🏍️ Moto',
  car: '🚗 Auto', truck: '🚛 Camión', walking: '🚶 A pie',
}

const STATUS_FILTERS = [
  { value: '',          label: 'Todos' },
  { value: 'available', label: 'Disponibles' },
  { value: 'busy',      label: 'En pedido' },
  { value: 'on_break',  label: 'Descanso' },
  { value: 'offline',   label: 'Desconectados' },
]

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function RidersPage({ searchParams }: PageProps) {
  const { status = '' } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('riders')
    .select(`
      id, status, vehicle_type, vehicle_plate, vehicle_model,
      zone_id, rating, total_deliveries, total_earnings,
      last_location_update, is_verified,
      profiles(full_name, phone, is_active),
      zones(name)
    `)
    .order('status')

  if (status) query = query.eq('status', status)

  const [{ data: riders }, { data: zones }] = await Promise.all([
    query,
    supabase.from('zones').select('id, name').eq('is_active', true).order('name'),
  ])

  const counts = {
    total:     riders?.length ?? 0,
    available: riders?.filter(r => r.status === 'available').length ?? 0,
    busy:      riders?.filter(r => r.status === 'busy').length ?? 0,
  }

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-zinc-900 font-bold text-xl">Riders</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            {counts.total} registrados ·{' '}
            <span className="text-emerald-600 font-medium">{counts.available} disponibles</span> ·{' '}
            <span className="text-blue-600 font-medium">{counts.busy} en pedido</span>
          </p>
        </div>
        <CreateRiderForm zones={zones ?? []} />
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <a
            key={f.value}
            href={f.value ? `/admin/riders?status=${f.value}` : '/admin/riders'}
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
      {riders && riders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {riders.map((rider: any) => {
            const initials = (rider.profiles?.full_name ?? '?')
              .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

            return (
              <Card key={rider.id} className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-5">
                  {/* Header del card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-11 h-11">
                        <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-900 text-white text-sm font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-zinc-900 font-semibold text-sm leading-tight">
                          {rider.profiles?.full_name ?? 'Sin nombre'}
                        </p>
                        <p className="text-zinc-500 text-xs mt-0.5">
                          {rider.profiles?.phone ?? 'Sin teléfono'}
                        </p>
                      </div>
                    </div>
                    <RiderStatusBadge status={rider.status} />
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-xs">Vehículo</span>
                      <span className="text-zinc-700 font-medium text-xs">
                        {VEHICLE_LABEL[rider.vehicle_type] ?? rider.vehicle_type}
                      </span>
                    </div>
                    {rider.vehicle_plate && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 text-xs">Placa</span>
                        <span className="text-zinc-700 font-mono text-xs">{rider.vehicle_plate}</span>
                      </div>
                    )}
                    {(rider as any).zones && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 text-xs">Zona</span>
                        <span className="text-zinc-700 text-xs">{(rider as any).zones.name}</span>
                      </div>
                    )}
                  </div>

                  <Separator className="my-3" />

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        <Package className="w-3 h-3 text-blue-500" />
                      </div>
                      <p className="text-zinc-900 font-bold text-sm">{rider.total_deliveries}</p>
                      <p className="text-zinc-400 text-[10px]">Entregas</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        <Star className="w-3 h-3 text-amber-500" />
                      </div>
                      <p className="text-zinc-900 font-bold text-sm">{Number(rider.rating).toFixed(1)}</p>
                      <p className="text-zinc-400 text-[10px]">Rating</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        <Wallet className="w-3 h-3 text-emerald-500" />
                      </div>
                      <p className="text-zinc-900 font-bold text-sm">{Number(rider.total_earnings).toFixed(0)}</p>
                      <p className="text-zinc-400 text-[10px]">Bs. ganados</p>
                    </div>
                  </div>

                  {rider.last_location_update && (
                    <p className="text-zinc-400 text-[10px] mt-3 text-center">
                      GPS: {new Date(rider.last_location_update).toLocaleTimeString('es', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}

                  {/* Acciones */}
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/riders/${rider.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                      <Route className="w-3.5 h-3.5" />
                      Ver ruta
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <EditRiderForm
                        rider={{
                          id:            rider.id,
                          full_name:     rider.profiles?.full_name ?? '',
                          phone:         rider.profiles?.phone ?? '',
                          vehicle_type:  rider.vehicle_type,
                          vehicle_plate: rider.vehicle_plate ?? '',
                          vehicle_model: rider.vehicle_model ?? '',
                          zone_id:       rider.zone_id ?? '',
                        }}
                        zones={zones ?? []}
                      />
                      <RiderActions riderId={rider.id} currentStatus={rider.status} />
                    </div>
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
              <Users className="w-7 h-7 text-zinc-400" />
            </div>
            <p className="text-zinc-700 font-semibold">No hay riders</p>
            <p className="text-zinc-400 text-sm mt-1">
              {status ? 'Cambia el filtro para ver otros riders.' : 'Crea el primer rider con el botón "Nuevo rider".'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
