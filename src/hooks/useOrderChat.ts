'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ChatMessage {
  id: string
  order_id: string
  sender_id: string
  sender_role: 'customer' | 'rider' | 'merchant' | 'admin'
  content: string
  msg_type: 'text' | 'image' | 'location' | 'system'
  metadata: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

interface UseOrderChatReturn {
  messages: ChatMessage[]
  loading: boolean
  sending: boolean
  error: string | null
  unreadCount: number
  sendMessage: (content: string, msgType?: string, metadata?: Record<string, unknown>) => Promise<boolean>
  markAsRead: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

const PAGE_SIZE = 50

export function useOrderChat(orderId: string | null, currentUserId?: string): UseOrderChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Calcular mensajes no leidos del otro participante
  const unreadCount = currentUserId
    ? messages.filter(m => m.sender_id !== currentUserId && !m.read_at).length
    : 0

  const hasMore = messages.length < total

  // ── Fetch inicial de mensajes ───────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/orders/${orderId}/messages?limit=${PAGE_SIZE}&offset=0`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Error al cargar mensajes')
        setMessages([])
        return
      }

      // La API devuelve más recientes primero; revertir para mostrar cronológicamente
      const fetched: ChatMessage[] = json.data ?? []
      setMessages(fetched.reverse())
      setTotal(json.pagination?.total ?? 0)
      setOffset(fetched.length)
    } catch {
      setError('Error de conexion al cargar mensajes')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  // ── Cargar más mensajes (paginación hacia atrás) ────────────────────────────
  const loadMore = useCallback(async () => {
    if (!orderId || !hasMore) return

    try {
      const res = await fetch(`/api/orders/${orderId}/messages?limit=${PAGE_SIZE}&offset=${offset}`)
      const json = await res.json()

      if (res.ok) {
        const older: ChatMessage[] = json.data ?? []
        // Prepend older messages (reversed since API returns newest first)
        setMessages(prev => [...older.reverse(), ...prev])
        setOffset(prev => prev + older.length)
      }
    } catch {
      // silently fail for load more
    }
  }, [orderId, offset, hasMore])

  // ── Enviar mensaje ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (
    content: string,
    msgType: string = 'text',
    metadata?: Record<string, unknown>
  ): Promise<boolean> => {
    if (!orderId || !content.trim()) return false
    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          msg_type: msgType,
          metadata,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Error al enviar mensaje')
        return false
      }

      // Agregar el mensaje al estado local inmediatamente
      // (Realtime tambien lo enviará, pero deduplicamos por id)
      const newMsg = json.data as ChatMessage
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })

      return true
    } catch {
      setError('Error de conexion al enviar mensaje')
      return false
    } finally {
      setSending(false)
    }
  }, [orderId])

  // ── Marcar mensajes como leidos ─────────────────────────────────────────────
  const markAsRead = useCallback(async () => {
    if (!orderId || !currentUserId) return

    // Mensajes del otro usuario que no estan leidos
    const unreadIds = messages
      .filter(m => m.sender_id !== currentUserId && !m.read_at)
      .map(m => m.id)

    if (unreadIds.length === 0) return

    try {
      // Usar supabase client directamente para marcar como leidos
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds)

      // Actualizar estado local
      setMessages(prev =>
        prev.map(m =>
          unreadIds.includes(m.id)
            ? { ...m, read_at: new Date().toISOString() }
            : m
        )
      )
    } catch {
      // Silently fail for mark as read
    }
  }, [orderId, currentUserId, messages, supabase])

  // ── Fetch inicial ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (orderId) {
      fetchMessages()
    } else {
      setMessages([])
      setLoading(false)
    }
  }, [orderId, fetchMessages])

  // ── Suscripción a Realtime ──────────────────────────────────────────────────
  useEffect(() => {
    if (!orderId) return

    const channel = supabase
      .channel(`chat-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage
        // Deduplicar: solo agregar si no existe ya
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        const updated = payload.new as ChatMessage
        setMessages(prev =>
          prev.map(m => m.id === updated.id ? updated : m)
        )
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [orderId, supabase])

  return {
    messages,
    loading,
    sending,
    error,
    unreadCount,
    sendMessage,
    markAsRead,
    loadMore,
    hasMore,
  }
}
