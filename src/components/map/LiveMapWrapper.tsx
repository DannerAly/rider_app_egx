'use client'

import dynamic from 'next/dynamic'

// Leaflet requiere `window`, no puede renderizarse en el servidor
const LiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-100 rounded-xl">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Cargando mapa...</p>
      </div>
    </div>
  ),
})

export default function LiveMapWrapper({
  center,
  zoom,
}: {
  center?: [number, number]
  zoom?:   number
}) {
  return <LiveMap center={center} zoom={zoom} />
}
