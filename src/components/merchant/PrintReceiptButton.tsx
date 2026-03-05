'use client'

import { useState, useCallback } from 'react'
import { Printer, Check, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPrinter, type PrintableOrder } from '@/lib/thermal-printer'

interface PrintReceiptButtonProps {
  order: PrintableOrder
  className?: string
  size?: 'sm' | 'md'
}

export default function PrintReceiptButton({ order, className, size = 'md' }: PrintReceiptButtonProps) {
  const [printing, setPrinting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePrint = useCallback(async () => {
    setError(null)
    setPrinting(true)
    setSuccess(false)

    try {
      const printer = getPrinter()

      // If not connected, connect first (requires user gesture - this click counts)
      if (!printer.isConnected) {
        await printer.connect()
      }

      await printer.printOrder(order)
      setSuccess(true)

      // Reset success state after 2 seconds
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al imprimir'
      // Don't show error if user cancelled the Bluetooth dialog
      if (!message.includes('cancelled') && !message.includes('canceled')) {
        setError(message)
      }
    } finally {
      setPrinting(false)
    }
  }, [order])

  // Check Web Bluetooth availability at render time
  const bluetoothAvailable = typeof navigator !== 'undefined' && typeof navigator.bluetooth !== 'undefined'

  if (!bluetoothAvailable) {
    return null // Don't render if Bluetooth is not available
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <button
        onClick={handlePrint}
        disabled={printing}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all',
          size === 'sm'
            ? 'px-2.5 py-1.5 text-xs'
            : 'px-3 py-2 text-sm',
          success
            ? 'bg-emerald-600 text-white'
            : 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 active:bg-zinc-600',
          printing && 'opacity-60 cursor-wait'
        )}
      >
        {printing ? (
          <>
            <Loader2 className={cn('animate-spin', size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
            <span>Imprimiendo...</span>
          </>
        ) : success ? (
          <>
            <Check className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
            <span>Impreso</span>
          </>
        ) : (
          <>
            <Printer className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
            <span>Imprimir ticket</span>
          </>
        )}
      </button>

      {error && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-red-950/50 border border-red-800 text-red-400 text-[10px]">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
