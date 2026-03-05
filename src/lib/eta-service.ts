/**
 * ETA Service
 * Calcula tiempo estimado de entrega usando Google Distance Matrix API
 * con fallback a Haversine cuando no hay API key configurada.
 */

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY

interface ETAResult {
  eta_minutes: number
  estimated_delivery_at: string
  distance_km: number
  source: 'google' | 'haversine'
}

interface LatLng {
  lat: number
  lng: number
}

/**
 * Calcula la distancia usando Haversine (fallback sin API key)
 */
function haversineDistance(from: LatLng, to: LatLng): number {
  const R = 6371
  const dLat = (to.lat - from.lat) * Math.PI / 180
  const dLng = (to.lng - from.lng) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Estima tiempo en minutos basado en distancia y velocidad promedio
 * Velocidad: ~25 km/h para motos en ciudad (con tráfico, semáforos, etc.)
 */
function estimateMinutesFromDistance(distanceKm: number): number {
  const AVG_SPEED_KMH = 25
  const minutes = (distanceKm / AVG_SPEED_KMH) * 60
  // Mínimo 5 minutos, agregar 3 min de buffer por parada
  return Math.max(5, Math.round(minutes + 3))
}

/**
 * Calcula ETA usando Google Distance Matrix API
 */
async function googleDistanceMatrix(
  origin: LatLng,
  destination: LatLng
): Promise<{ duration_minutes: number; distance_km: number } | null> {
  if (!GOOGLE_MAPS_KEY) return null

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', `${origin.lat},${origin.lng}`)
    url.searchParams.set('destinations', `${destination.lat},${destination.lng}`)
    url.searchParams.set('mode', 'driving')
    url.searchParams.set('departure_time', 'now')
    url.searchParams.set('key', GOOGLE_MAPS_KEY)

    const res = await fetch(url.toString())
    const data = await res.json()

    if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const element = data.rows[0].elements[0]
      // Usar duration_in_traffic si está disponible, sino duration normal
      const durationSeconds = element.duration_in_traffic?.value ?? element.duration.value
      const distanceMeters = element.distance.value

      return {
        duration_minutes: Math.round(durationSeconds / 60),
        distance_km: distanceMeters / 1000,
      }
    }
  } catch {
    // Silenciar errores de API, caer al fallback
  }

  return null
}

/**
 * Calcula ETA completo para una entrega
 * Considera: rider → merchant + tiempo preparación + merchant → cliente
 */
export async function calculateETA(params: {
  riderLocation: LatLng
  merchantLocation: LatLng
  deliveryLocation: LatLng
  prepTimeMinutes?: number
}): Promise<ETAResult> {
  const { riderLocation, merchantLocation, deliveryLocation, prepTimeMinutes = 0 } = params

  // Intentar Google Distance Matrix
  const [legPickup, legDelivery] = await Promise.all([
    googleDistanceMatrix(riderLocation, merchantLocation),
    googleDistanceMatrix(merchantLocation, deliveryLocation),
  ])

  if (legPickup && legDelivery) {
    const totalMinutes = legPickup.duration_minutes + prepTimeMinutes + legDelivery.duration_minutes
    const totalDistance = legPickup.distance_km + legDelivery.distance_km

    return {
      eta_minutes: totalMinutes,
      estimated_delivery_at: new Date(Date.now() + totalMinutes * 60000).toISOString(),
      distance_km: parseFloat(totalDistance.toFixed(2)),
      source: 'google',
    }
  }

  // Fallback a Haversine
  const distPickup = haversineDistance(riderLocation, merchantLocation)
  const distDelivery = haversineDistance(merchantLocation, deliveryLocation)
  const totalDistance = distPickup + distDelivery

  const pickupMinutes = estimateMinutesFromDistance(distPickup)
  const deliveryMinutes = estimateMinutesFromDistance(distDelivery)
  const totalMinutes = pickupMinutes + prepTimeMinutes + deliveryMinutes

  return {
    eta_minutes: totalMinutes,
    estimated_delivery_at: new Date(Date.now() + totalMinutes * 60000).toISOString(),
    distance_km: parseFloat(totalDistance.toFixed(2)),
    source: 'haversine',
  }
}

/**
 * Calcula ETA simplificado para un solo tramo (rider → destino)
 */
export async function calculateSimpleETA(
  from: LatLng,
  to: LatLng
): Promise<{ eta_minutes: number; source: 'google' | 'haversine' }> {
  const result = await googleDistanceMatrix(from, to)

  if (result) {
    return { eta_minutes: result.duration_minutes, source: 'google' }
  }

  const distance = haversineDistance(from, to)
  return { eta_minutes: estimateMinutesFromDistance(distance), source: 'haversine' }
}
