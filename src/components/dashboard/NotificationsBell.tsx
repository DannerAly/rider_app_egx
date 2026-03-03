'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck, Package, Bike, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id:         string
  title:      string
  body:       string | null
  type:       string
  is_read:    boolean
  created_at: string
}

function typeIcon(type: string) {
  if (type.startsWith('order'))  return <Package   className="w-3.5 h-3.5 text-blue-500"   />
  if (type.startsWith('rider'))  return <Bike      className="w-3.5 h-3.5 text-green-500"  />
  return                                <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
}

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60)   return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400)return `${Math.floor(s / 3600)}h`
  return new Date(ts).toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

export default function NotificationsBell({ userId }: { userId: string }) {
  const supabase = createClient()
  const [notifs,  setNotifs]  = useState<Notification[]>([])
  const [open,    setOpen]    = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.is_read).length

  // Carga inicial
  useEffect(() => {
    supabase.from('notifications')
      .select('id, title, body, type, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifs(data ?? []))
  }, [userId])

  // Realtime: nuevas notificaciones
  useEffect(() => {
    const channel = supabase
      .channel(`notifs_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifs(prev => [payload.new as Notification, ...prev].slice(0, 20))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId).eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-zinc-200 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <p className="font-semibold text-zinc-800 text-sm">Notificaciones</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <CheckCheck className="w-3.5 h-3.5" /> Marcar leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-50">
            {notifs.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-7 h-7 text-zinc-200 mx-auto mb-2" />
                <p className="text-zinc-400 text-sm">Sin notificaciones</p>
              </div>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors ${n.is_read ? '' : 'bg-blue-50/50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${n.is_read ? 'text-zinc-600' : 'text-zinc-900 font-medium'}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{n.body}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-zinc-400">{timeAgo(n.created_at)}</span>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
