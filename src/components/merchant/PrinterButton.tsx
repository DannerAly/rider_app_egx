'use client'

import { useState, useEffect, useCallback } from 'react'
import { Printer, Bluetooth, BluetoothOff, Check, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPrinter, type PrintableOrder } from '@/lib/thermal-printer'

interface PrinterButtonProps {
  order?: PrintableOrder
  className?: string
}

export default function PrinterButton({ order, className }: PrinterButtonProps) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [printSuccess, setPrintSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bluetoothAvailable, setBluetoothAvailable] = useState(true)
  const [printerName, setPrinterName] = useState<string | null>(null)

  // Check Bluetooth availability and previous connection state
  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof navigator.bluetooth === 'undefined') {
      setBluetoothAvailable(false)
      return
    }

    // Check if there was a previous connection
    const wasConnected = localStorage.getItem('thermal_printer_connected') === 'true'
    const savedName = localStorage.getItem('thermal_printer_name')
    if (wasConnected && savedName) {
      setPrinterName(savedName)
    }

    // Sync connection state periodically
    const interval = setInterval(() => {
      const printer = getPrinter()
      setConnected(printer.isConnected)
      if (!printer.isConnected && connected) {
        setPrinterName(null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [connected])

  const handleConnect = useCallback(async () => {
    setError(null)
    setConnecting(true)

    try {
      const printer = getPrinter()

      if (printer.isConnected) {
        printer.disconnect()
        setConnected(false)
        setPrinterName(null)
      } else {
        await printer.connect()
        setConnected(true)
        setPrinterName(printer.printerName)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al conectar la impresora'
      // Don't show error if user cancelled the dialog
      if (message.includes('cancelled') || message.includes('canceled')) {
        setError(null)
      } else {
        setError(message)
      }
    } finally {
      setConnecting(false)
    }
  }, [])

  const handlePrint = useCallback(async () => {
    if (!order) return

    setError(null)
    setPrinting(true)
    setPrintSuccess(false)

    try {
      const printer = getPrinter()

      // Connect first if not connected
      if (!printer.isConnected) {
        await printer.connect()
        setConnected(true)
        setPrinterName(printer.printerName)
      }

      await printer.printOrder(order)
      setPrintSuccess(true)

      // Reset success indicator after 2 seconds
      setTimeout(() => setPrintSuccess(false), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al imprimir'
      if (!message.includes('cancelled') && !message.includes('canceled')) {
        setError(message)
      }
    } finally {
      setPrinting(false)
    }
  }, [order])

  // Web Bluetooth not available
  if (!bluetoothAvailable) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs',
        className
      )}>
        <BluetoothOff className="w-4 h-4 shrink-0" />
        <span>Web Bluetooth no disponible en este navegador</span>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Connection button */}
      <button
        onClick={handleConnect}
        disabled={connecting}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
          connected
            ? 'bg-emerald-950/50 border-emerald-700 text-emerald-400 hover:bg-emerald-950/70'
            : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800',
          connecting && 'opacity-60 cursor-wait'
        )}
      >
        {connecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : connected ? (
          <Bluetooth className="w-4 h-4" />
        ) : (
          <BluetoothOff className="w-4 h-4" />
        )}

        <span className="flex-1 text-left">
          {connecting
            ? 'Conectando...'
            : connected
              ? printerName ?? 'Impresora conectada'
              : 'Conectar impresora'}
        </span>

        {connected && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </button>

      {/* Print button (only if order is provided) */}
      {order && (
        <button
          onClick={handlePrint}
          disabled={printing}
          className={cn(
            'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
            printSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700',
            printing && 'opacity-60 cursor-wait'
          )}
        >
          {printing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Imprimiendo...</span>
            </>
          ) : printSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Impreso</span>
            </>
          ) : (
            <>
              <Printer className="w-4 h-4" />
              <span>Imprimir ticket</span>
            </>
          )}
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-950/50 border border-red-800 text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
