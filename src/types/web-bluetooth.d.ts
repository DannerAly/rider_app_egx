// Web Bluetooth API type declarations
interface Navigator {
  bluetooth: Bluetooth
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
  getAvailability(): Promise<boolean>
}

interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[]
  optionalServices?: BluetoothServiceUUID[]
  acceptAllDevices?: boolean
}

interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[]
  name?: string
  namePrefix?: string
}

type BluetoothServiceUUID = string | number

interface BluetoothDevice {
  id: string
  name?: string
  gatt?: BluetoothRemoteGATTServer
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
}

interface BluetoothRemoteGATTServer {
  device: BluetoothDevice
  connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>
}

interface BluetoothRemoteGATTService {
  uuid: string
  device: BluetoothDevice
  getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(characteristic?: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic[]>
}

type BluetoothCharacteristicUUID = string | number

interface BluetoothRemoteGATTCharacteristic {
  uuid: string
  service: BluetoothRemoteGATTService
  properties: BluetoothCharacteristicProperties
  value?: DataView
  writeValue(value: BufferSource): Promise<void>
  writeValueWithResponse(value: BufferSource): Promise<void>
  writeValueWithoutResponse(value: BufferSource): Promise<void>
  readValue(): Promise<DataView>
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothCharacteristicProperties {
  broadcast: boolean
  read: boolean
  writeWithoutResponse: boolean
  write: boolean
  notify: boolean
  indicate: boolean
  authenticatedSignedWrites: boolean
  reliableWrite: boolean
  writableAuxiliaries: boolean
}
