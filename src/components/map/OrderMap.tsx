'use client'

import dynamic from 'next/dynamic'
import type { OrderMapProps } from './OrderMapInner'

const OrderMapInner = dynamic(() => import('./OrderMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-50">
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

export default function OrderMap(props: OrderMapProps) {
  return <OrderMapInner {...props} />
}
