import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Datos del merchant
  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select(`
      id, name, slug, description, logo_url, banner_url, phone,
      address, lat, lng, rating, total_orders, avg_prep_time_min,
      min_order_amount, opening_hours,
      merchant_categories:category_id(name, slug, icon)
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (merchantError || !merchant) {
    return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
  }

  // Menú agrupado por categoría
  const { data: categories } = await supabase
    .from('menu_categories')
    .select(`
      id, name, description, sort_order,
      products(
        id, name, description, price, image_url, prep_time_min,
        is_available, is_featured, sort_order,
        available_from, available_until, available_days,
        modifier_groups(
          id, name, min_selections, max_selections, is_required, sort_order,
          modifiers(id, name, price_addition, is_available, sort_order)
        )
      )
    `)
    .eq('merchant_id', id)
    .eq('is_active', true)
    .order('sort_order')

  // Filtrar productos por disponibilidad horaria
  const now = new Date()
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const currentDay = now.getDay() // 0=domingo, 6=sábado

  const filteredCategories = (categories ?? []).map(cat => ({
    ...cat,
    products: ((cat as any).products ?? []).map((product: any) => {
      let available = product.is_available

      // Verificar día de la semana
      if (available && product.available_days && !product.available_days.includes(currentDay)) {
        available = false
      }

      // Verificar rango horario
      if (available && product.available_from && product.available_until) {
        if (product.available_from > product.available_until) {
          // Cruza medianoche (ej: 22:00 - 02:00)
          available = currentHHMM >= product.available_from || currentHHMM <= product.available_until
        } else {
          available = currentHHMM >= product.available_from && currentHHMM <= product.available_until
        }
      }

      return { ...product, is_available: available }
    }),
  }))

  return NextResponse.json({ merchant, categories: filteredCategories })
}
