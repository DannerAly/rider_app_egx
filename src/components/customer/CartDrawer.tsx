'use client'

import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import type { Cart } from '@/hooks/useCart'

interface Props {
  cart: Cart
  subtotal: number
  onClose: () => void
  onUpdateQuantity: (index: number, quantity: number) => void
  onRemove: (index: number) => void
  onClear: () => void
  onCheckout: () => void
}

export default function CartDrawer({ cart, subtotal, onClose, onUpdateQuantity, onRemove, onClear, onCheckout }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-white h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-zinc-900 font-semibold">Tu pedido</h2>
            <p className="text-zinc-400 text-xs">{cart.merchant_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClear} className="text-xs text-red-500 hover:text-red-600 font-medium">
              Vaciar
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {cart.items.map((item, index) => {
            const modTotal = item.modifiers.reduce((s, m) => s + m.price_addition, 0)
            const lineTotal = (item.price + modTotal) * item.quantity

            return (
              <div key={index} className="flex items-start gap-3 bg-zinc-50 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{item.name}</p>
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">
                      {item.modifiers.map(m => m.name).join(', ')}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-zinc-900 mt-1">Bs. {lineTotal.toFixed(2)}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                    className="w-7 h-7 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-500 hover:bg-zinc-100"
                  >
                    {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  </button>
                  <span className="text-sm font-bold text-zinc-900 w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                    className="w-7 h-7 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-500 hover:bg-zinc-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-5 py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Subtotal</span>
            <span className="font-semibold text-zinc-900">Bs. {subtotal.toFixed(2)}</span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Ir al checkout
          </button>
        </div>
      </div>
    </div>
  )
}
