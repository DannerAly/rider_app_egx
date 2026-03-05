import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoAssignRider } from '@/lib/matching-engine'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params
  const supabase = createAdminClient()

  const result = await autoAssignRider(supabase, orderId)

  if (result.assigned) {
    return NextResponse.json({
      message: 'Rider asignado',
      rider_id: result.rider_id,
    })
  }

  return NextResponse.json({
    message: 'No se pudo asignar rider',
    error: result.error,
  }, { status: result.error === 'Pedido no encontrado' ? 404 : 200 })
}
