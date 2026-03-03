'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type RiderStatus = 'offline' | 'available' | 'busy' | 'on_break'

export interface ActiveOrder {
  id:                      string
  order_number:            string
  status:                  string
  pickup_address:          string
  pickup_lat:              number
  pickup_lng:              number
  pickup_contact_name:     string | null
  pickup_contact_phone:    string | null
  pickup_notes:            string | null
  delivery_address:        string
  delivery_lat:            number
  delivery_lng:            number
  delivery_contact_name:   string | null
  delivery_contact_phone:  string | null
  delivery_notes:          string | null
  total_fee:               number
}

export interface AvailableOrder {
  id:               string
  order_number:     string
  pickup_address:   string
  delivery_address: string
  distance_km:      number | null
  total_fee:        number
  priority:         string
  created_at:       string
}

export function useRiderSession(riderId: string) {
  const [riderStatus,      setRiderStatus]      = useState<RiderStatus>('offline')
  const [activeOrder,      setActiveOrder]       = useState<ActiveOrder | null>(null)
  const [availableOrders,  setAvailableOrders]   = useState<AvailableOrder[]>([])
  const [isLoading,        setIsLoading]         = useState(true)
  const [acceptingId,      setAcceptingId]       = useState<string | null>(null)
  const [acceptError,      setAcceptError]       = useState<string | null>(null)

  const supabase = createClient()

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data: rider }, { data: order }, { data: pending }] = await Promise.all([
        supabase.from('riders').select('status').eq('id', riderId).single(),
        supabase.from('orders').select('*')
          .eq('rider_id', riderId)
          .in('status', ['assigned', 'heading_to_pickup', 'picked_up', 'in_transit'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('orders')
          .select('id, order_number, pickup_address, delivery_address, distance_km, total_fee, priority, created_at')
          .eq('status', 'pending')
          .is('rider_id', null)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      if (rider)   setRiderStatus(rider.status as RiderStatus)
      if (order)   setActiveOrder(order as ActiveOrder)
      if (pending) setAvailableOrders(pending as AvailableOrder[])
      setIsLoading(false)
    }
    load()
  }, [riderId])

  // ── Realtime: pedidos asignados al rider ──────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`rider-orders-${riderId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `rider_id=eq.${riderId}`,
      }, (payload) => {
        const order = payload.new as ActiveOrder & { status: string }
        const active = ['assigned', 'heading_to_pickup', 'picked_up', 'in_transit']
        if (active.includes(order.status)) {
          setActiveOrder(order)
          setRiderStatus('busy')
          // Quitar de disponibles si estaba ahí
          setAvailableOrders(prev => prev.filter(o => o.id !== order.id))
        } else {
          setActiveOrder(null)
          if (order.status !== 'cancelled') setRiderStatus('available')
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [riderId])

  // ── Realtime: pedidos disponibles ─────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('available-orders-rider')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'orders',
      }, (payload) => {
        const o = payload.new as AvailableOrder & { status: string; rider_id: string | null }
        if (o.status === 'pending' && !o.rider_id) {
          setAvailableOrders(prev => [o as AvailableOrder, ...prev].slice(0, 20))
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
      }, (payload) => {
        const o = payload.new as { id: string; status: string; rider_id: string | null }
        // Si ya no está pending → quitarlo de la lista
        if (o.status !== 'pending' || o.rider_id) {
          setAvailableOrders(prev => prev.filter(p => p.id !== o.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── GPS: transmitir ubicación mientras está activo ────────────────────────
  useEffect(() => {
    if (riderStatus === 'offline') return
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        await fetch(`/api/riders/${riderId}/location`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat:        pos.coords.latitude,
            lng:        pos.coords.longitude,
            heading:    pos.coords.heading,
            speed_kmh:  pos.coords.speed ? pos.coords.speed * 3.6 : null,
            accuracy_m: pos.coords.accuracy,
            order_id:   activeOrder?.id ?? null,
          }),
        })
      },
      () => null,
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [riderStatus, riderId, activeOrder?.id])

  // ── Acciones ──────────────────────────────────────────────────────────────
  const toggleStatus = useCallback(async () => {
    const next: RiderStatus = riderStatus === 'offline' ? 'available' : 'offline'
    await supabase.from('riders').update({ status: next }).eq('id', riderId)
    setRiderStatus(next)
  }, [riderStatus, riderId])

  const acceptOrder = useCallback(async (orderId: string) => {
    setAcceptingId(orderId)
    setAcceptError(null)
    const res  = await fetch(`/api/orders/${orderId}/accept`, { method: 'POST' })
    const json = await res.json()
    setAcceptingId(null)
    if (!res.ok) {
      setAcceptError(json.error ?? 'No se pudo aceptar el pedido')
      return false
    }
    setActiveOrder(json.data as ActiveOrder)
    setAvailableOrders(prev => prev.filter(o => o.id !== orderId))
    setRiderStatus('busy')
    return true
  }, [])

  const updateOrderStatus = useCallback(async (newStatus: string, deliveryPhotoUrl?: string) => {
    if (!activeOrder) return
    await fetch(`/api/orders/${activeOrder.id}/status`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        ...(deliveryPhotoUrl ? { delivery_photo_url: deliveryPhotoUrl } : {}),
      }),
    })
    if (['delivered', 'cancelled', 'failed'].includes(newStatus)) {
      setActiveOrder(null)
      setRiderStatus('available')
    } else {
      setActiveOrder(prev => prev ? { ...prev, status: newStatus } : null)
    }
  }, [activeOrder])

  return {
    riderStatus, activeOrder, availableOrders,
    isLoading, acceptingId, acceptError,
    toggleStatus, acceptOrder, updateOrderStatus,
  }
}
