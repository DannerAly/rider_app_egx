'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, WifiOff } from 'lucide-react'

interface Props {
  riderId: string
  currentStatus: string
}

export default function RiderActions({ riderId, currentStatus }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  const isOnline = currentStatus !== 'offline'

  const forceOffline = async () => {
    if (!isOnline) return
    setLoading(true)
    await fetch(`/api/riders/${riderId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'offline' }),
    })
    setLoading(false)
    router.refresh()
  }

  if (!isOnline) return null  // ya está offline, no mostrar botón

  return (
    <button
      onClick={forceOffline}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 transition-colors disabled:opacity-50"
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <WifiOff className="w-3.5 h-3.5" />
      }
      Desconectar
    </button>
  )
}
