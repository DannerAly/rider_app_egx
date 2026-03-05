'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Loader2, Clock, CheckCircle, Truck, Package,
  XCircle, Store, MapPin, Phone, ChefHat, Search, User, Star, X,
  KeyRound, MessageCircle, Timer,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

const ChatFAB = dynamic(() => import('@/components/chat/ChatFAB'), { ssr: false })

interface OrderDetail {
  id: string; order_number: string; tracking_code: string
  status: string; merchant_status: string | null
  order_items: any[] | null; subtotal: number; service_fee: number
  delivery_fee: number; tip_amount: number; total_fee: number
  customer_notes: string | null; payment_method: string; payment_status: string
  pickup_address: string; delivery_address: string
  rider_id: string | null
  pickup_pin: string | null; pin_verified_at: string | null
  eta_minutes: number | null; estimated_delivery_at: string | null
  created_at: string; assigned_at: string | null; picked_up_at: string | null; delivered_at: string | null
  estimated_prep_time_min: number | null
  merchants?: { name: string; phone: string | null } | null
  riders?: { profiles: { full_name: string | null; phone: string | null } } | null
}

interface StatusHistoryEntry {
  id: number; status: string; notes: string | null; created_at: string
}

// Pasos del timeline completo
const TIMELINE_STEPS = [
  { key: 'created', label: 'Pedido creado', icon: Package, color: 'blue' },
  { key: 'merchant_accepted', label: 'Comercio aceptó', icon: Store, color: 'purple' },
  { key: 'merchant_preparing', label: 'En preparación', icon: ChefHat, color: 'orange' },
  { key: 'merchant_ready', label: 'Pedido listo', icon: CheckCircle, color: 'emerald' },
  { key: 'assigned', label: 'Rider asignado', icon: Search, color: 'blue' },
  { key: 'heading_to_pickup', label: 'Rider en camino al comercio', icon: Truck, color: 'purple' },
  { key: 'picked_up', label: 'Rider recogió el pedido', icon: Package, color: 'indigo' },
  { key: 'in_transit', label: 'En camino a tu dirección', icon: Truck, color: 'cyan' },
  { key: 'delivered', label: 'Entregado', icon: CheckCircle, color: 'emerald' },
]

function getCompletedSteps(order: OrderDetail): Set<string> {
  const steps = new Set<string>()
  steps.add('created')

  const ms = order.merchant_status
  if (ms === 'accepted' || ms === 'preparing' || ms === 'ready') steps.add('merchant_accepted')
  if (ms === 'preparing' || ms === 'ready') steps.add('merchant_preparing')
  if (ms === 'ready') steps.add('merchant_ready')

  const s = order.status
  if (['assigned', 'heading_to_pickup', 'picked_up', 'in_transit', 'delivered'].includes(s)) steps.add('assigned')
  if (['heading_to_pickup', 'picked_up', 'in_transit', 'delivered'].includes(s)) steps.add('heading_to_pickup')
  if (['picked_up', 'in_transit', 'delivered'].includes(s)) steps.add('picked_up')
  if (['in_transit', 'delivered'].includes(s)) steps.add('in_transit')
  if (s === 'delivered') steps.add('delivered')

  return steps
}

