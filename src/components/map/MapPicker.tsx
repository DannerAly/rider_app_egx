'use client'

import dynamic from 'next/dynamic'
import type { PickedLocation } from './MapPickerInner'

const MapPickerInner = dynamic(() => import('./MapPickerInner'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Cargando mapa...</p>
      </div>
    </div>
  ),
})

export type { PickedLocation }

export default function MapPicker(props: {
  label:          string
  defaultCenter?: [number, number]
  onConfirm:      (loc: PickedLocation) => void
  onClose:        () => void
}) {
  return <MapPickerInner {...props} />
}
