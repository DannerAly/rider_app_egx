'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, ChevronDown, Loader2 } from 'lucide-react'
import { useOrderChat, type ChatMessage } from '@/hooks/useOrderChat'

interface ChatDrawerProps {
  orderId: string
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  currentUserRole: 'customer' | 'rider'
}

export default function ChatDrawer({
  orderId,
  isOpen,
  onClose,
  currentUserId,
  currentUserRole,
}: ChatDrawerProps) {
  const {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    markAsRead,
    loadMore,
    hasMore,
  } = useOrderChat(orderId, currentUserId)

  const [inputValue, setInputValue] = useState('')
  const [showScrollDown, setShowScrollDown] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const otherRoleLabel = currentUserRole === 'customer' ? 'Rider' : 'Cliente'

  // ── Auto-scroll al ultimo mensaje ───────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'instant',
    })
  }, [])

  // Scroll al abrir o cuando llegan nuevos mensajes
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom(false)
    }
  }, [isOpen, messages.length, scrollToBottom])

  // Marcar como leidos cuando se abre el drawer
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      markAsRead()
    }
  }, [isOpen, messages.length, markAsRead])

  // Focus en input al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Detectar scroll para mostrar boton "ir al final"
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    setShowScrollDown(distFromBottom > 100)
  }, [])

  // ── Enviar mensaje ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputValue.trim() || sending) return
    const content = inputValue.trim()
    setInputValue('')
    const ok = await sendMessage(content)
    if (ok) {
      scrollToBottom()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Formatear timestamp ─────────────────────────────────────────────────────
  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // ── Render mensaje individual ───────────────────────────────────────────────
  const renderMessage = (msg: ChatMessage, index: number) => {
    const isOwn = msg.sender_id === currentUserId
    const isSystem = msg.msg_type === 'system'

    if (isSystem) {
      return (
        <div
          key={msg.id}
          className="flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
        >
          <div className="bg-zinc-800/60 text-zinc-400 text-xs px-3 py-1.5 rounded-full max-w-[80%] text-center">
            {msg.content}
          </div>
        </div>
      )
    }

    return (
      <div
        key={msg.id}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
        style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
      >
        <div className={`max-w-[75%] ${isOwn ? 'order-last' : ''}`}>
          {/* Burbuja */}
          <div
            className={`px-3.5 py-2 rounded-2xl break-words ${
              isOwn
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>

          {/* Timestamp + leido */}
          <div className={`flex items-center gap-1 mt-0.5 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-zinc-500">{formatTime(msg.created_at)}</span>
            {isOwn && msg.read_at && (
              <span className="text-[10px] text-blue-400">Leido</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer (slide from right) */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-zinc-900 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-white font-semibold text-sm">
              Chat con {otherRoleLabel}
            </h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Pedido activo
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Messages area ──────────────────────────────────────────────── */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative"
          onScroll={handleScroll}
        >
          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center pb-2">
              <button
                onClick={loadMore}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Cargar mensajes anteriores
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              <span className="text-zinc-500 text-sm ml-2">Cargando mensajes...</span>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                <Send className="w-5 h-5 text-zinc-500" />
              </div>
              <p className="text-zinc-400 text-sm font-medium">Sin mensajes</p>
              <p className="text-zinc-600 text-xs mt-1">
                Envia el primer mensaje al {otherRoleLabel.toLowerCase()}
              </p>
            </div>
          )}

          {/* Messages list */}
          {messages.map((msg, idx) => renderMessage(msg, idx))}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollDown && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 shadow-lg transition-all"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        {/* ── Input area ──────────────────────────────────────────────────── */}
        <div className="border-t border-zinc-800 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              maxLength={1000}
              className="flex-1 bg-zinc-800 text-white text-sm rounded-xl px-4 py-2.5 placeholder:text-zinc-500 border border-zinc-700 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white transition-colors shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Character count when approaching limit */}
          {inputValue.length > 900 && (
            <p className={`text-[10px] mt-1 text-right ${
              inputValue.length > 980 ? 'text-red-400' : 'text-zinc-500'
            }`}>
              {inputValue.length}/1000
            </p>
          )}
        </div>
      </div>
    </>
  )
}
