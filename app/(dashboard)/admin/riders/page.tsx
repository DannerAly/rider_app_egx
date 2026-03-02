import { createClient } from '@/lib/supabase/server'
import RiderStatusBadge from '@/components/riders/RiderStatusBadge'
import CreateRiderForm from './CreateRiderForm'
import { Users, Star } from 'lucide-react'

const VEHICLE_LABEL: Record<string, string> = {
  bicycle:    '🚲 Bicicleta',
  motorcycle: '🏍️ Moto',
  car:        '🚗 Auto',
  truck:      '🚛 Camión',
  walking:    '🚶 A pie',
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
      rating, total_deliveries, total_earnings,
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
          <h2 className="text-zinc-900 font-semibold text-lg">Riders</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            {counts.total} registrados · {counts.available} disponibles · {counts.busy} en pedido
          </p>
        </div>
        <CreateRiderForm zones={zones ?? []} />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <a
            key={f.value}
            href={f.value ? `/admin/riders?status=${f.value}` : '/admin/riders'}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === f.value
                ? 'bg-zinc-900 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* Grid de riders */}
      {riders && riders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {riders.map((rider: any) => (
            <div key={rider.id} className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-zinc-600 font-semibold text-sm">
                      {rider.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-zinc-900 font-semibold text-sm leading-tight">
                      {rider.profiles?.full_name ?? 'Sin nombre'}
                    </p>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      {rider.profiles?.phone ?? 'Sin teléfono'}
                    </p>
                  </div>
                </div>
                <RiderStatusBadge status={rider.status} />
              </div>

              <div className="space-y-2 text-sm">
                <Row label="Vehículo" value={VEHICLE_LABEL[rider.vehicle_type] ?? rider.vehicle_type} />
                {rider.vehicle_plate && <Row label="Placa" value={rider.vehicle_plate} mono />}
                {rider.vehicle_model && <Row label="Modelo" value={rider.vehicle_model} />}
                {rider.zones && <Row label="Zona" value={rider.zones.name} />}
                <Row label="Entregas" value={String(rider.total_deliveries)} />
                <Row
                  label="Rating"
                  value={`⭐ ${Number(rider.rating).toFixed(1)}`}
                />
                <Row label="Ganancias" value={`Bs. ${Number(rider.total_earnings).toFixed(2)}`} />
              </div>

              {rider.last_location_update && (
                <p className="text-xs text-zinc-400 mt-3 pt-3 border-t border-zinc-100">
                  Última ubicación:{' '}
                  {new Date(rider.last_location_update).toLocaleString('es', {
                    day: '2-digit', month: 'short',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-16">
          <Users className="w-8 h-8 text-zinc-300 mb-3" />
          <p className="text-zinc-500 font-medium">No hay riders</p>
          <p className="text-zinc-400 text-sm mt-1">
            {status ? 'Cambia el filtro para ver otros riders.' : 'Crea el primer rider con el botón "Nuevo rider".'}
          </p>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={`text-zinc-700 font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
