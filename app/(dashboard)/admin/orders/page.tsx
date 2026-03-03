import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import StatusBadge from '@/components/orders/StatusBadge'
import CreateOrderForm from './CreateOrderForm'
import SearchBar from './SearchBar'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Package, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = [
  { value: '',           label: 'Todos' },
  { value: 'pending',    label: 'Pendientes' },
  { value: 'assigned',   label: 'Asignados' },
  { value: 'in_transit', label: 'En camino' },
  { value: 'delivered',  label: 'Entregados' },
  { value: 'cancelled',  label: 'Cancelados' },
]

const PRIORITY_BADGE: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high:   'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  low:    'bg-zinc-50 text-zinc-400 border-zinc-100',
}
const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgente', high: 'Alta', normal: 'Normal', low: 'Baja',
}

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>
}

const PAGE_SIZE = 20

export default async function OrdersPage({ searchParams }: PageProps) {
  const { status = '', page = '1', q = '' } = await searchParams
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
  if (q.trim()) {
    query = query.or(
      `order_number.ilike.%${q.trim()}%,pickup_address.ilike.%${q.trim()}%,delivery_address.ilike.%${q.trim()}%`
    )
  }

  const { data: orders, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-zinc-900 font-bold text-xl">Pedidos</h2>
          <p className="text-zinc-500 text-sm mt-0.5">{count ?? 0} pedidos en total</p>
        </div>
        <CreateOrderForm zones={zones ?? []} />
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <a
              key={f.value}
              href={f.value ? `/admin/orders?status=${f.value}` : '/admin/orders'}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                status === f.value
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
              )}
            >
              {f.label}
            </a>
          ))}
        </div>
        <SearchBar />
      </div>

      {/* Tabla */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        {orders && orders.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80 border-zinc-200">
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide w-32"># Pedido</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">Prioridad</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">Pickup</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden lg:table-cell">Entrega</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">Rider</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide text-right">Tarifa</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide text-right hidden sm:table-cell">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id} className="hover:bg-zinc-50/60 border-zinc-100">
                      <TableCell className="py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="group flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {order.order_number}
                          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="py-3 hidden md:table-cell">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                          PRIORITY_BADGE[order.priority] ?? PRIORITY_BADGE.normal
                        )}>
                          {PRIORITY_LABEL[order.priority] ?? 'Normal'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 max-w-[180px] hidden md:table-cell">
                        <p className="text-zinc-600 text-sm truncate">{order.pickup_address}</p>
                      </TableCell>
                      <TableCell className="py-3 max-w-[180px] hidden lg:table-cell">
                        <p className="text-zinc-600 text-sm truncate">{order.delivery_address}</p>
                      </TableCell>
                      <TableCell className="py-3 hidden md:table-cell">
                        {(order.riders as any)?.profiles?.full_name
                          ? <span className="text-zinc-700 text-sm">{(order.riders as any).profiles.full_name}</span>
                          : <span className="text-zinc-400 text-sm italic">Sin asignar</span>
                        }
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <span className="text-zinc-900 font-semibold text-sm">
                          {order.total_fee > 0 ? `Bs. ${Number(order.total_fee).toFixed(2)}` : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right hidden sm:table-cell">
                        <span className="text-zinc-400 text-xs">
                          {new Date(order.created_at).toLocaleDateString('es', {
                            day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
                <p className="text-xs text-zinc-400">
                  Página {currentPage} de {totalPages} · {count} resultados
                </p>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <a
                      href={`/admin/orders?${status ? `status=${status}&` : ''}page=${currentPage - 1}`}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      ← Anterior
                    </a>
                  )}
                  {currentPage < totalPages && (
                    <a
                      href={`/admin/orders?${status ? `status=${status}&` : ''}page=${currentPage + 1}`}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      Siguiente →
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
              <Package className="w-7 h-7 text-zinc-400" />
            </div>
            <p className="text-zinc-700 font-semibold">No hay pedidos</p>
            <p className="text-zinc-400 text-sm mt-1">
              {status ? 'Cambia el filtro para ver otros pedidos.' : 'Los pedidos aparecerán aquí cuando se creen.'}
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
