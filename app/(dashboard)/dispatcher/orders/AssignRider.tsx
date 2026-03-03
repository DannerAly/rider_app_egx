'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck, Loader2, ChevronDown, X } from 'lucide-react'

interface Rider { id: string; full_name: string; vehicle_type: string }

const VEHICLE: Record<string, string> = {
  motorcycle: '🏍️ Moto', bicycle: '🚲 Bici',
  car: '🚗 Auto', walking: '🚶 A pie', truck: '🚛 Camión',
}

export default function AssignRider({ orderId, riders }: { orderId: string; riders: Rider[] }) {
  const router  = useRouter()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)

  const assign = async (riderId: string) => {
    setLoading(true)
    await fetch(`/api/orders/${orderId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'reassign', rider_id: riderId }),
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (riders.length === 0) {
    return <span className="text-xs text-zinc-400 italic">Sin riders disponibles</span>
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <UserCheck className="w-3.5 h-3.5" />}
        Asignar
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          {/* Overlay para cerrar */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-zinc-200 shadow-xl z-20 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Riders disponibles</span>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {riders.map(r => (
              <button
                key={r.id}
                onClick={() => assign(r.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 transition-colors flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 text-xs font-bold">{r.full_name[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-zinc-900 text-sm font-medium leading-tight truncate">{r.full_name}</p>
                  <p className="text-zinc-400 text-xs">{VEHICLE[r.vehicle_type] ?? r.vehicle_type}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
