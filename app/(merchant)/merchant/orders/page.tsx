'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMerchantOrders, type MerchantOrder } from '@/hooks/useMerchantOrders'
import dynamic from 'next/dynamic'
import {
  Loader2, Clock, ChefHat, CheckCircle, X, Volume2, VolumeX,
  RefreshCw, Phone, MapPin, Banknote, Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PrintReceiptButton = dynamic(() => import('@/components/merchant/PrintReceiptButton'), { ssr: false })
const PrinterButton = dynamic(() => import('@/components/merchant/PrinterButton'), { ssr: false })

export default function MerchantOrdersPage() {
  const { pending, preparing, ready, loading, updatingId, soundEnabled, setSoundEnabled, updateStatus } = useMerchantOrders(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-100">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="font-bold text-zinc-900 text-lg">Pedidos</h1>
        <div className="flex items-center gap-2">
          <PrinterButton />
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
              soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-400'
            )}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Nuevos */}
        <KanbanColumn
          title="Nuevos"
          icon={<Clock className="w-4 h-4" />}
          count={pending.length}
          color="amber"
          orders={pending}
          updatingId={updatingId}
          actions={(order) => (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => updateStatus(order.id, 'rejected')}
                disabled={updatingId === order.id}
                className="flex-1 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
              >
                <X className="w-3 h-3" />
                Rechazar
              </button>
              <button
                onClick={() => updateStatus(order.id, 'accepted')}
                disabled={updatingId === order.id}
                className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Aceptar
              </button>
            </div>
          )}
        />

        {/* Preparando */}
        <KanbanColumn
          title="Preparando"
          icon={<ChefHat className="w-4 h-4" />}
          count={preparing.length}
          color="blue"
          orders={preparing}
          updatingId={updatingId}
          actions={(order) => (
            <div className="mt-3">
              {order.merchant_status === 'accepted' ? (
                <button
                  onClick={() => updateStatus(order.id, 'preparing')}
                  disabled={updatingId === order.id}
                  className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChefHat className="w-3 h-3" />}
                  Empezar a preparar
                </button>
              ) : (
                <button
                  onClick={() => updateStatus(order.id, 'ready')}
                  disabled={updatingId === order.id}
                  className="w-full py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                  Marcar como listo
                </button>
              )}
            </div>
          )}
        />

        {/* Listos */}
        <KanbanColumn
          title="Listos"
          icon={<CheckCircle className="w-4 h-4" />}
          count={ready.length}
          color="emerald"
          orders={ready}
          updatingId={updatingId}
          actions={() => (
            <div className="mt-3">
              <p className="text-xs text-emerald-600 text-center font-medium">Esperando rider</p>
            </div>
          )}
        />
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  title: string
  icon: React.ReactNode
  count: number
  color: 'amber' | 'blue' | 'emerald'
  orders: MerchantOrder[]
  updatingId: string | null
  actions: (order: MerchantOrder) => React.ReactNode
}

const COLOR_MAP = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-500' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-500' },
}

function KanbanColumn({ title, icon, count, color, orders, updatingId, actions }: KanbanColumnProps) {
  const c = COLOR_MAP[color]

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-t-xl', c.bg, c.border, 'border-b')}>
        <span className={c.text}>{icon}</span>
        <span className={cn('font-semibold text-sm', c.text)}>{title}</span>
        <span className={cn('ml-auto text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center', c.badge)}>
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-white/50 rounded-b-xl">
        {orders.length === 0 ? (
          <p className="text-zinc-400 text-xs text-center py-8">Sin pedidos</p>
        ) : (
          orders.map(order => (
            <OrderCard key={order.id} order={order} updatingId={updatingId}>
              {actions(order)}
            </OrderCard>
          ))
        )}
      </div>
    </div>
  )
}

function OrderCard({ order, updatingId, children }: { order: MerchantOrder; updatingId: string | null; children: React.ReactNode }) {
  const items = (order.order_items ?? []) as any[]
  const elapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
  const customerName = (order.customers as any)?.profiles?.full_name
  const customerPhone = (order.customers as any)?.profiles?.phone

  return (
    <div className={cn(
      'bg-white rounded-xl border border-zinc-200 p-3 shadow-sm transition-shadow',
      updatingId === order.id && 'opacity-60'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-zinc-500">{order.order_number}</span>
        <span className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-full',
          elapsed > 15 ? 'bg-red-100 text-red-600' : elapsed > 5 ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-500'
        )}>
          {elapsed} min
        </span>
      </div>

      {/* Items */}
      <div className="space-y-0.5 mb-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-zinc-700">
              <span className="font-semibold">{item.quantity}x</span> {item.name}
            </span>
            {item.modifiers?.length > 0 && (
              <span className="text-zinc-400 text-[10px] truncate ml-2 max-w-[40%]">
                {item.modifiers.map((m: any) => m.name).join(', ')}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Customer notes */}
      {order.customer_notes && (
        <p className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded mb-2 border border-amber-200">
          {order.customer_notes}
        </p>
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <div className="flex items-center gap-2">
          {customerName && <span>{customerName}</span>}
          <span className="flex items-center gap-0.5">
            <Banknote className="w-3 h-3" />
            {order.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
          </span>
        </div>
        <span className="font-semibold text-zinc-700 text-xs">Bs. {Number(order.total_fee).toFixed(2)}</span>
      </div>

      {/* Print receipt */}
      <PrintReceiptButton
        size="sm"
        order={{
          merchantName: '',
          orderNumber: order.order_number,
          createdAt: order.created_at,
          items: items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            modifiers: item.modifiers?.map((m: any) => m.name),
          })),
          subtotal: Number(order.subtotal),
          serviceFee: Number(order.service_fee),
          deliveryFee: Number(order.delivery_fee),
          tipAmount: Number(order.tip_amount),
          total: Number(order.total_fee),
          paymentMethod: order.payment_method,
          deliveryAddress: order.delivery_address,
          customerNotes: order.customer_notes ?? undefined,
          customerName: customerName ?? undefined,
        }}
      />

      {/* Actions */}
      {children}
    </div>
  )
}
