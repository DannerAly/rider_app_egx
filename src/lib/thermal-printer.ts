/**
 * Thermal Printer via Web Bluetooth (ESC/POS)
 *
 * Supports common thermal printer Bluetooth service UUIDs.
 * Web Bluetooth requires a secure context (HTTPS) and user gesture to connect.
 */

export interface PrintableOrder {
  merchantName: string
  orderNumber: string
  createdAt: string
  items: { name: string; quantity: number; price: number; modifiers?: string[] }[]
  subtotal: number
  serviceFee: number
  deliveryFee: number
  tipAmount: number
  total: number
  paymentMethod: string
  deliveryAddress: string
  customerNotes?: string
  customerName?: string
}

// Common Bluetooth service UUIDs for thermal printers
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Common thermal printer service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC (Microchip) transparent UART
]

// Common characteristic UUIDs for writing data to the printer
const PRINTER_CHARACTERISTIC_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb', // Common write characteristic
  '49535343-8841-43f4-a8d4-ecbe34729bb3', // ISSC transparent TX
]

// ESC/POS command constants
const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

const CMD = {
  INIT: new Uint8Array([ESC, 0x40]),                       // ESC @ - Initialize printer
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),              // ESC E 1 - Bold on
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),             // ESC E 0 - Bold off
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),           // ESC a 0 - Align left
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),         // ESC a 1 - Align center
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),          // ESC a 2 - Align right
  FONT_NORMAL: new Uint8Array([GS, 0x21, 0x00]),           // GS ! 0x00 - Normal size
  FONT_DOUBLE: new Uint8Array([GS, 0x21, 0x11]),           // GS ! 0x11 - Double width + double height
  FONT_DOUBLE_HEIGHT: new Uint8Array([GS, 0x21, 0x01]),    // GS ! 0x01 - Double height only
  CUT_PAPER: new Uint8Array([GS, 0x56, 0x00]),             // GS V 0 - Full cut
  CUT_PAPER_PARTIAL: new Uint8Array([GS, 0x56, 0x01]),     // GS V 1 - Partial cut
  FEED_LINE: new Uint8Array([LF]),                         // LF - Line feed
} as const

const RECEIPT_WIDTH = 32 // Characters per line for 58mm paper (common thermal printer width)

export class ThermalPrinter {
  private device: BluetoothDevice | null = null
  private server: BluetoothRemoteGATTServer | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private _connected = false

  get isConnected(): boolean {
    return this._connected && this.server !== null && this.server.connected
  }

