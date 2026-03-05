'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, X } from 'lucide-react'

interface Category { id: string; name: string }
interface Zone { id: string; name: string }

export default function EditMerchantForm({
  merchant,
  categories,
  zones,
}: {
  merchant: any
  categories: Category[]
  zones: Zone[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: merchant.name ?? '',
    phone: merchant.phone ?? '',
    email: merchant.email ?? '',
    description: merchant.description ?? '',
    address: merchant.address ?? '',
    lat: String(merchant.lat ?? ''),
    lng: String(merchant.lng ?? ''),
    commission_pct: String(merchant.commission_pct ?? '15'),
    category_id: (merchant.merchant_categories as any)?.id ?? '',
    zone_id: (merchant.zones as any)?.id ?? '',
    is_active: merchant.is_active,
    avg_prep_time_min: String(merchant.avg_prep_time_min ?? '30'),
    min_order_amount: String(merchant.min_order_amount ?? '0'),
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/merchants/${merchant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        commission_pct: parseFloat(form.commission_pct),
        avg_prep_time_min: parseInt(form.avg_prep_time_min),
        min_order_amount: parseFloat(form.min_order_amount),
        category_id: form.category_id || null,
        zone_id: form.zone_id || null,
      }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) { setError(json.error ?? 'Error al actualizar'); return }

    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors"
      >
        <Pencil className="w-4 h-4" />
        Editar comercio
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-zinc-900 font-semibold">Editar comercio</h2>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <Field label="Nombre *">
                <input required value={form.name} onChange={set('name')} className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Teléfono">
                  <input value={form.phone} onChange={set('phone')} className={inputCls} />
                </Field>
                <Field label="Email">
                  <input type="email" value={form.email} onChange={set('email')} className={inputCls} />
                </Field>
              </div>

              <Field label="Descripción">
                <textarea value={form.description} onChange={set('description')} rows={2} className={inputCls} />
              </Field>

              <Field label="Dirección *">
                <input required value={form.address} onChange={set('address')} className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitud *">
                  <input required type="number" step="any" value={form.lat} onChange={set('lat')} className={inputCls} />
                </Field>
                <Field label="Longitud *">
                  <input required type="number" step="any" value={form.lng} onChange={set('lng')} className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Categoría">
                  <select value={form.category_id} onChange={set('category_id')} className={inputCls}>
                    <option value="">Ninguna</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Zona">
                  <select value={form.zone_id} onChange={set('zone_id')} className={inputCls}>
                    <option value="">Sin zona</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Comisión %">
                  <input type="number" min="0" max="100" step="0.5" value={form.commission_pct} onChange={set('commission_pct')} className={inputCls} />
                </Field>
                <Field label="Prep. (min)">
                  <input type="number" min="0" value={form.avg_prep_time_min} onChange={set('avg_prep_time_min')} className={inputCls} />
                </Field>
                <Field label="Min. pedido">
                  <input type="number" min="0" step="0.5" value={form.min_order_amount} onChange={set('min_order_amount')} className={inputCls} />
                </Field>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-zinc-300"
                />
                <label className="text-sm text-zinc-700">Comercio activo</label>
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600 block mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 bg-white'
