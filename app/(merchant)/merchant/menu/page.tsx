'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Loader2, ChevronDown, ChevronRight, Package,
  Pencil, Trash2, ToggleLeft, ToggleRight, X, FolderPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Modifier {
  id: string; name: string; price_addition: number; is_available: boolean
}
interface ModifierGroup {
  id: string; name: string; is_required: boolean; modifiers: Modifier[]
}
interface Product {
  id: string; name: string; description: string | null; price: number
  image_url: string | null; is_available: boolean; is_featured: boolean
  prep_time_min: number; sort_order: number
}
interface MenuCategory {
  id: string; name: string; description: string | null
  sort_order: number; is_active: boolean; products: Product[]
}

export default function MenuPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Modal states
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showProductForm, setShowProductForm] = useState<string | null>(null) // category_id
  const [formLoading, setFormLoading] = useState(false)

  const [catName, setCatName] = useState('')
  const [prodForm, setProdForm] = useState({ name: '', description: '', price: '', prep_time_min: '15' })

  useEffect(() => { fetchMenu() }, [])

  const fetchMenu = async () => {
    const res = await fetch('/api/merchant/menu')
    const json = await res.json()
    setCategories(json.data ?? [])
    setMerchantId(json.merchantId ?? null)
    setLoading(false)
    // Expand all by default
    if (json.data) setExpanded(new Set(json.data.map((c: MenuCategory) => c.id)))
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    await fetch('/api/merchant/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catName }),
    })
    setCatName('')
    setShowCategoryForm(false)
    setFormLoading(false)
    fetchMenu()
  }

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showProductForm) return
    setFormLoading(true)
    await fetch('/api/merchant/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: prodForm.name,
        description: prodForm.description || null,
        price: parseFloat(prodForm.price),
        prep_time_min: parseInt(prodForm.prep_time_min),
        category_id: showProductForm,
      }),
    })
    setProdForm({ name: '', description: '', price: '', prep_time_min: '15' })
    setShowProductForm(null)
    setFormLoading(false)
    fetchMenu()
  }

  const toggleProduct = async (productId: string, currentAvailable: boolean) => {
    await fetch(`/api/merchant/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !currentAvailable }),
    })
    fetchMenu()
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    await fetch(`/api/merchant/products/${productId}`, { method: 'DELETE' })
    fetchMenu()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mi Menú</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {categories.length} categorías · {categories.reduce((s, c) => s + c.products.length, 0)} productos
          </p>
        </div>
        <button
          onClick={() => setShowCategoryForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          Nueva categoría
        </button>
      </div>

      {/* Categorías con productos */}
      {categories.length > 0 ? (
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              {/* Category header */}
              <div
                className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-zinc-50 transition-colors"
                onClick={() => toggleExpand(cat.id)}
              >
                <div className="flex items-center gap-3">
                  {expanded.has(cat.id) ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                  <div>
                    <p className="font-semibold text-zinc-900 text-sm">{cat.name}</p>
                    <p className="text-zinc-400 text-xs">{cat.products.length} productos</p>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setShowProductForm(cat.id) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Producto
                </button>
              </div>

              {/* Products list */}
              {expanded.has(cat.id) && cat.products.length > 0 && (
                <div className="border-t border-zinc-100">
                  {cat.products.map(prod => (
                    <div key={prod.id} className="flex items-center justify-between px-5 py-3 border-b border-zinc-50 last:border-b-0 hover:bg-zinc-50/50">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          prod.is_available ? 'bg-emerald-500' : 'bg-zinc-300'
                        )} />
                        <div className="min-w-0">
                          <p className="text-zinc-900 text-sm font-medium truncate">{prod.name}</p>
                          {prod.description && (
                            <p className="text-zinc-400 text-xs truncate">{prod.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="text-zinc-900 font-semibold text-sm">Bs. {Number(prod.price).toFixed(2)}</span>
                        <span className="text-zinc-400 text-xs">{prod.prep_time_min}min</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleProduct(prod.id, prod.is_available)} title={prod.is_available ? 'Desactivar' : 'Activar'}>
                            {prod.is_available
                              ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                              : <ToggleLeft className="w-5 h-5 text-zinc-300" />}
                          </button>
                          <Link
                            href={`/merchant/menu/${prod.id}`}
                            className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button onClick={() => deleteProduct(prod.id)} className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center py-20">
          <Package className="w-12 h-12 text-zinc-300 mb-4" />
          <p className="text-zinc-700 font-semibold">Menú vacío</p>
          <p className="text-zinc-400 text-sm mt-1">Crea una categoría para empezar a agregar productos.</p>
        </div>
      )}

      {/* Modal: Nueva categoría */}
      {showCategoryForm && (
        <Modal title="Nueva categoría" onClose={() => setShowCategoryForm(false)}>
          <form onSubmit={createCategory} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Nombre *</label>
              <input required value={catName} onChange={e => setCatName(e.target.value)} placeholder="Hamburguesas" className={inputCls} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCategoryForm(false)} className={btnSecondary}>Cancelar</button>
              <button type="submit" disabled={formLoading} className={btnPrimary}>
                {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Nuevo producto */}
      {showProductForm && (
        <Modal title="Nuevo producto" onClose={() => setShowProductForm(null)}>
          <form onSubmit={createProduct} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Nombre *</label>
              <input required value={prodForm.name} onChange={e => setProdForm(p => ({ ...p, name: e.target.value }))} placeholder="Hamburguesa Clásica" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Descripción</label>
              <input value={prodForm.description} onChange={e => setProdForm(p => ({ ...p, description: e.target.value }))} placeholder="Breve descripción" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">Precio (Bs.) *</label>
                <input required type="number" min="0" step="0.5" value={prodForm.price} onChange={e => setProdForm(p => ({ ...p, price: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">Prep. (min)</label>
                <input type="number" min="0" value={prodForm.prep_time_min} onChange={e => setProdForm(p => ({ ...p, prep_time_min: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowProductForm(null)} className={btnSecondary}>Cancelar</button>
              <button type="submit" disabled={formLoading} className={btnPrimary}>
                {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear producto
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-zinc-900 font-semibold">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 bg-white'
const btnPrimary = 'flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors'
const btnSecondary = 'flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors'