  /**
   * Connect to a Bluetooth thermal printer.
   * MUST be called from a user gesture (click event).
   */
  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth no disponible en este navegador')
    }

    try {
      // Request device with known printer service UUIDs
      this.device = await navigator.bluetooth.requestDevice({
        filters: PRINTER_SERVICE_UUIDS.map(uuid => ({ services: [uuid] })),
        optionalServices: PRINTER_SERVICE_UUIDS,
      })

      if (!this.device) {
        throw new Error('No se seleccionó ningún dispositivo')
      }

      // Listen for disconnection
      this.device.addEventListener('gattserverdisconnected', () => {
        this._connected = false
        this.server = null
        this.characteristic = null
        localStorage.removeItem('thermal_printer_connected')
      })

      // Connect to GATT server
      this.server = await this.device.gatt!.connect()

      // Find the writable characteristic
      this.characteristic = await this.findWriteCharacteristic()

      if (!this.characteristic) {
        throw new Error('No se encontró la característica de escritura de la impresora')
      }

      this._connected = true
      localStorage.setItem('thermal_printer_connected', 'true')
      localStorage.setItem('thermal_printer_name', this.device.name ?? 'Impresora')
    } catch (error) {
      this._connected = false
      this.server = null
      this.characteristic = null
      throw error
    }
  }

  /**
   * Disconnect from the current printer.
   */
  disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this._connected = false
    this.server = null
    this.characteristic = null
    localStorage.removeItem('thermal_printer_connected')
    localStorage.removeItem('thermal_printer_name')
  }

  /**
   * Get the name of the connected printer.
   */
  get printerName(): string | null {
    return this.device?.name ?? localStorage.getItem('thermal_printer_name')
  }

  /**
   * Print a full order receipt in ESC/POS format.
   */
  async printOrder(order: PrintableOrder): Promise<void> {
    if (!this.isConnected || !this.characteristic) {
      throw new Error('Impresora no conectada')
    }

    const data: Uint8Array[] = []

    // Initialize printer
    data.push(CMD.INIT)

    // ===== Merchant name (centered, double size) =====
    data.push(CMD.ALIGN_CENTER)
    data.push(CMD.FONT_DOUBLE)
    data.push(CMD.BOLD_ON)
    data.push(this.encode(order.merchantName))
    data.push(CMD.FEED_LINE)
    data.push(CMD.FONT_NORMAL)
    data.push(CMD.BOLD_OFF)

    // Separator
    data.push(this.separator())
    data.push(CMD.FEED_LINE)

    // ===== Order number =====
    data.push(CMD.ALIGN_LEFT)
    data.push(CMD.BOLD_ON)
    data.push(this.encode(`Pedido: ${order.orderNumber}`))
    data.push(CMD.FEED_LINE)
    data.push(CMD.BOLD_OFF)

    // ===== Date and time =====
    const date = new Date(order.createdAt)
    const dateStr = date.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const timeStr = date.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    })
    data.push(this.encode(`Fecha: ${dateStr}  ${timeStr}`))
    data.push(CMD.FEED_LINE)

    // Customer name if available
    if (order.customerName) {
      data.push(this.encode(`Cliente: ${order.customerName}`))
      data.push(CMD.FEED_LINE)
    }

    // Separator
    data.push(this.separator())
    data.push(CMD.FEED_LINE)

    // ===== Items =====
    for (const item of order.items) {
      const qty = `${item.quantity}x `
      const price = `Bs.${item.price.toFixed(2)}`
      const nameMaxLen = RECEIPT_WIDTH - qty.length - price.length - 1
      const name = item.name.length > nameMaxLen
        ? item.name.substring(0, nameMaxLen - 1) + '.'
        : item.name

      const padding = RECEIPT_WIDTH - qty.length - name.length - price.length
      const spaces = padding > 0 ? ' '.repeat(padding) : ' '

      data.push(this.encode(`${qty}${name}${spaces}${price}`))
      data.push(CMD.FEED_LINE)

      // Print modifiers if any
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          data.push(this.encode(`   + ${mod}`))
          data.push(CMD.FEED_LINE)
        }
      }
    }

    // Separator
    data.push(this.separator())
    data.push(CMD.FEED_LINE)

    // ===== Totals =====
    data.push(this.formatLine('Subtotal', `Bs.${order.subtotal.toFixed(2)}`))
    data.push(CMD.FEED_LINE)

    data.push(this.formatLine('Servicio', `Bs.${order.serviceFee.toFixed(2)}`))
    data.push(CMD.FEED_LINE)

    data.push(this.formatLine('Delivery', `Bs.${order.deliveryFee.toFixed(2)}`))
    data.push(CMD.FEED_LINE)

    if (order.tipAmount > 0) {
      data.push(this.formatLine('Propina', `Bs.${order.tipAmount.toFixed(2)}`))
      data.push(CMD.FEED_LINE)
    }

    // Separator line before total
    data.push(this.separator())
    data.push(CMD.FEED_LINE)

    // ===== TOTAL (bold, double size) =====
    data.push(CMD.BOLD_ON)
    data.push(CMD.FONT_DOUBLE)
    const totalLabel = 'TOTAL'
    const totalValue = `Bs.${order.total.toFixed(2)}`
    // For double-size font, effective width is halved
    const totalWidth = Math.floor(RECEIPT_WIDTH / 2)
    const totalPadding = totalWidth - totalLabel.length - totalValue.length
    const totalSpaces = totalPadding > 0 ? ' '.repeat(totalPadding) : ' '
    data.push(this.encode(`${totalLabel}${totalSpaces}${totalValue}`))
    data.push(CMD.FEED_LINE)
    data.push(CMD.FONT_NORMAL)
    data.push(CMD.BOLD_OFF)

    // Separator
    data.push(this.separator())
    data.push(CMD.FEED_LINE)

    // ===== Payment method =====
    const paymentLabel = order.paymentMethod === 'cash' ? 'Efectivo' :
      order.paymentMethod === 'card' ? 'Tarjeta' :
      order.paymentMethod === 'qr' ? 'QR' : order.paymentMethod
    data.push(this.encode(`Pago: ${paymentLabel}`))
    data.push(CMD.FEED_LINE)

    // ===== Delivery address =====
    data.push(CMD.FEED_LINE)
    data.push(CMD.BOLD_ON)
    data.push(this.encode('Direccion de entrega:'))
    data.push(CMD.FEED_LINE)
    data.push(CMD.BOLD_OFF)
    // Wrap address if longer than receipt width
    const addressLines = this.wrapText(order.deliveryAddress, RECEIPT_WIDTH)
    for (const line of addressLines) {
      data.push(this.encode(line))
      data.push(CMD.FEED_LINE)
    }

    // ===== Customer notes =====
    if (order.customerNotes) {
      data.push(CMD.FEED_LINE)
      data.push(CMD.BOLD_ON)
      data.push(this.encode('Notas:'))
      data.push(CMD.FEED_LINE)
      data.push(CMD.BOLD_OFF)
      const notesLines = this.wrapText(order.customerNotes, RECEIPT_WIDTH)
      for (const line of notesLines) {
        data.push(this.encode(line))
        data.push(CMD.FEED_LINE)
      }
    }

    // Separator
    data.push(this.separator())
    data.push(CMD.FEED_LINE)

    // ===== Thank you message =====
    data.push(CMD.ALIGN_CENTER)
    data.push(CMD.FEED_LINE)
    data.push(this.encode('Gracias por tu pedido!'))
    data.push(CMD.FEED_LINE)
    data.push(CMD.FEED_LINE)

    // Reset alignment
    data.push(CMD.ALIGN_LEFT)

    // Feed some lines before cutting
    data.push(CMD.FEED_LINE)
    data.push(CMD.FEED_LINE)
    data.push(CMD.FEED_LINE)

    // Cut paper
    data.push(CMD.CUT_PAPER_PARTIAL)

    // Send all data
    await this.sendData(this.concat(data))
  }

  /**
   * Print simple text.
   */
  async printText(text: string): Promise<void> {
    if (!this.isConnected || !this.characteristic) {
      throw new Error('Impresora no conectada')
    }

    const data: Uint8Array[] = []
    data.push(CMD.INIT)
    data.push(CMD.ALIGN_LEFT)
    data.push(CMD.FONT_NORMAL)

    const lines = text.split('\n')
    for (const line of lines) {
      data.push(this.encode(line))
      data.push(CMD.FEED_LINE)
    }

    data.push(CMD.FEED_LINE)
    data.push(CMD.FEED_LINE)
    data.push(CMD.CUT_PAPER_PARTIAL)

    await this.sendData(this.concat(data))
  }

  // ========== Private helpers ==========

  /**
   * Search for the writable characteristic across known services.
   */
  private async findWriteCharacteristic(): Promise<BluetoothRemoteGATTCharacteristic | null> {
    if (!this.server) return null

    for (const serviceUUID of PRINTER_SERVICE_UUIDS) {
      try {
        const service = await this.server.getPrimaryService(serviceUUID)

        // Try known characteristic UUIDs
        for (const charUUID of PRINTER_CHARACTERISTIC_UUIDS) {
          try {
            const char = await service.getCharacteristic(charUUID)
            if (char.properties.write || char.properties.writeWithoutResponse) {
              return char
            }
          } catch {
            // This characteristic doesn't exist in this service, try next
          }
        }

        // Fallback: enumerate all characteristics and find writable one
        try {
          const chars = await service.getCharacteristics()
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              return char
            }
          }
        } catch {
          // Could not enumerate characteristics
        }
      } catch {
        // This service doesn't exist on the device, try next
      }
    }

    return null
  }

  /**
   * Send data to the printer, chunked to avoid Bluetooth MTU limits.
   */
  private async sendData(data: Uint8Array): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Impresora no conectada')
    }

    const CHUNK_SIZE = 100 // Safe chunk size for BLE

    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, offset + CHUNK_SIZE)

      if (this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk)
      } else {
        await this.characteristic.writeValueWithResponse(chunk)
      }

      // Small delay between chunks to prevent buffer overflow
      if (offset + CHUNK_SIZE < data.length) {
        await new Promise(resolve => setTimeout(resolve, 20))
      }
    }
  }

  /**
   * Encode text to Uint8Array using the printer's code page (CP437/Latin-1).
   * Handles common Spanish characters by mapping to closest CP437 equivalents.
   */
  private encode(text: string): Uint8Array {
    const encoder = new TextEncoder()
    // Replace accented characters that might not print correctly on some printers
    const sanitized = text
      .replace(/[áà]/g, 'a')
      .replace(/[éè]/g, 'e')
      .replace(/[íì]/g, 'i')
      .replace(/[óò]/g, 'o')
      .replace(/[úù]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[Á]/g, 'A')
      .replace(/[É]/g, 'E')
      .replace(/[Í]/g, 'I')
      .replace(/[Ó]/g, 'O')
      .replace(/[Ú]/g, 'U')
      .replace(/[Ñ]/g, 'N')
      .replace(/[¡]/g, '!')
      .replace(/[¿]/g, '?')
    return encoder.encode(sanitized)
  }

  /**
   * Create a separator line of dashes.
   */
  private separator(): Uint8Array {
    return this.encode('-'.repeat(RECEIPT_WIDTH))
  }

  /**
   * Format a label-value line with dots/spaces filling the gap.
   */
  private formatLine(label: string, value: string): Uint8Array {
    const padding = RECEIPT_WIDTH - label.length - value.length
    const spaces = padding > 0 ? ' '.repeat(padding) : ' '
    return this.encode(`${label}${spaces}${value}`)
  }

  /**
   * Wrap text to fit within a given width.
   */
  private wrapText(text: string, width: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      if (currentLine.length === 0) {
        currentLine = word
      } else if (currentLine.length + 1 + word.length <= width) {
        currentLine += ' ' + word
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine)
    }

    return lines
  }

  /**
   * Concatenate multiple Uint8Arrays into one.
   */
  private concat(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const arr of arrays) {
      result.set(arr, offset)
      offset += arr.length
    }
    return result
  }
}

// ========== Singleton ==========

let _printer: ThermalPrinter | null = null

export function getPrinter(): ThermalPrinter {
  if (!_printer) _printer = new ThermalPrinter()
  return _printer
}
