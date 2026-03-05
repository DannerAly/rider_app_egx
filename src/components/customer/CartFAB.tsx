'use client'

import { ShoppingBag } from 'lucide-react'

interface Props {
  itemCount: number
  subtotal: number
  onClick: () => void
}

export default function CartFAB({ itemCount, subtotal, onClick }: Props) {
  if (itemCount === 0) return null

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-95"
    >
      <div className="relative">
        <ShoppingBag className="w-5 h-5" />
        <span className="absolute -top-2 -right-2 bg-white text-blue-600 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {itemCount}
        </span>
      </div>
      <span className="font-semibold text-sm">Bs. {subtotal.toFixed(2)}</span>
    </button>
  )
}
