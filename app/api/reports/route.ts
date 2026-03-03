import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Parse date range from query params
  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  const to = toParam ? new Date(toParam + 'T23:59:59.999Z') : new Date()
  const from = fromParam
    ? new Date(fromParam + 'T00:00:00.000Z')
    : new Date(new Date().setDate(to.getDate() - 29))
  from.setHours(0, 0, 0, 0)

  const fromISO = from.toISOString()
  const toISO = to.toISOString()

  // Fetch orders in range
  const { data: ordersInRange, error: ordersErr } = await supabase
    .from('orders')
    .select('id, status, total_fee, created_at, delivered_at, rider_id')
    .gte('created_at', fromISO)
    .lte('created_at', toISO)
    .order('created_at')

  if (ordersErr) {
    return NextResponse.json({ error: ordersErr.message }, { status: 500 })
  }

  const orders = ordersInRange ?? []

  // 1. dailyStats: group by date
  const dailyMap: Record<string, { total: number; delivered: number; revenue: number }> = {}

  // Pre-populate all dates in range
  const current = new Date(from)
  while (current <= to) {
    const key = current.toISOString().split('T')[0]
    dailyMap[key] = { total: 0, delivered: 0, revenue: 0 }
    current.setDate(current.getDate() + 1)
  }

  orders.forEach((o) => {
    const key = o.created_at.split('T')[0]
    if (dailyMap[key]) {
      dailyMap[key].total++
      if (o.status === 'delivered') {
        dailyMap[key].delivered++
        dailyMap[key].revenue += Number(o.total_fee ?? 0)
      }
    }
  })

  const daily = Object.entries(dailyMap).map(([date, d]) => ({
    date,
    ...d,
  }))

  // 2. statusCounts
  const statusCounts: Record<string, number> = {}
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1
  })

  // 3. topRiders: aggregate deliveries by rider in this range
  const riderDeliveries: Record<string, { deliveries: number; earnings: number }> = {}
  orders.forEach((o) => {
    if (o.status === 'delivered' && o.rider_id) {
      if (!riderDeliveries[o.rider_id]) {
        riderDeliveries[o.rider_id] = { deliveries: 0, earnings: 0 }
      }
      riderDeliveries[o.rider_id].deliveries++
      riderDeliveries[o.rider_id].earnings += Number(o.total_fee ?? 0)
    }
  })

  // Get top 10 rider IDs by deliveries
  const topRiderIds = Object.entries(riderDeliveries)
    .sort((a, b) => b[1].deliveries - a[1].deliveries)
    .slice(0, 10)

  // Fetch rider names
  let topRiders: { name: string; deliveries: number; earnings: number }[] = []
  if (topRiderIds.length > 0) {
    const ids = topRiderIds.map(([id]) => id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', ids)

    const nameMap: Record<string, string> = {}
    profiles?.forEach((p) => {
      nameMap[p.id] = p.full_name ?? 'Sin nombre'
    })

    topRiders = topRiderIds.map(([id, stats]) => ({
      name: nameMap[id] ?? 'Sin nombre',
      deliveries: stats.deliveries,
      earnings: parseFloat(stats.earnings.toFixed(2)),
    }))
  }

  // 4. summary KPIs
  const totalOrders = orders.length
  const totalDelivered = orders.filter((o) => o.status === 'delivered').length
  const successRate = totalOrders > 0 ? parseFloat(((totalDelivered / totalOrders) * 100).toFixed(1)) : 0
  const totalRevenue = parseFloat(
    orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.total_fee ?? 0), 0)
      .toFixed(2)
  )

  // Avg delivery time in minutes (delivered_at - created_at)
  const deliveredOrders = orders.filter((o) => o.status === 'delivered' && o.delivered_at)
  let avgDeliveryTimeMins = 0
  if (deliveredOrders.length > 0) {
    const totalMins = deliveredOrders.reduce((sum, o) => {
      const created = new Date(o.created_at).getTime()
      const delivered = new Date(o.delivered_at).getTime()
      return sum + (delivered - created) / 60000
    }, 0)
    avgDeliveryTimeMins = parseFloat((totalMins / deliveredOrders.length).toFixed(1))
  }

  return NextResponse.json({
    daily,
    statusCounts,
    topRiders,
    summary: {
      totalOrders,
      totalDelivered,
      successRate,
      totalRevenue,
      avgDeliveryTimeMins,
    },
  })
}
