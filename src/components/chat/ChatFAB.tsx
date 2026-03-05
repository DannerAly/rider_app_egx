'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChatDrawer from './ChatDrawer'

interface ChatFABProps {
  orderId: string
  currentUserId: string
  currentUserRole: 'customer' | 'rider'
}

export default function ChatFAB({
  orderId,
  currentUserId,
  currentUserRole,
}: ChatFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const supabase = createClient()

  // ── Fetch unread count ──────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchUnread() {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .neq('sender_id', currentUserId)
        .is('read_at', null)

      setUnreadCount(count ?? 0)
    }

    fetchUnread()

    // Suscribirse a nuevos mensajes para actualizar el contador
    const channel = supabase
      .channel(`chat-unread-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        const msg = payload.new as { sender_id: string }
        // Solo incrementar si el mensaje es del otro usuario y el drawer esta cerrado
        if (msg.sender_id !== currentUserId) {
          setUnreadCount(prev => prev + 1)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`,
      }, () => {
        // Re-fetch unread count when messages are updated (e.g. marked as read)
        fetchUnread()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId, currentUserId, supabase])

  // Resetear no leidos cuando se abre el drawer
  const handleOpen = () => {
    setIsOpen(true)
    setUnreadCount(0)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all active:scale-95"
        aria-label="Abrir chat"
      >
        <MessageCircle className="w-6 h-6" />

        {/* Badge de no leidos */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Drawer */}
      <ChatDrawer
        orderId={orderId}
        isOpen={isOpen}
        onClose={handleClose}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </>
  )
}
