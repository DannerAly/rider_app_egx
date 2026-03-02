'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, Plus, MapPin, ChevronRight } from 'lucide-react'
import MapPicker, { type PickedLocation } from '@/components/map/MapPicker'

interface Zone { id: string; name: string }

const PRIORITY_OPTIONS = [
  { value: 'low',    label: '🔵 Baja' },
  { value: 'normal', label: '⚪ Normal' },
  { value: 'high',   label: '🟠 Alta' },
  { value: 'urgent', label: '🔴 Urgente' },
]

type MapTarget = 'pickup' | 'delivery' | null

export default function CreateOrderForm({ zones }: { zones: Zone[] }) {
  const router = useRouter()
  const [open,      setOpen]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [mapTarget, setMapTarget] = useState<MapTarget>(null)

  // Pickup
  const [pickupLoc,   setPickupLoc]   = useState<PickedLocation | null>(null)
  const [pickupName,  setPickupName]  = useState('')
  const [pickupPhone, setPickupPhone] = useState('')
  const [pickupNotes, setPickupNotes] = useState('')

  // Delivery
  const [deliveryLoc,   setDeliveryLoc]   = useState<PickedLocation | null>(null)
  const [deliveryName,  setDeliveryName]  = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  // Pedido
  const [priority,      setPriority]      = useState('normal')
  const [packageDesc,   setPackageDesc]   = useState('')
  const [packageWeight, setPackageWeight] = useState('')
  const [zoneId,        setZoneId]        = useState('')

  const handleMapConfirm = (loc: PickedLocation) => {
    if (mapTarget === 'pickup')   setPickupLoc(loc)
    if (mapTarget === 'delivery') setDeliveryLoc(loc)
    setMapTarget(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!pickupLoc)   { setError('Selecciona la ubicación de recogida en el mapa'); return }
    if (!deliveryLoc) { setError('Selecciona la ubicación de entrega en el mapa');  return }

    setLoading(true)
    const res = await fetch('/api/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickup_address:         pickupLoc.address,
        pickup_lat:             pickupLoc.lat,
        pickup_lng:             pickupLoc.lng,
        pickup_contact_name:    pickupName  || null,
        pickup_contact_phone:   pickupPhone || null,
        pickup_notes:           pickupNotes || null,
        delivery_address:       deliveryLoc.address,
        delivery_lat:           deliveryLoc.lat,
        delivery_lng:           deliveryLoc.lng,
        delivery_contact_name:  deliveryName  || null,
        delivery_contact_phone: deliveryPhone || null,
        delivery_notes:         deliveryNotes || null,
        priority,
        package_description: packageDesc   || null,
        package_weight_kg:   packageWeight ? parseFloat(packageWeight) : null,
        zone_id:             zoneId        || null,
      }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) { setError(json.error ?? 'Error al crear el pedido'); return }

    // Reset
    setOpen(false)
    setPickupLoc(null); setPickupName(''); setPickupPhone(''); setPickupNotes('')
    setDeliveryLoc(null); setDeliveryName(''); setDeliveryPhone(''); setDeliveryNotes('')
    setPriority('normal'); setPackageDesc(''); setPackageWeight(''); setZoneId('')
    router.refresh()
  }

  return (
    <>
      {/* Botón abrir formulario */}
      <button
        onClick={() => { setOpen(true); setError(null) }}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nuevo pedido
      </button>

      {/* Modal mapa (encima del formulario) */}
      {mapTarget && (
        <MapPicker
          label={mapTarget === 'pickup' ? 'Seleccionar punto de recogida' : 'Seleccionar punto de entrega'}
          defaultCenter={[-17.7863, -63.1812]}
          onConfirm={handleMapConfirm}
          onClose={() => setMapTarget(null)}
        />
      )}

      {/* Modal formulario */}
      {open && !mapTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-zinc-900 font-semibold">Crear pedido</h2>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* ── PICKUP ────────────────────────────────────────────── */}
              <Section title="📍 Punto de recogida" color="blue">
                {/* Selector de ubicación en mapa */}
                <LocationButton
                  loc={pickupLoc}
                  label="Seleccionar en mapa"
                  onClick={() => setMapTarget('pickup')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nombre contacto">
                    <input value={pickupName} onChange={e => setPickupName(e.target.value)} placeholder="Juan Pérez" className={inputCls} />
                  </Field>
                  <Field label="Teléfono">
                    <input value={pickupPhone} onChange={e => setPickupPhone(e.target.value)} placeholder="+591 700 00000" className={inputCls} />
                  </Field>
                </div>
                <Field label="Notas">
                  <input value={pickupNotes} onChange={e => setPickupNotes(e.target.value)} placeholder="Piso 3, puerta azul..." className={inputCls} />
                </Field>
              </Section>

              {/* ── DELIVERY ──────────────────────────────────────────── */}
              <Section title="🏁 Punto de entrega" color="green">
                <LocationButton
                  loc={deliveryLoc}
                  label="Seleccionar en mapa"
                  onClick={() => setMapTarget('delivery')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nombre contacto">
                    <input value={deliveryName} onChange={e => setDeliveryName(e.target.value)} placeholder="María López" className={inputCls} />
                  </Field>
                  <Field label="Teléfono">
                    <input value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)} placeholder="+591 700 00000" className={inputCls} />
                  </Field>
                </div>
                <Field label="Notas">
                  <input value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} placeholder="Dejar en portería..." className={inputCls} />
                </Field>
              </Section>

              {/* ── OPCIONES ──────────────────────────────────────────── */}
              <Section title="📦 Paquete y opciones" color="zinc">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prioridad">
                    <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls}>
                      {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Zona">
                    <select value={zoneId} onChange={e => setZoneId(e.target.value)} className={inputCls}>
                      <option value="">Sin zona</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Descripción del paquete">
                  <input value={packageDesc} onChange={e => setPackageDesc(e.target.value)} placeholder="Documentos, ropa, electrónico..." className={inputCls} />
                </Field>
                <Field label="Peso (kg)">
                  <input type="number" min="0" step="0.1" value={packageWeight} onChange={e => setPackageWeight(e.target.value)} placeholder="0.5" className={inputCls} />
                </Field>
              </Section>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Creando...' : 'Crear pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function LocationButton({ loc, label, onClick }: { loc: PickedLocation | null; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
        loc
          ? 'border-blue-500 bg-blue-50'
          : 'border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50'
      }`}
    >
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${loc ? 'text-blue-600' : 'text-zinc-400'}`} />
        <div className="min-w-0">
          {loc ? (
            <>
              <p className="text-blue-700 text-xs font-semibold mb-0.5">Ubicación seleccionada</p>
              <p className="text-zinc-600 text-xs leading-snug line-clamp-2">{loc.address}</p>
            </>
          ) : (
            <p className="text-zinc-500 text-sm">{label}</p>
          )}
        </div>
      </div>
      <ChevronRight className={`w-4 h-4 flex-shrink-0 ml-2 ${loc ? 'text-blue-400' : 'text-zinc-300'}`} />
    </button>
  )
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const style = color === 'blue'  ? 'border-blue-100 bg-blue-50/40'
              : color === 'green' ? 'border-green-100 bg-green-50/40'
              :                     'border-zinc-100 bg-zinc-50/40'
  return (
    <div className={`border rounded-xl p-4 space-y-3 ${style}`}>
      <p className="text-zinc-700 text-sm font-semibold">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-500 block mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 bg-white'
