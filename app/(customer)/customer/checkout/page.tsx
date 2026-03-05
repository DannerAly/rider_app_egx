'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Plus, Loader2, CheckCircle, Banknote, CreditCard, QrCode, Ticket, X } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import dynamic from 'next/dynamic'

const StripePaymentForm = dynamic(() => import('@/components/customer/StripePaymentForm'), { ssr: false })

type PaymentMethod = 'cash' | 'card' | 'qr'

interface Address {
  id: string; label: string; address: string; lat: number; lng: number; instructions: string | null; is_default: boolean
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string; desc: string; icon: React.ElementType }[] = [
  { key: 'cash', label: 'Efectivo', desc: 'Paga al recibir tu pedido', icon: Banknote },
  { key: 'card', label: 'Tarjeta', desc: 'Visa, Mastercard, Apple/Google Pay', icon: CreditCard },
  { key: 'qr', label: 'QR Bolivia', desc: 'Paga con código QR bancario', icon: QrCode },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, subtotal, clearCart } = useCart()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [tipAmount, setTipAmount] = useState(0)
  const [customerNotes, setCustomerNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [loading, setLoading] = useState(false)
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stripe
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [creatingIntent, setCreatingIntent] = useState(false)

  // QR
  const [showQr, setShowQr] = useState(false)

  // Cupón
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponId, setCouponId] = useState<string | null>(null)
  const [couponDesc, setCouponDesc] = useState<string | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  // Form para nueva dirección
  const [showNewAddr, setShowNewAddr] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: 'Casa', address: '', lat: '', lng: '', instructions: '' })
  const [savingAddr, setSavingAddr] = useState(false)

  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => { fetchAddresses() }, [])

  const fetchAddresses = async () => {
    const res = await fetch('/api/customer/addresses')
    const json = await res.json()
    const addrs: Address[] = json.data ?? []
    setAddresses(addrs)
    const def = addrs.find(a => a.is_default) ?? addrs[0]
    if (def) setSelectedAddress(def)
    setLoadingAddresses(false)
  }

  const saveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAddr(true)
    const res = await fetch('/api/customer/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newAddr,
        lat: parseFloat(newAddr.lat),
        lng: parseFloat(newAddr.lng),
        is_default: addresses.length === 0,
      }),
    })
    const json = await res.json()
    setSavingAddr(false)
    if (res.ok) {
      setShowNewAddr(false)
      setNewAddr({ label: 'Casa', address: '', lat: '', lng: '', instructions: '' })
      await fetchAddresses()
      if (json.data) setSelectedAddress(json.data)
    }
  }

  // Tarifas estimadas
  const serviceFee = parseFloat((subtotal * 0.05).toFixed(2))
  const deliveryFee = 15
  const total = Math.max(0, subtotal + serviceFee + deliveryFee + tipAmount - couponDiscount)

  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    setValidatingCoupon(true)
    setCouponError(null)

    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: couponCode,
        subtotal,
        merchant_id: cart?.merchant_id,
      }),
    })
    const json = await res.json()
    setValidatingCoupon(false)

    if (json.valid) {
      setCouponDiscount(json.discount)
      setCouponId(json.coupon_id)
      setCouponDesc(json.description)
    } else {
      setCouponError(json.error ?? 'Cupón inválido')
      setCouponDiscount(0)
      setCouponId(null)
    }
  }

  const removeCoupon = () => {
    setCouponCode('')
    setCouponDiscount(0)
    setCouponId(null)
    setCouponDesc(null)
    setCouponError(null)
  }

  // Crear orden y procesar según método de pago
  const handleCheckout = async () => {
    if (!cart || !selectedAddress) return
    setLoading(true)
    setError(null)

    // 1. Crear la orden
    const res = await fetch('/api/customer/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: cart.merchant_id,
        items: cart.items,
        delivery_address: selectedAddress.address,
        delivery_lat: selectedAddress.lat,
        delivery_lng: selectedAddress.lng,
        payment_method: paymentMethod,
        tip_amount: tipAmount,
        customer_notes: customerNotes || null,
        coupon_id: couponId,
        discount_amount: couponDiscount,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Error al crear el pedido')
      setLoading(false)
      return
    }

    const createdOrderId = json.data.id
    setOrderId(createdOrderId)

    // 2. Según método de pago
    if (paymentMethod === 'cash') {
      // Efectivo: orden creada, el rider cobra al entregar
      setSuccess(true)
      clearCart()
      setTimeout(() => router.push('/customer/orders'), 2000)
    } else if (paymentMethod === 'card') {
      // Tarjeta: crear PaymentIntent
      setCreatingIntent(true)
      const intentRes = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: createdOrderId }),
      })
      const intentJson = await intentRes.json()
      setCreatingIntent(false)

      if (!intentRes.ok) {
        setError(intentJson.error ?? 'Error al preparar el pago')
        setLoading(false)
        return
      }

      setClientSecret(intentJson.client_secret)
      setIsDemo(!!intentJson.demo)
      setLoading(false)
    } else if (paymentMethod === 'qr') {
      // QR Bolivia demo: mostrar pantalla QR simulada
      setShowQr(true)
      setLoading(false)
    }
  }

  const handleStripeSuccess = () => {
    setSuccess(true)
    clearCart()
    setTimeout(() => router.push('/customer/orders'), 2000)
  }

  const handleQrConfirm = async () => {
    if (!orderId) return
    setLoading(true)
    // Marcar como pagado (simulación - en producción la pasarela QR confirma via webhook)
    const res = await fetch('/api/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, payment_method: 'qr' }),
    })

    if (res.ok) {
      setSuccess(true)
      clearCart()
      setTimeout(() => router.push('/customer/orders'), 2000)
    } else {
      setError('Error al confirmar el pago QR')
    }
    setLoading(false)
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
        <p className="text-zinc-500 mb-4">Tu carrito está vacío</p>
        <button onClick={() => router.push('/customer')} className="text-blue-600 font-medium text-sm">Explorar comercios</button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-zinc-900 font-bold text-xl">Pedido creado</h2>
        <p className="text-zinc-500 text-sm mt-1">
          {paymentMethod === 'cash' ? 'Tu pedido fue enviado al comercio' :
           paymentMethod === 'card' ? 'Pago procesado exitosamente' :
           'Pago QR confirmado'}
        </p>
      </div>
    )
  }

  // Si tenemos clientSecret, mostrar form de Stripe
  if (clientSecret) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="bg-white border-b border-zinc-100 sticky top-0 z-30">
          <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
            <button onClick={() => setClientSecret(null)} className="text-zinc-500 hover:text-zinc-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-zinc-900 font-bold text-lg">Pagar con tarjeta</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-5 py-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-4">
            <p className="text-sm text-zinc-500 mb-1">Total a pagar</p>
            <p className="text-2xl font-bold text-zinc-900">Bs. {total.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <StripePaymentForm
              clientSecret={clientSecret}
              orderId={orderId!}
              onSuccess={handleStripeSuccess}
              onError={(msg) => setError(msg)}
              demo={isDemo}
            />
          </div>
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>
          )}
        </div>
      </div>
    )
  }

  // Si tenemos QR, mostrar pantalla QR simulada
  if (showQr) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="bg-white border-b border-zinc-100 sticky top-0 z-30">
          <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
            <button onClick={() => setShowQr(false)} className="text-zinc-500 hover:text-zinc-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-zinc-900 font-bold text-lg">Pago QR</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-5 py-6 text-center">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 mb-4">
              Modo demo — En producción, aquí aparecería el QR de tu banco
            </div>
            <p className="text-sm text-zinc-500 mb-1">Escanea este código con tu app bancaria</p>
            <p className="text-2xl font-bold text-zinc-900 mb-4">Bs. {total.toFixed(2)}</p>
            {/* QR placeholder visual */}
            <div className="mx-auto w-[200px] h-[200px] bg-zinc-900 rounded-xl p-4 flex items-center justify-center">
              <div className="grid grid-cols-5 gap-1 w-full h-full">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className={`rounded-sm ${[0,1,2,4,5,6,10,12,14,18,19,20,22,23,24].includes(i) ? 'bg-white' : 'bg-zinc-700'}`} />
                ))}
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-3">
              Tigo Money · BancoSol · BNB · Banco Unión
            </p>
          </div>
          <button
            onClick={handleQrConfirm}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-300 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {loading ? 'Confirmando...' : 'Ya realicé el pago'}
          </button>
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-zinc-900 font-bold text-lg">Checkout</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-4 pb-32">
        {/* Merchant */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-400">Pedido de</p>
          <p className="text-zinc-900 font-semibold">{cart.merchant_name}</p>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Tu pedido</p>
          {cart.items.map((item, i) => {
            const modTotal = item.modifiers.reduce((s, m) => s + m.price_addition, 0)
            return (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <span className="text-zinc-900">{item.quantity}x {item.name}</span>
                  {item.modifiers.length > 0 && (
                    <p className="text-zinc-400 text-xs">{item.modifiers.map(m => m.name).join(', ')}</p>
                  )}
                </div>
                <span className="text-zinc-700 font-medium ml-2">Bs. {((item.price + modTotal) * item.quantity).toFixed(2)}</span>
              </div>
            )
          })}
        </div>

        {/* Dirección de entrega */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Dirección de entrega</p>

          {loadingAddresses ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
          ) : (
            <>
              {addresses.map(addr => (
                <button
                  key={addr.id}
                  onClick={() => setSelectedAddress(addr)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border mb-2 text-sm transition-colors ${
                    selectedAddress?.id === addr.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-zinc-900">{addr.label}</p>
                      <p className="text-zinc-500 text-xs">{addr.address}</p>
                    </div>
                  </div>
                </button>
              ))}

              {!showNewAddr ? (
                <button onClick={() => setShowNewAddr(true)} className="flex items-center gap-2 text-blue-600 text-sm font-medium mt-1">
                  <Plus className="w-4 h-4" />
                  Agregar dirección
                </button>
              ) : (
                <form onSubmit={saveNewAddress} className="space-y-2 mt-2 bg-zinc-50 rounded-lg p-3">
                  <input value={newAddr.label} onChange={e => setNewAddr(n => ({ ...n, label: e.target.value }))} placeholder="Etiqueta (Casa, Trabajo)" className={inputCls} />
                  <input required value={newAddr.address} onChange={e => setNewAddr(n => ({ ...n, address: e.target.value }))} placeholder="Dirección completa" className={inputCls} />
                  <div className="grid grid-cols-2 gap-2">
                    <input required type="number" step="any" value={newAddr.lat} onChange={e => setNewAddr(n => ({ ...n, lat: e.target.value }))} placeholder="Latitud" className={inputCls} />
                    <input required type="number" step="any" value={newAddr.lng} onChange={e => setNewAddr(n => ({ ...n, lng: e.target.value }))} placeholder="Longitud" className={inputCls} />
                  </div>
                  <input value={newAddr.instructions} onChange={e => setNewAddr(n => ({ ...n, instructions: e.target.value }))} placeholder="Instrucciones (opcional)" className={inputCls} />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowNewAddr(false)} className="flex-1 py-2 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-medium">Cancelar</button>
                    <button type="submit" disabled={savingAddr} className="flex-1 py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium disabled:opacity-50">
                      {savingAddr ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Notas */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Notas</p>
          <input
            value={customerNotes}
            onChange={e => setCustomerNotes(e.target.value)}
            placeholder="Instrucciones especiales..."
            className={inputCls}
          />
        </div>

        {/* Propina */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Propina para el rider</p>
          <div className="flex gap-2">
            {[0, 5, 10, 15].map(amount => (
              <button
                key={amount}
                onClick={() => setTipAmount(amount)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  tipAmount === amount
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {amount === 0 ? 'Sin' : `Bs. ${amount}`}
              </button>
            ))}
          </div>
        </div>

        {/* Cupón de descuento */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Cupón de descuento</p>
          {couponId ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700">{couponCode.toUpperCase()}</p>
                  {couponDesc && <p className="text-xs text-emerald-600">{couponDesc}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-700">-Bs. {couponDiscount.toFixed(2)}</span>
                <button onClick={removeCoupon}><X className="w-4 h-4 text-emerald-500" /></button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null) }}
                placeholder="Código de cupón"
                className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 bg-white font-mono"
              />
              <button
                onClick={validateCoupon}
                disabled={validatingCoupon || !couponCode.trim()}
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed"
              >
                {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
              </button>
            </div>
          )}
          {couponError && <p className="text-red-500 text-xs mt-2">{couponError}</p>}
        </div>

        {/* Método de pago */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Método de pago</p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map(method => {
              const Icon = method.icon
              return (
                <button
                  key={method.key}
                  onClick={() => setPaymentMethod(method.key)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg border text-left transition-colors ${
                    paymentMethod === method.key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    paymentMethod === method.key ? 'bg-blue-100' : 'bg-zinc-100'
                  }`}>
                    <Icon className={`w-4 h-4 ${paymentMethod === method.key ? 'text-blue-600' : 'text-zinc-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${paymentMethod === method.key ? 'text-blue-700' : 'text-zinc-900'}`}>
                      {method.label}
                    </p>
                    <p className="text-xs text-zinc-400">{method.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === method.key ? 'border-blue-600' : 'border-zinc-300'
                  }`}>
                    {paymentMethod === method.key && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Desglose */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Resumen</p>
          <Row label="Subtotal" value={`Bs. ${subtotal.toFixed(2)}`} />
          <Row label="Tarifa de servicio" value={`Bs. ${serviceFee.toFixed(2)}`} />
          <Row label="Envío (estimado)" value={`Bs. ${deliveryFee.toFixed(2)}`} />
          {tipAmount > 0 && <Row label="Propina" value={`Bs. ${tipAmount.toFixed(2)}`} />}
          {couponDiscount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-600">Descuento cupón</span>
              <span className="text-emerald-600 font-medium">-Bs. {couponDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-zinc-100 pt-2 mt-2">
            <Row label="Total estimado" value={`Bs. ${total.toFixed(2)}`} bold />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>
        )}
      </div>

      {/* Botón de pago fijo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-4 z-30">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleCheckout}
            disabled={loading || creatingIntent || !selectedAddress}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-300 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {(loading || creatingIntent) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : paymentMethod === 'cash' ? (
              <Banknote className="w-4 h-4" />
            ) : paymentMethod === 'card' ? (
              <CreditCard className="w-4 h-4" />
            ) : (
              <QrCode className="w-4 h-4" />
            )}
            {(loading || creatingIntent) ? 'Procesando...' :
              paymentMethod === 'cash' ? `Pagar en efectivo · Bs. ${total.toFixed(2)}` :
              paymentMethod === 'card' ? `Pagar con tarjeta · Bs. ${total.toFixed(2)}` :
              `Pagar con QR · Bs. ${total.toFixed(2)}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={bold ? 'text-zinc-900 font-semibold' : 'text-zinc-500'}>{label}</span>
      <span className={bold ? 'text-zinc-900 font-bold' : 'text-zinc-700 font-medium'}>{value}</span>
    </div>
  )
}

const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 bg-white'
