import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  let query = supabase
    .from('merchants')
    .select(`
      id, name, slug, description, logo_url, banner_url, phone,
      address, lat, lng, rating, total_orders, avg_prep_time_min,
      min_order_amount, is_featured,
      merchant_categories:category_id(id, name, slug, icon)
    `)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('rating', { ascending: false })

  if (category) query = query.eq('category_id', category)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data: merchants, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Si hay coordenadas, calcular distancia y ordenar
  let result = merchants ?? []
  if (lat && lng) {
    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    result = result
      .map(m => ({
        ...m,
        distance_km: haversine(userLat, userLng, m.lat, m.lng),
      }))
      .sort((a, b) => a.distance_km - b.distance_km)
  }

  // Obtener categorías para filtros
  const { data: categories } = await supabase
    .from('merchant_categories')
    .select('id, name, slug, icon')
    .eq('is_active', true)
    .order('sort_order')

  return NextResponse.json({ data: result, categories: categories ?? [] })
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
