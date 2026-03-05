'use client'

import { useState, useEffect, useCallback } from 'react'

export interface CartModifier {
  name: string
  price_addition: number
}

export interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  modifiers: CartModifier[]
  image_url?: string | null
}

export interface Cart {
  merchant_id: string
  merchant_name: string
  items: CartItem[]
}

const CART_KEY = 'rider-egx-cart'

function loadCart(): Cart | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveCart(cart: Cart | null) {
  if (typeof window === 'undefined') return
  if (!cart || cart.items.length === 0) {
    localStorage.removeItem(CART_KEY)
  } else {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }
}

export function useCart() {
  const [cart, setCart] = useState<Cart | null>(null)

  useEffect(() => { setCart(loadCart()) }, [])

  const persist = useCallback((next: Cart | null) => {
    setCart(next)
    saveCart(next)
  }, [])

  const addItem = useCallback((
    merchantId: string,
    merchantName: string,
    item: Omit<CartItem, 'quantity'>,
    quantity = 1,
  ) => {
    setCart(prev => {
      // Si es un merchant diferente, reemplazar todo el carrito
      if (prev && prev.merchant_id !== merchantId) {
        const next: Cart = { merchant_id: merchantId, merchant_name: merchantName, items: [{ ...item, quantity }] }
        saveCart(next)
        return next
      }

      const current = prev ?? { merchant_id: merchantId, merchant_name: merchantName, items: [] }

      // Buscar item existente con mismos modificadores
      const modKey = (m: CartModifier[]) => m.map(x => `${x.name}:${x.price_addition}`).sort().join('|')
      const existingIdx = current.items.findIndex(
        i => i.product_id === item.product_id && modKey(i.modifiers) === modKey(item.modifiers)
      )

      let nextItems: CartItem[]
      if (existingIdx >= 0) {
        nextItems = [...current.items]
        nextItems[existingIdx] = { ...nextItems[existingIdx], quantity: nextItems[existingIdx].quantity + quantity }
      } else {
        nextItems = [...current.items, { ...item, quantity }]
      }

      const next: Cart = { ...current, items: nextItems }
      saveCart(next)
      return next
    })
  }, [])

  const updateQuantity = useCallback((index: number, quantity: number) => {
    setCart(prev => {
      if (!prev) return null
      const nextItems = quantity <= 0
        ? prev.items.filter((_, i) => i !== index)
        : prev.items.map((item, i) => i === index ? { ...item, quantity } : item)
      const next = nextItems.length > 0 ? { ...prev, items: nextItems } : null
      saveCart(next)
      return next
    })
  }, [])

  const removeItem = useCallback((index: number) => {
    updateQuantity(index, 0)
  }, [updateQuantity])

  const clearCart = useCallback(() => {
    persist(null)
  }, [persist])

  const itemCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0

  const subtotal = cart?.items.reduce((sum, item) => {
    const modTotal = item.modifiers.reduce((ms, m) => ms + m.price_addition, 0)
    return sum + (item.price + modTotal) * item.quantity
  }, 0) ?? 0

  return {
    cart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    itemCount,
    subtotal,
  }
}
