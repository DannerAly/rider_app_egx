'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MerchantOrder {
  id: string
  order_number: string
  status: string
  merchant_status: string | null
  order_items: any[] | null
  subtotal: number
  service_fee: number
  delivery_fee: number
  tip_amount: number
  total_fee: number
  customer_notes: string | null
  estimated_prep_time_min: number | null
  payment_method: string
  delivery_address: string
  delivery_contact_name: string | null
  created_at: string
  customers?: { profiles: { full_name: string | null; phone: string | null } } | null
  riders?: { profiles: { full_name: string | null; phone: string | null } } | null
}

export function useMerchantOrders(merchantId: string | null) {
  const [orders, setOrders] = useState<MerchantOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevCountRef = useRef(0)
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/merchant/orders?limit=100')
    const json = await res.json()
    const newOrders: MerchantOrder[] = json.data ?? []

    // Sonido si hay nuevos pedidos pending
    const pendingCount = newOrders.filter(o => o.merchant_status === 'pending').length
    if (pendingCount > prevCountRef.current && prevCountRef.current >= 0 && soundEnabled) {
      playSound()
    }
    prevCountRef.current = pendingCount

    setOrders(newOrders)
    setLoading(false)
  }, [soundEnabled])

  const playSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/new-order.mp3')
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
      // Vibración
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
    } catch {}
  }

  // Polling + Realtime
  useEffect(() => {
    fetchOrders()

    // Suscribirse a cambios en orders del merchant
    const channel = supabase
      .channel('merchant-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
      }, () => {
        fetchOrders()
      })
      .subscribe()

    // Polling fallback cada 15s
    const interval = setInterval(fetchOrders, 15000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchOrders])

  const updateStatus = useCallback(async (orderId: string, merchantStatus: string, prepTime?: number) => {
    setUpdatingId(orderId)
    try {
      const body: Record<string, unknown> = { merchant_status: merchantStatus }
      if (prepTime) body.estimated_prep_time_min = prepTime

      const res = await fetch(`/api/merchant/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchOrders()
      }
      return res.ok
    } finally {
      setUpdatingId(null)
    }
  }, [fetchOrders])

  // Categorizar pedidos
  const pending = orders.filter(o => o.merchant_status === 'pending')
  const preparing = orders.filter(o => ['accepted', 'preparing'].includes(o.merchant_status ?? ''))
  const ready = orders.filter(o => o.merchant_status === 'ready')

  return {
    orders,
    pending,
    preparing,
    ready,
    loading,
    updatingId,
    soundEnabled,
    setSoundEnabled,
    updateStatus,
    refresh: fetchOrders,
  }
}
