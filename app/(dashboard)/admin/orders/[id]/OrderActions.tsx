'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, XCircle, UserCheck, ChevronDown } from 'lucide-react'

interface Rider { id: string; name: string; vehicle: string }

interface Props {
  orderId:        string
  currentStatus:  string
  currentRiderId: string | null
  availableRiders: Rider[]
}

const CANCELLABLE = ['pending', 'assigned', 'heading_to_pickup', 'picked_up', 'in_transit']

export default function OrderActions({ orderId, currentStatus, currentRiderId, availableRiders }: Props) {
  const router = useRouter()
  const [cancelling,   setCancelling]   = useState(false)
  const [reassigning,  setReassigning]  = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [reason,       setReason]       = useState('')
  const [showConfirm,  setShowConfirm]  = useState(false)

  const canCancel   = CANCELLABLE.includes(currentStatus)
  const canReassign = !['delivered', 'cancelled', 'failed'].includes(currentStatus)

  const handleCancel = async () => {
    setCancelling(true)
    await fetch(`/api/orders/${orderId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'cancel', reason: reason || undefined }),
    })
    setCancelling(false)
    setShowConfirm(false)
    router.refresh()
  }

  const handleReassign = async (riderId: string | null) => {
    setReassigning(true)
    setShowDropdown(false)
    await fetch(`/api/orders/${orderId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'reassign', rider_id: riderId }),
    })
    setReassigning(false)
    router.refresh()
  }

  if (!canCancel && !canReassign) return null

  return (
    <div className="flex items-center gap-2">

      {/* ── Reasignar rider ─────────────────────────────────────────────── */}
      {canReassign && (
        <div className="relative">
          <button
            onClick={() => setShowDropdown(d => !d)}
            disabled={reassigning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            {reassigning
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <UserCheck className="w-4 h-4 text-blue-500" />
            }
            Reasignar rider
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-60 bg-white rounded-xl border border-zinc-200 shadow-lg z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-100">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Seleccionar rider</p>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {currentRiderId && (
                  <button
                    onClick={() => handleReassign(null)}
                    className="w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-b border-zinc-100"
                  >
                    Quitar rider asignado
                  </button>
                )}
                {availableRiders.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-zinc-400 text-center">No hay riders disponibles</p>
                ) : (
                  availableRiders.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleReassign(r.id)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-zinc-50 transition-colors ${r.id === currentRiderId ? 'bg-blue-50' : ''}`}
                    >
                      <p className="text-sm font-medium text-zinc-800">{r.name}</p>
                      <p className="text-xs text-zinc-400">{r.vehicle}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cancelar pedido ─────────────────────────────────────────────── */}
      {canCancel && !showConfirm && (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Cancelar pedido
        </button>
      )}

      {/* ── Confirmar cancelación ────────────────────────────────────────── */}
      {showConfirm && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="text-sm border-0 bg-transparent focus:outline-none text-zinc-700 w-40 placeholder-zinc-400"
          />
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Confirmar
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}
