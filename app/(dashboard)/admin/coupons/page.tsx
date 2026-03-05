'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Ticket, Plus, Loader2, Percent, DollarSign,
  Calendar, Hash, Store, ToggleLeft, ToggleRight, X,
} from 'lucide-react'

interface Coupon {
  id: string; code: string; description: string | null
  discount_type: 'percentage' | 'fixed'; discount_value: number
  min_order_amount: number; max_discount: number | null
  max_uses: number | null; max_uses_per_user: number
  current_uses: number; is_active: boolean
  starts_at: string; expires_at: string | null
  merchant_id: string | null
  merchants?: { name: string } | null
  created_at: string
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { fetchCoupons() }, [])

  const fetchCoupons = async () => {
    const res = await fetch('/api/coupons')
    const json = await res.json()
    setCoupons(json.data ?? [])
    setLoading(false)
  }

  const toggleActive = async (coupon: Coupon) => {
    const supabase = createClient()
    await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id)
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cupones</h1>
          <p className="text-sm text-zinc-500">Gestiona descuentos y promociones</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-800"
        >
          <Plus className="w-4 h-4" />
          Nuevo cupón
        </button>
      </div>

      {showCreate && <CreateCouponForm onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchCoupons() }} />}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16">
          <Ticket className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500">No hay cupones creados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(coupon => (
            <div key={coupon.id} className={`bg-white rounded-xl border p-4 ${coupon.is_active ? 'border-zinc-200' : 'border-zinc-100 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono font-bold text-lg text-zinc-900">{coupon.code}</p>
                  {coupon.description && <p className="text-xs text-zinc-500 mt-0.5">{coupon.description}</p>}
                </div>
                <button onClick={() => toggleActive(coupon)}>
                  {coupon.is_active
                    ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                    : <ToggleLeft className="w-6 h-6 text-zinc-300" />
                  }
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  coupon.discount_type === 'percentage'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {coupon.discount_type === 'percentage'
                    ? <><Percent className="w-3 h-3" />{coupon.discount_value}%</>
                    : <><DollarSign className="w-3 h-3" />Bs. {coupon.discount_value}</>
                  }
                </span>
                {coupon.merchants && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs">
                    <Store className="w-3 h-3" />{(coupon.merchants as any).name}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3" />
                  Usado {coupon.current_uses}{coupon.max_uses ? `/${coupon.max_uses}` : ''} veces
                </div>
                {coupon.min_order_amount > 0 && (
                  <p>Min: Bs. {Number(coupon.min_order_amount).toFixed(2)}</p>
                )}
                {coupon.expires_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Expira {new Date(coupon.expires_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateCouponForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    code: '', description: '', discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '', min_order_amount: '', max_discount: '',
    max_uses: '', max_uses_per_user: '1', expires_at: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        max_uses_per_user: parseInt(form.max_uses_per_user) || 1,
        expires_at: form.expires_at || null,
      }),
    })

    if (res.ok) { onCreated() } else {
      const json = await res.json()
      setError(json.error ?? 'Error al crear cupón')
    }
    setSaving(false)
  }

  const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-blue-500'

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-900">Nuevo cupón</h2>
        <button onClick={onClose}><X className="w-4 h-4 text-zinc-400" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Código</label>
            <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="PROMO20" className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Tipo</label>
            <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as any }))} className={inputCls}>
              <option value="percentage">Porcentaje (%)</option>
              <option value="fixed">Monto fijo (Bs)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Descripción</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="20% de descuento en tu primer pedido" className={inputCls} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              {form.discount_type === 'percentage' ? 'Porcentaje' : 'Monto (Bs)'}
            </label>
            <input required type="number" step="0.01" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Mín. pedido</label>
            <input type="number" step="0.01" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} placeholder="0" className={inputCls} />
          </div>
          {form.discount_type === 'percentage' && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Máx. descuento</label>
              <input type="number" step="0.01" value={form.max_discount} onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))} placeholder="Sin tope" className={inputCls} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Usos totales</label>
            <input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Ilimitado" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Por usuario</label>
            <input type="number" value={form.max_uses_per_user} onChange={e => setForm(f => ({ ...f, max_uses_per_user: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Expira</label>
            <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} className={inputCls} />
          </div>
        </div>

        {error && <p className="text-red-600 text-xs">{error}</p>}

        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50">
          {saving ? 'Creando...' : 'Crear cupón'}
        </button>
      </form>
    </div>
  )
}
