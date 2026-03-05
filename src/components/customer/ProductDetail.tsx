'use client'

import { useState } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import type { CartModifier } from '@/hooks/useCart'

interface Modifier {
  id: string; name: string; price_addition: number; is_available: boolean
}
interface ModifierGroup {
  id: string; name: string; min_selections: number; max_selections: number
  is_required: boolean; modifiers: Modifier[]
}
interface Product {
  id: string; name: string; description: string | null; price: number
  image_url: string | null; prep_time_min: number
  modifier_groups?: ModifierGroup[]
}

interface Props {
  product: Product
  onClose: () => void
  onAdd: (item: { product_id: string; name: string; price: number; modifiers: CartModifier[]; image_url?: string | null }, qty: number) => void
}

export default function ProductDetail({ product, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, Set<string>>>({})

  const groups = product.modifier_groups ?? []

  const toggleModifier = (groupId: string, modId: string, maxSel: number) => {
    setSelectedModifiers(prev => {
      const current = new Set(prev[groupId] ?? [])
      if (current.has(modId)) {
        current.delete(modId)
      } else {
        if (current.size >= maxSel) {
          // Reemplazar el primero si max=1
          if (maxSel === 1) current.clear()
          else return prev
        }
        current.add(modId)
      }
      return { ...prev, [groupId]: current }
    })
  }

  // Validar requeridos
  const isValid = groups.every(g => {
    if (!g.is_required) return true
    return (selectedModifiers[g.id]?.size ?? 0) >= g.min_selections
  })

  // Calcular precio total
  const modifiersFlat: CartModifier[] = []
  let modTotal = 0
  for (const group of groups) {
    const sel = selectedModifiers[group.id]
    if (!sel) continue
    for (const mod of group.modifiers) {
      if (sel.has(mod.id)) {
        modifiersFlat.push({ name: mod.name, price_addition: mod.price_addition })
        modTotal += mod.price_addition
      }
    }
  }

  const unitPrice = Number(product.price) + modTotal
  const totalPrice = unitPrice * quantity

  const handleAdd = () => {
    onAdd({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      modifiers: modifiersFlat,
      image_url: product.image_url,
    }, quantity)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-zinc-900 font-semibold text-lg">{product.name}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {product.description && (
            <p className="text-zinc-500 text-sm">{product.description}</p>
          )}

          <p className="text-zinc-900 font-bold text-xl">Bs. {Number(product.price).toFixed(2)}</p>

          {/* Modifier groups */}
          {groups.map(group => (
            <div key={group.id}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-zinc-900">{group.name}</p>
                <span className="text-xs text-zinc-400">
                  {group.is_required ? 'Requerido' : 'Opcional'}
                  {group.max_selections > 1 ? ` · Max ${group.max_selections}` : ''}
                </span>
              </div>
              <div className="space-y-1">
                {group.modifiers.filter(m => m.is_available).map(mod => {
                  const isSelected = selectedModifiers[group.id]?.has(mod.id) ?? false
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleModifier(group.id, mod.id, group.max_selections)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <span>{mod.name}</span>
                      {mod.price_addition > 0 && (
                        <span className="text-xs font-medium">+Bs. {Number(mod.price_addition).toFixed(2)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Quantity */}
          <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-zinc-700">Cantidad</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold text-zinc-900 w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-zinc-100 px-5 py-4">
          <button
            onClick={handleAdd}
            disabled={!isValid}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-300 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            Agregar · Bs. {totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  )
}
