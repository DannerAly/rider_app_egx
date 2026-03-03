'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function subscribeToPush() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return

  const registration = await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
  })

  const json = subscription.toJSON()

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      },
    }),
  })
}

export default function PushSubscriber() {
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const permission = Notification.permission

    if (permission === 'granted') {
      // Auto-suscribir silenciosamente
      subscribeToPush().catch(() => {})
    } else if (permission === 'default') {
      setShowButton(true)
    }
    // Si permission === 'denied', no mostramos nada
  }, [])

  const handleClick = async () => {
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      setShowButton(false)
      await subscribeToPush().catch(() => {})
    } else if (result === 'denied') {
      setShowButton(false)
    }
  }

  if (!showButton) return null

  return (
    <div className="px-4 pt-2">
      <button
        onClick={handleClick}
        className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 transition-colors"
      >
        <Bell className="w-3.5 h-3.5" />
        Activar notificaciones
      </button>
    </div>
  )
}
