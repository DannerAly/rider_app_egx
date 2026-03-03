import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RiderRouteMap from '@/components/map/RiderRouteMap'
import RiderStatusBadge from '@/components/riders/RiderStatusBadge'
import { ArrowLeft, Star, Package, DollarSign, MapPin } from 'lucide-react'

const VEHICLE_LABEL: Record<string, string> = {
  bicycle:    '🚲 Bicicleta',
  motorcycle: '🏍️ Moto',
  car:        '🚗 Auto',
  truck:      '🚛 Camión',
  walking:    '🚶 A pie',
}

interface PageProps {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ date?: string }>
}

export default async function RiderDetailPage({ params, searchParams }: PageProps) {
  const { id }   = await params
  const { date } = await searchParams

  const today      = new Date().toISOString().slice(0, 10)
  const activeDate = date ?? today

  const supabase = await createClient()

  const { data: rider, error } = await supabase
    .from('riders')
    .select(`
      id, status, vehicle_type, vehicle_plate, vehicle_model,
      rating, total_deliveries, total_earnings,
      last_location_update,
      profiles(full_name, phone),
      zones(name)
    `)
    .eq('id', id)
    .single()

  if (error || !rider) notFound()

  // Ruta del día seleccionado
  const from = `${activeDate}T00:00:00+00:00`
  const to   = `${activeDate}T23:59:59+00:00`

  const { data: routePoints } = await supabase
    .from('rider_location_history')
    .select('lat, lng, heading, speed_kmh, recorded_at')
    .eq('rider_id', id)
    .gte('recorded_at', from)
    .lte('recorded_at', to)
    .order('recorded_at', { ascending: true })

  const profile = rider.profiles as any

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 bg-white rounded-xl border border-zinc-200 px-5 py-4">
        <Link
          href="/admin/riders"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-500 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Avatar + nombre */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-semibold text-zinc-700 flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-zinc-900 text-sm leading-tight">
              {profile?.full_name ?? 'Sin nombre'}
            </p>
            <p className="text-zinc-400 text-xs">{profile?.phone ?? 'Sin teléfono'}</p>
          </div>
        </div>

        <RiderStatusBadge status={rider.status} />

        <div className="hidden md:flex items-center gap-5 text-sm ml-4 flex-wrap">
          <QuickStat icon={<Star       className="w-3.5 h-3.5 text-yellow-500" />} value={Number(rider.rating).toFixed(1)}                     label="rating" />
          <QuickStat icon={<Package    className="w-3.5 h-3.5 text-blue-500"   />} value={String(rider.total_deliveries)}                       label="entregas" />
          <QuickStat icon={<DollarSign className="w-3.5 h-3.5 text-green-500"  />} value={`Bs. ${Number(rider.total_earnings).toFixed(0)}`}     label="ganancias" />
          {rider.zones && (
            <QuickStat icon={<MapPin   className="w-3.5 h-3.5 text-zinc-400"   />} value={(rider.zones as any).name} label="zona" />
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-zinc-500 flex-shrink-0">
          <span>{VEHICLE_LABEL[rider.vehicle_type] ?? rider.vehicle_type}</span>
          {rider.vehicle_plate && (
            <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded">{rider.vehicle_plate}</span>
          )}
        </div>
      </div>

      {/* ── Mapa de ruta ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
        <RiderRouteMap
          riderId={id}
          initialDate={activeDate}
          initialPoints={routePoints ?? []}
        />
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
