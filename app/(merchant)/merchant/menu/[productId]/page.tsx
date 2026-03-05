'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2, X, Save } from 'lucide-react'
import Link from 'next/link'

interface Modifier {
  id: string; name: string; price_addition: number; is_available: boolean; sort_order: number
}
interface ModifierGroup {
  id: string; name: string; min_selections: number; max_selections: number
  is_required: boolean; sort_order: number; modifiers: Modifier[]
}
interface Product {
  id: string; name: string; description: string | null; price: number
  image_url: string | null; prep_time_min: number; is_available: boolean
  is_featured: boolean; modifier_groups: ModifierGroup[]
  available_from: string | null; available_until: string | null
  available_days: number[] | null
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.productId as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price: '', prep_time_min: '',
    is_available: true, is_featured: false,
    available_from: '', available_until: '', available_days: [0, 1, 2, 3, 4, 5, 6] as number[],
  })

  // Modifier group form
  const [showModForm, setShowModForm] = useState(false)
  const [modGroup, setModGroup] = useState({ name: '', min_selections: '0', max_selections: '1', is_required: false })
  const [modOptions, setModOptions] = useState<{ name: string; price_addition: string }[]>([{ name: '', price_addition: '0' }])
  const [modLoading, setModLoading] = useState(false)

  useEffect(() => { fetchProduct() }, [productId])

  const fetchProduct = async () => {
    const res = await fetch(`/api/merchant/products/${productId}`)
    const json = await res.json()
    if (json.data) {
      setProduct(json.data)
      setForm({
        name: json.data.name,
        description: json.data.description ?? '',
        price: String(json.data.price),
        prep_time_min: String(json.data.prep_time_min),
        is_available: json.data.is_available,
        is_featured: json.data.is_featured,
        available_from: json.data.available_from ?? '',
        available_until: json.data.available_until ?? '',
        available_days: json.data.available_days ?? [0, 1, 2, 3, 4, 5, 6],
      })
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/merchant/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        prep_time_min: parseInt(form.prep_time_min),
        is_available: form.is_available,
        is_featured: form.is_featured,
        available_from: form.available_from || null,
        available_until: form.available_until || null,
        available_days: form.available_days.length === 7 ? null : form.available_days,
      }),
    })
    setSaving(false)
    fetchProduct()
  }

  const addModGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setModLoading(true)
    await fetch(`/api/merchant/products/${productId}/modifiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: modGroup.name,
        min_selections: parseInt(modGroup.min_selections),
        max_selections: parseInt(modGroup.max_selections),
        is_required: modGroup.is_required,
        modifiers: modOptions.filter(m => m.name.trim()).map(m => ({
          name: m.name,
          price_addition: parseFloat(m.price_addition) || 0,
        })),
      }),
    })
    setModGroup({ name: '', min_selections: '0', max_selections: '1', is_required: false })
    setModOptions([{ name: '', price_addition: '0' }])
    setShowModForm(false)
    setModLoading(false)
    fetchProduct()
  }

  const deleteModGroup = async (groupId: string) => {
    if (!confirm('¿Eliminar este grupo de modificadores?')) return
    await fetch(`/api/merchant/products/${productId}/modifiers?groupId=${groupId}`, { method: 'DELETE' })
    fetchProduct()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
  if (!product) return <div className="p-6 text-zinc-500">Producto no encontrado</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/merchant/menu" className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-zinc-900">Editar producto</h1>
      </div>

      {/* Formulario principal */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-zinc-600 block mb-1">Nombre *</label>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 block mb-1">Descripción</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-1">Precio (Bs.) *</label>
            <input required type="number" min="0" step="0.5" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-1">Tiempo prep. (min)</label>
            <input type="number" min="0" value={form.prep_time_min} onChange={e => setForm(f => ({ ...f, prep_time_min: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} className="rounded" />
            Disponible
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="rounded" />
            Destacado
          </label>
        </div>

        {/* Programación horaria */}
        <div className="border-t border-zinc-100 pt-4">
          <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-3">Programación horaria (opcional)</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Disponible desde</label>
              <input type="time" value={form.available_from} onChange={e => setForm(f => ({ ...f, available_from: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Disponible hasta</label>
              <input type="time" value={form.available_until} onChange={e => setForm(f => ({ ...f, available_until: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-2">Días disponibles</label>
            <div className="flex gap-1.5">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setForm(f => ({
                      ...f,
                      available_days: f.available_days.includes(i)
                        ? f.available_days.filter(d => d !== i)
                        : [...f.available_days, i].sort(),
                    }))
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.available_days.includes(i)
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          {(form.available_from || form.available_until) && (
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, available_from: '', available_until: '', available_days: [0, 1, 2, 3, 4, 5, 6] }))}
              className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium"
            >
              Quitar programación (disponible siempre)
            </button>
          )}
        </div>
        <button type="submit" disabled={saving} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {/* Modificadores */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Grupos de modificadores</h2>
          <button onClick={() => setShowModForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Nuevo grupo
          </button>
        </div>

        {product.modifier_groups.length > 0 ? (
          <div className="space-y-3">
            {product.modifier_groups.map(group => (
              <div key={group.id} className="border border-zinc-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{group.name}</p>
                    <p className="text-xs text-zinc-400">
                      {group.is_required ? 'Requerido' : 'Opcional'} · Min: {group.min_selections} · Max: {group.max_selections}
                    </p>
                  </div>
                  <button onClick={() => deleteModGroup(group.id)} className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1 mt-2">
                  {group.modifiers.map(mod => (
                    <div key={mod.id} className="flex items-center justify-between text-sm py-1 px-2 bg-zinc-50 rounded">
                      <span className="text-zinc-700">{mod.name}</span>
                      <span className="text-zinc-500 font-mono text-xs">
                        {mod.price_addition > 0 ? `+Bs. ${Number(mod.price_addition).toFixed(2)}` : 'Incluido'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-400 text-sm">Sin modificadores. Agrega grupos como "Tamaño", "Extras", etc.</p>
        )}
      </div>

      {/* Modal: Nuevo grupo de modificadores */}
      {showModForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-zinc-900 font-semibold">Nuevo grupo de modificadores</h2>
              <button onClick={() => setShowModForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={addModGroup} className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">Nombre del grupo *</label>
                <input required value={modGroup.name} onChange={e => setModGroup(g => ({ ...g, name: e.target.value }))} placeholder='Ej: "Tamaño"' className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">Min</label>
                  <input type="number" min="0" value={modGroup.min_selections} onChange={e => setModGroup(g => ({ ...g, min_selections: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">Max</label>
                  <input type="number" min="1" value={modGroup.max_selections} onChange={e => setModGroup(g => ({ ...g, max_selections: e.target.value }))} className={inputCls} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" checked={modGroup.is_required} onChange={e => setModGroup(g => ({ ...g, is_required: e.target.checked }))} className="rounded" />
                    Requerido
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-2">Opciones</label>
                <div className="space-y-2">
                  {modOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={opt.name}
                        onChange={e => {
                          const next = [...modOptions]
                          next[i].name = e.target.value
                          setModOptions(next)
                        }}
                        placeholder="Nombre"
                        className={inputCls + ' flex-1'}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={opt.price_addition}
                        onChange={e => {
                          const next = [...modOptions]
                          next[i].price_addition = e.target.value
                          setModOptions(next)
                        }}
                        placeholder="+Bs."
                        className={inputCls + ' w-24'}
                      />
                      {modOptions.length > 1 && (
                        <button type="button" onClick={() => setModOptions(modOptions.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setModOptions([...modOptions, { name: '', price_addition: '0' }])} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  + Agregar opción
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModForm(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={modLoading} className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {modLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 bg-white'
