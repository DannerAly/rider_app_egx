import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/orders/StatusBadge'
import CreateOrderForm from './CreateOrderForm'
import { Package } from 'lucide-react'

const STATUS_FILTERS = [
  { value: '',                 label: 'Todos' },
  { value: 'pending',          label: 'Pendientes' },
  { value: 'assigned',         label: 'Asignados' },
  { value: 'in_transit',       label: 'En camino' },
  { value: 'delivered',        label: 'Entregados' },
  { value: 'cancelled',        label: 'Cancelados' },
]

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

const PAGE_SIZE = 20

export default async function OrdersPage({ searchParams }: PageProps) {
  const { status = '', page = '1' } = await searchParams
  const currentPage = Math.max(1, parseInt(page))
  const from = (currentPage - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const supabase = await createClient()

  const { data: zones } = await supabase
    .from('zones').select('id, name').eq('is_active', true).order('name')

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, status, priority,
      pickup_address, delivery_address,
      total_fee, created_at,
      profiles!orders_dispatcher_id_fkey(full_name),
      riders(profiles(full_name)),
      customers(profiles(full_name))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)

  const { data: orders, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-zinc-900 font-semibold text-lg">Pedidos</h2>
          <p className="text-zinc-500 text-sm mt-0.5">{count ?? 0} pedidos en total</p>
        </div>
        <CreateOrderForm zones={zones ?? []} />
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <a
            key={f.value}
            href={f.value ? `/admin/orders?status=${f.value}` : '/admin/orders'}
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

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {orders && orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide"># Pedido</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">Pickup</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden lg:table-cell">Entrega</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">Rider</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tarifa</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden sm:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700 font-medium">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600 max-w-[180px] truncate hidden md:table-cell">
                      {order.pickup_address}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 max-w-[180px] truncate hidden lg:table-cell">
                      {order.delivery_address}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 hidden md:table-cell">
                      {(order.riders as any)?.profiles?.full_name ?? (
                        <span className="text-zinc-400 italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-900 font-medium">
                      {order.total_fee > 0 ? `Bs. ${Number(order.total_fee).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400 text-xs hidden sm:table-cell">
                      {new Date(order.created_at).toLocaleDateString('es', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-8 h-8 text-zinc-300 mb-3" />
            <p className="text-zinc-500 font-medium">No hay pedidos</p>
            <p className="text-zinc-400 text-sm mt-1">
              {status ? 'Cambia el filtro para ver otros pedidos.' : 'Los pedidos aparecerán aquí cuando se creen.'}
            </p>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
            <p className="text-xs text-zinc-400">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <a
                  href={`/admin/orders?${status ? `status=${status}&` : ''}page=${currentPage - 1}`}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Anterior
                </a>
              )}
              {currentPage < totalPages && (
                <a
                  href={`/admin/orders?${status ? `status=${status}&` : ''}page=${currentPage + 1}`}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Siguiente
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
