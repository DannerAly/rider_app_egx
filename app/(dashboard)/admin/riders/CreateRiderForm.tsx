'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, UserPlus } from 'lucide-react'

interface Zone { id: string; name: string }

const VEHICLE_OPTIONS = [
  { value: 'motorcycle', label: '🏍️ Moto' },
  { value: 'bicycle',    label: '🚲 Bicicleta' },
  { value: 'car',        label: '🚗 Auto' },
  { value: 'truck',      label: '🚛 Camión' },
  { value: 'walking',    label: '🚶 A pie' },
]

export default function CreateRiderForm({ zones }: { zones: Zone[] }) {
  const router = useRouter()
  const [open,      setOpen]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name:     '',
    email:         '',
    password:      '',
    phone:         '',
    vehicle_type:  'motorcycle',
    vehicle_plate: '',
    vehicle_model: '',
    zone_id:       '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/riders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, zone_id: form.zone_id || null }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Error al crear el rider')
      return
    }

    setSuccess(`Rider "${form.full_name}" creado. Credenciales: ${form.email} / ${form.password}`)
    setForm({ full_name: '', email: '', password: '', phone: '', vehicle_type: 'motorcycle', vehicle_plate: '', vehicle_model: '', zone_id: '' })
    router.refresh()
  }

  return (
    <>
      {/* Botón abrir */}
      <button
        onClick={() => { setOpen(true); setError(null); setSuccess(null) }}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Nuevo rider
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-zinc-900 font-semibold">Crear rider</h2>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Nombre */}
              <Field label="Nombre completo *">
                <input required value={form.full_name} onChange={set('full_name')} placeholder="Juan Pérez" className={inputCls} />
              </Field>

              {/* Email */}
              <Field label="Correo electrónico *">
                <input required type="email" value={form.email} onChange={set('email')} placeholder="rider@egx.com" className={inputCls} />
              </Field>

              {/* Contraseña */}
              <Field label="Contraseña *" hint="Mínimo 8 caracteres">
                <input required type="password" minLength={8} value={form.password} onChange={set('password')} placeholder="••••••••" className={inputCls} />
              </Field>

              {/* Teléfono */}
              <Field label="Teléfono">
                <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+591 70000000" className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                {/* Vehículo */}
                <Field label="Vehículo *">
                  <select required value={form.vehicle_type} onChange={set('vehicle_type')} className={inputCls}>
                    {VEHICLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>

                {/* Zona */}
                <Field label="Zona">
                  <select value={form.zone_id} onChange={set('zone_id')} className={inputCls}>
                    <option value="">Sin zona</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Placa */}
                <Field label="Placa">
                  <input value={form.vehicle_plate} onChange={set('vehicle_plate')} placeholder="1234ABC" className={inputCls} />
                </Field>

                {/* Modelo */}
                <Field label="Modelo">
                  <input value={form.vehicle_model} onChange={set('vehicle_model')} placeholder="Honda 125" className={inputCls} />
                </Field>
              </div>

              {/* Error / éxito */}
              {error   && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              {success && <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 leading-relaxed">{success}</p>}

              {/* Acciones */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Creando...' : 'Crear rider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600 block mb-1">
        {label}
        {hint && <span className="text-zinc-400 font-normal ml-1">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 bg-white'
