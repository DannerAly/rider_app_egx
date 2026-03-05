/**
 * Motor de matching: asigna el mejor rider disponible a un pedido.
 *
 * Score = distancia (70%) + rating (20%) + carga (10%)
 * Menor distancia + mayor rating + menor carga = mejor candidato
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateETA } from './eta-service'

interface RiderCandidate {
  id: string
  current_lat: number | null
  current_lng: number | null
  rating: number
  total_deliveries: number
  vehicle_type: string
  status: string
}

interface OrderLocation {
  pickup_lat: number
  pickup_lng: number
}

interface MatchResult {
  rider_id: string
  score: number
  distance_km: number
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function findBestRider(
  supabase: SupabaseClient,
  order: OrderLocation,
  excludeRiderIds: string[] = []
): Promise<MatchResult | null> {
  // Obtener riders disponibles con ubicación reciente
  let query = supabase
    .from('riders')
    .select('id, current_lat, current_lng, rating, total_deliveries, vehicle_type, status')
    .eq('status', 'available')
    .not('current_lat', 'is', null)
    .not('current_lng', 'is', null)

  if (excludeRiderIds.length > 0) {
    query = query.not('id', 'in', `(${excludeRiderIds.join(',')})`)
  }

  const { data: riders } = await query

  if (!riders || riders.length === 0) return null

  // Calcular scores
  const candidates: (MatchResult & { raw_rating: number })[] = riders.map((r: RiderCandidate) => {
    const distance = haversine(r.current_lat!, r.current_lng!, order.pickup_lat, order.pickup_lng)
    return {
      rider_id: r.id,
      distance_km: distance,
      raw_rating: Number(r.rating),
      score: 0,
    }
  })

  // Normalizar distancias (invertir: menor distancia = mayor score)
  const maxDist = Math.max(...candidates.map(c => c.distance_km), 0.1)
  const maxRating = 5

  for (const c of candidates) {
    const distScore = 1 - (c.distance_km / maxDist)      // 0-1, mayor = más cerca
    const ratingScore = c.raw_rating / maxRating           // 0-1
    c.score = distScore * 0.7 + ratingScore * 0.3
  }

  // Ordenar por score descendente
  candidates.sort((a, b) => b.score - a.score)

  // Filtrar riders a más de 10km
  const best = candidates.find(c => c.distance_km <= 10)

  return best ? { rider_id: best.rider_id, score: best.score, distance_km: best.distance_km } : null
}

/**
 * Intenta asignar un rider a un pedido.
 * Retorna true si se asignó, false si no hay riders disponibles.
 */
export async function autoAssignRider(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ assigned: boolean; rider_id?: string; error?: string }> {
  // Obtener datos del pedido
  const { data: order } = await supabase
    .from('orders')
    .select('id, pickup_lat, pickup_lng, delivery_lat, delivery_lng, rider_id, status, merchant_status, estimated_prep_time_min')
    .eq('id', orderId)
    .single()

  if (!order) return { assigned: false, error: 'Pedido no encontrado' }
  if (order.rider_id) return { assigned: false, error: 'Ya tiene rider asignado' }

  const match = await findBestRider(supabase, {
    pickup_lat: order.pickup_lat,
    pickup_lng: order.pickup_lng,
  })

  if (!match) return { assigned: false, error: 'No hay riders disponibles' }

  // Asignar rider (atómico: solo si aún no tiene rider)
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      rider_id: match.rider_id,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .is('rider_id', null)

  if (updateError) return { assigned: false, error: updateError.message }

  // Cambiar rider a busy
  await supabase
    .from('riders')
    .update({ status: 'busy' })
    .eq('id', match.rider_id)

  // Calcular ETA si hay coordenadas del rider
  const { data: rider } = await supabase
    .from('riders')
    .select('current_lat, current_lng')
    .eq('id', match.rider_id)
    .single()

  if (rider?.current_lat && rider?.current_lng && order.delivery_lat && order.delivery_lng) {
    try {
      const eta = await calculateETA({
        riderLocation: { lat: rider.current_lat, lng: rider.current_lng },
        merchantLocation: { lat: order.pickup_lat, lng: order.pickup_lng },
        deliveryLocation: { lat: order.delivery_lat, lng: order.delivery_lng },
        prepTimeMinutes: order.estimated_prep_time_min ?? 0,
      })

      await supabase.from('orders').update({
        eta_minutes: eta.eta_minutes,
        estimated_delivery_at: eta.estimated_delivery_at,
        eta_updated_at: new Date().toISOString(),
      }).eq('id', orderId)
    } catch { /* ETA es best-effort, no bloquea la asignación */ }
  }

  // Historial
  await supabase.from('order_status_history').insert({
    order_id: orderId,
    status: 'assigned',
    notes: `Auto-asignado. Distancia: ${match.distance_km.toFixed(1)}km, Score: ${match.score.toFixed(2)}`,
    changed_by: match.rider_id,
  })

  // Notificar al rider
  await supabase.from('notifications').insert({
    user_id: match.rider_id,
    title: 'Nuevo pedido asignado',
    body: 'Se te ha asignado un pedido. Revisa tu app.',
    type: 'order_assigned',
    data: { order_id: orderId },
  })

  return { assigned: true, rider_id: match.rider_id }
}
