import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/orders/StatusBadge'
import OrderMap from '@/components/map/OrderMap'
import OrderActions from './OrderActions'
import { ArrowLeft, MapPin, Flag, Package, User, DollarSign, Hash, Clock, ExternalLink, MessageCircle, Image } from 'lucide-react'

const PRIORITY_LABEL: Record<string, string> = {
  low: '🔵 Baja', normal: '⚪ Normal', high: '🟠 Alta', urgent: '🔴 Urgente',
}

const VEHICLE_LABEL: Record<string, string> = {
  bicycle: '🚲', motorcycle: '🏍️', car: '🚗', truck: '🚛', walking: '🚶',
}

const STATUS_LABEL: Record<string, string> = {
  pending:           'Pendiente',
  assigned:          'Asignado',
  heading_to_pickup: 'Hacia recogida',
  picked_up:         'Recogido',
  in_transit:        'En camino',
  delivered:         'Entregado',
  cancelled:         'Cancelado',
  failed:            'Fallido',
}

interface PageProps { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: order }, { data: history }, { data: ridersRaw }] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        *,
        riders(id, vehicle_type, vehicle_plate, current_lat, current_lng,
          profiles(full_name, phone)),
        zones(name),
        profiles!orders_dispatcher_id_fkey(full_name)
      `)
      .eq('id', id)
      .single(),

    supabase
      .from('order_status_history')
      .select('id, status, notes, created_at, profiles(full_name)')
      .eq('order_id', id)
      .order('created_at', { ascending: true }),

    supabase
      .from('riders')
      .select('id, vehicle_type, profiles(full_name)')
      .in('status', ['available', 'busy']),
  ])

  if (!order) notFound()

  const rider      = order.riders as any
  const dispatcher = (order as any).profiles as any

  const availableRiders = (ridersRaw ?? []).map((r: any) => ({
    id:      r.id,
    name:    r.profiles?.full_name ?? 'Sin nombre',
    vehicle: VEHICLE_LABEL[r.vehicle_type] ?? r.vehicle_type,
  }))

  return (
    <div className="space-y-4">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-zinc-200 px-5 py-4">
        <Link
          href="/admin/orders"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-500 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div>
          <div className="flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-semibold text-zinc-900">{order.order_number}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Creado {new Date(order.created_at).toLocaleString('es', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
            {dispatcher?.full_name && ` · por ${dispatcher.full_name}`}
          </p>
        </div>

        <StatusBadge status={order.status} />
        <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
          {PRIORITY_LABEL[order.priority] ?? order.priority}
        </span>

        {/* Link de tracking para el cliente */}
        <Link
          href={`/track/${order.tracking_code}`}
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ver tracking
        </Link>

        {/* WhatsApp: compartir tracking con el cliente */}
        {order.delivery_contact_phone && (
          <a
            href={`https://wa.me/${order.delivery_contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
              `Hola ${order.delivery_contact_name ?? ''}, tu pedido #${order.order_number} está en camino. Sigue tu entrega aquí: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/track/${order.tracking_code}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-green-200 bg-green-50 text-sm text-green-700 hover:bg-green-100 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        )}

        <div className="ml-auto">
          <OrderActions
            orderId={order.id}
            currentStatus={order.status}
            currentRiderId={order.rider_id ?? null}
            availableRiders={availableRiders}
          />
        </div>
      </div>

      {/* ── Layout principal ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Mapa */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-zinc-200 overflow-hidden" style={{ height: '420px' }}>
          <OrderMap
            pickupLat={order.pickup_lat}
            pickupLng={order.pickup_lng}
            deliveryLat={order.delivery_lat}
            deliveryLng={order.delivery_lng}
            riderLat={rider?.current_lat ?? null}
            riderLng={rider?.current_lng ?? null}
          />
        </div>

        {/* Panel de info */}
        <div className="lg:col-span-2 space-y-3">

          {/* Pickup */}
          <InfoCard icon={<MapPin className="w-4 h-4 text-green-600" />} title="Punto de recogida" color="green">
            <InfoRow label="Dirección" value={order.pickup_address} />
            {order.pickup_contact_name  && <InfoRow label="Contacto" value={order.pickup_contact_name} />}
            {order.pickup_contact_phone && <InfoRow label="Teléfono" value={order.pickup_contact_phone} />}
            {order.pickup_notes         && <InfoRow label="Notas"    value={order.pickup_notes} />}
          </InfoCard>

          {/* Delivery */}
          <InfoCard icon={<Flag className="w-4 h-4 text-red-600" />} title="Punto de entrega" color="red">
            <InfoRow label="Dirección" value={order.delivery_address} />
            {order.delivery_contact_name  && <InfoRow label="Contacto" value={order.delivery_contact_name} />}
            {order.delivery_contact_phone && <InfoRow label="Teléfono" value={order.delivery_contact_phone} />}
            {order.delivery_notes         && <InfoRow label="Notas"    value={order.delivery_notes} />}
          </InfoCard>

          {/* Paquete + tarifa */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={<Package className="w-4 h-4 text-zinc-500" />} title="Paquete">
              {order.package_description && <InfoRow label="Descripción" value={order.package_description} />}
              {order.package_weight_kg   && <InfoRow label="Peso" value={`${order.package_weight_kg} kg`} />}
              {order.zones               && <InfoRow label="Zona" value={(order.zones as any).name} />}
              {!order.package_description && !order.package_weight_kg && (
                <p className="text-xs text-zinc-400">Sin detalles</p>
              )}
            </InfoCard>

            <InfoCard icon={<DollarSign className="w-4 h-4 text-zinc-500" />} title="Tarifa">
              <InfoRow label="Base"      value={`Bs. ${Number(order.base_fee).toFixed(2)}`} />
              <InfoRow label="Distancia" value={`${Number(order.distance_km).toFixed(1)} km`} />
              <InfoRow label="Total"     value={`Bs. ${Number(order.total_fee).toFixed(2)}`} bold />
            </InfoCard>
          </div>

          {/* Rider */}
          {rider && (
            <InfoCard icon={<User className="w-4 h-4 text-blue-500" />} title="Rider asignado">
              <InfoRow label="Nombre"   value={rider.profiles?.full_name ?? '—'} />
              <InfoRow label="Teléfono" value={rider.profiles?.phone     ?? '—'} />
              <InfoRow label="Vehículo" value={`${VEHICLE_LABEL[rider.vehicle_type] ?? ''} ${rider.vehicle_plate ?? ''}`.trim()} />
              <div className="mt-1">
                <Link
                  href={`/admin/riders/${rider.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver perfil y ruta →
                </Link>
              </div>
            </InfoCard>
          )}
        </div>
      </div>

      {/* ── Foto de entrega ──────────────────────────────────────────────── */}
      {(order as any).delivery_photo_url && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-4 h-4 text-zinc-400" />
            <h3 className="font-semibold text-zinc-800 text-sm">Foto de entrega</h3>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={(order as any).delivery_photo_url}
            alt="Foto de entrega"
            className="w-full max-w-sm rounded-xl object-cover border border-zinc-100"
          />
        </div>
      )}

      {/* ── Timeline de estados ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-zinc-400" />
          <h3 className="font-semibold text-zinc-800 text-sm">Historial de estados</h3>
        </div>

        {history && history.length > 0 ? (
          <ol className="relative border-l border-zinc-200 ml-2 space-y-4">
            {history.map((h: any, i: number) => (
              <li key={h.id} className="ml-5">
                <div className={`absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-white ${
                  i === history.length - 1 ? 'bg-blue-600' : 'bg-zinc-300'
                }`} />
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={h.status} />
                  <span className="text-xs text-zinc-400">
                    {new Date(h.created_at).toLocaleString('es', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {h.profiles?.full_name && (
                    <span className="text-xs text-zinc-500">· {h.profiles.full_name}</span>
                  )}
                </div>
                {h.notes && (
                  <p className="text-xs text-zinc-500 mt-0.5 italic">"{h.notes}"</p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-zinc-400">Sin historial registrado</p>
        )}
      </div>
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function InfoCard({ icon, title, color, children }: {
  icon: React.ReactNode; title: string; color?: string; children: React.ReactNode
}) {
  const border = color === 'green' ? 'border-green-100 bg-green-50/30'
               : color === 'red'   ? 'border-red-100 bg-red-50/30'
               :                     'border-zinc-100 bg-white'
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${border}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-zinc-400 flex-shrink-0">{label}</span>
      <span className={`text-zinc-700 text-right ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  )
}
