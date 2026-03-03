'use client'

import dynamic from 'next/dynamic'
import type { RoutePoint } from './RiderRouteMapInner'

export type { RoutePoint }

const RiderRouteMapInner = dynamic(() => import('./RiderRouteMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Cargando mapa...</p>
      </div>
    </div>
  ),
})

export default function RiderRouteMap(props: {
  riderId:       string
  initialDate:   string
  initialPoints: RoutePoint[]
}) {
  return <RiderRouteMapInner {...props} />
}