function getCurrentStep(order: OrderDetail): string {
  if (order.status === 'cancelled' || order.status === 'failed') return 'cancelled'
  if (order.status === 'delivered') return 'delivered'
  if (order.status === 'in_transit') return 'in_transit'
  if (order.status === 'picked_up') return 'picked_up'
  if (order.status === 'heading_to_pickup') return 'heading_to_pickup'
  if (order.status === 'assigned') return 'assigned'
  if (order.merchant_status === 'ready') return 'merchant_ready'
  if (order.merchant_status === 'preparing') return 'merchant_preparing'
  if (order.merchant_status === 'accepted') return 'merchant_accepted'
  return 'created'
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const supabase = createClient()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [history, setHistory] = useState<StatusHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showReview, setShowReview] = useState(false)
  const [hasReview, setHasReview] = useState(false)

  useEffect(() => {
    fetchOrder()

    // Realtime
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, () => fetchOrder())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id) })
  }, [])

  const fetchOrder = async () => {
    const [{ data: orderData }, { data: historyData }] = await Promise.all([
      supabase
        .from('orders')
        .select('*, merchants:merchant_id(name, phone), riders:rider_id(profiles(full_name, phone))')
        .eq('id', orderId)
        .single(),
      supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
    ])
    setOrder(orderData as OrderDetail | null)
    setHistory((historyData as StatusHistoryEntry[]) ?? [])

    // Check if review exists
    if (orderData) {
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', orderId)
        .single()
      setHasReview(!!reviewData)
    }
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
  if (!order) return <div className="flex flex-col items-center justify-center min-h-screen p-6"><p className="text-zinc-500">Pedido no encontrado</p></div>

  const completedSteps = getCompletedSteps(order)
  const currentStep = getCurrentStep(order)
  const isCancelled = order.status === 'cancelled' || order.status === 'failed'
  const merchantName = (order.merchants as any)?.name
  const riderName = (order.riders as any)?.profiles?.full_name
  const riderPhone = (order.riders as any)?.profiles?.phone

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/customer/orders')} className="text-zinc-500"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1">
            <h1 className="text-zinc-900 font-bold text-sm">{order.order_number}</h1>
            {merchantName && <p className="text-zinc-400 text-xs">{merchantName}</p>}
          </div>
          <Link href={`/track/${order.tracking_code}`} className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-full">
            Ver mapa
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-5">
        {/* Timeline */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Estado del pedido</h2>

          {isCancelled ? (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <XCircle className="w-6 h-6 text-red-500" />
              <div>
                <p className="text-red-700 font-semibold text-sm">Pedido cancelado</p>
                <p className="text-red-500 text-xs mt-0.5">
                  {order.merchant_status === 'rejected' ? 'El comercio rechazó el pedido' : 'El pedido fue cancelado'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, i) => {
                const isCompleted = completedSteps.has(step.key)
                const isCurrent = currentStep === step.key
                const Icon = step.icon

                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                        isCompleted ? 'bg-emerald-500 text-white' :
                        isCurrent ? 'bg-blue-500 text-white animate-pulse' :
                        'bg-zinc-200 text-zinc-400'
                      )}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div className={cn('w-0.5 h-6 my-0.5', isCompleted ? 'bg-emerald-300' : 'bg-zinc-200')} />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={cn('text-sm font-medium', isCompleted || isCurrent ? 'text-zinc-900' : 'text-zinc-400')}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PIN de verificación - solo visible cuando hay rider asignado y no entregado */}
        {order.pickup_pin && order.status !== 'delivered' && !isCancelled && order.rider_id && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">PIN de verificación</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {order.pickup_pin.split('').map((digit, i) => (
                <div key={i} className="w-12 h-14 rounded-lg bg-white border-2 border-amber-300 flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-amber-800">{digit}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-600 text-center mt-2">
              {order.pin_verified_at ? 'PIN verificado' : 'Comparte este PIN con el rider al recibir tu pedido'}
            </p>
          </div>
        )}

        {/* ETA estimado */}
        {order.eta_minutes && !isCancelled && order.status !== 'delivered' && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Timer className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Llegada estimada: ~{order.eta_minutes} min
              </p>
              {order.estimated_delivery_at && (
                <p className="text-xs text-blue-500">
                  {new Date(order.estimated_delivery_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Rider info */}
        {riderName && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-900">{riderName}</p>
              <p className="text-xs text-zinc-400">Tu rider</p>
            </div>
            <div className="flex items-center gap-2">
              {riderPhone && (
                <a href={`tel:${riderPhone}`} className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-emerald-600" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        {order.order_items && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Detalle del pedido</h3>
            {(order.order_items as any[]).map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-zinc-700">{item.quantity}x {item.name}</span>
                <span className="text-zinc-500">Bs. {((item.price + (item.modifiers?.reduce((s: number, m: any) => s + m.price_addition, 0) ?? 0)) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-zinc-100 mt-2 pt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Subtotal</span><span>Bs. {Number(order.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Servicio</span><span>Bs. {Number(order.service_fee).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Envío</span><span>Bs. {Number(order.delivery_fee).toFixed(2)}</span></div>
              {Number(order.tip_amount) > 0 && <div className="flex justify-between"><span className="text-zinc-400">Propina</span><span>Bs. {Number(order.tip_amount).toFixed(2)}</span></div>}
              <div className="flex justify-between font-semibold text-zinc-900 border-t border-zinc-100 pt-1">
                <span>Total</span><span>Bs. {Number(order.total_fee).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Dirección */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-zinc-400">Entregar en</p>
              <p className="text-zinc-900">{order.delivery_address}</p>
            </div>
          </div>
        </div>

        {/* Calificar */}
        {order.status === 'delivered' && !hasReview && (
          <button
            onClick={() => setShowReview(true)}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Star className="w-4 h-4" />
            Calificar pedido
          </button>
        )}
        {hasReview && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm text-center flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Ya calificaste este pedido
          </div>
        )}
      </div>

      {/* Chat FAB — solo visible si hay rider y pedido no finalizado */}
      {order.rider_id && userId && !isCancelled && order.status !== 'delivered' && (
        <ChatFAB
          orderId={order.id}
          currentUserId={userId}
          currentUserRole="customer"
        />
      )}

      {/* Review Modal */}
      {showReview && order && (
        <ReviewModal
          orderId={order.id}
          merchantName={merchantName}
          riderName={riderName}
          onClose={() => setShowReview(false)}
          onSubmitted={() => { setShowReview(false); setHasReview(true) }}
        />
      )}
    </div>
  )
}

function ReviewModal({
  orderId, merchantName, riderName, onClose, onSubmitted,
}: {
  orderId: string; merchantName?: string; riderName?: string
  onClose: () => void; onSubmitted: () => void
}) {
  const [merchantRating, setMerchantRating] = useState(0)
  const [riderRating, setRiderRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!merchantRating && !riderRating) return
    setSubmitting(true)

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        merchant_rating: merchantRating || null,
        rider_rating: riderRating || null,
        comment: comment || null,
      }),
    })

    if (res.ok) onSubmitted()
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 pb-8 animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-zinc-900 text-lg">Califica tu experiencia</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-zinc-400" /></button>
        </div>

        {/* Merchant rating */}
        {merchantName && (
          <div className="mb-5">
            <p className="text-sm font-medium text-zinc-700 mb-2">
              <Store className="w-4 h-4 inline mr-1 text-orange-500" />
              {merchantName}
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setMerchantRating(n)}>
                  <Star className={`w-8 h-8 ${n <= merchantRating ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rider rating */}
        {riderName && (
          <div className="mb-5">
            <p className="text-sm font-medium text-zinc-700 mb-2">
              <User className="w-4 h-4 inline mr-1 text-blue-500" />
              {riderName}
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRiderRating(n)}>
                  <Star className={`w-8 h-8 ${n <= riderRating ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        <div className="mb-5">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Comentario (opcional)"
            rows={3}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || (!merchantRating && !riderRating)}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-300 text-white font-semibold text-sm flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
          {submitting ? 'Enviando...' : 'Enviar calificación'}
        </button>
      </div>
    </div>
  )
}
