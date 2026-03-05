'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save, Clock, X } from 'lucide-react'

const DAYS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
]

export default function MerchantSettings() {
  const [merchant, setMerchant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    name: '', description: '', phone: '', email: '',
    address: '', avg_prep_time_min: '30', min_order_amount: '0',
  })
  const [hours, setHours] = useState<Record<string, { open: string; close: string }>>({})

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    const res = await fetch('/api/merchant/settings')
    const json = await res.json()
    if (json.data) {
      setMerchant(json.data)
      setForm({
        name: json.data.name ?? '',
        description: json.data.description ?? '',
        phone: json.data.phone ?? '',
        email: json.data.email ?? '',
        address: json.data.address ?? '',
        avg_prep_time_min: String(json.data.avg_prep_time_min ?? 30),
        min_order_amount: String(json.data.min_order_amount ?? 0),
      })
      setHours(json.data.opening_hours ?? {})
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/merchant/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        avg_prep_time_min: parseInt(form.avg_prep_time_min),
        min_order_amount: parseFloat(form.min_order_amount),
        opening_hours: hours,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleDay = (day: string) => {
    setHours(prev => {
      if (prev[day]) {
        const next = { ...prev }
        delete next[day]
        return next
      }
      return { ...prev, [day]: { open: '08:00', close: '22:00' } }
    })
  }

  const updateHour = (day: string, field: 'open' | 'close', value: string) => {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
  if (!merchant) return <div className="p-6 text-zinc-500">No se encontró tu comercio.</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Configuración</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Datos generales */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
          <h2 className="font-semibold text-zinc-900">Datos del comercio</h2>
          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-1">Nombre</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-1">Descripción</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Teléfono</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-1">Dirección</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Tiempo prep. promedio (min)</label>
              <input type="number" min="0" value={form.avg_prep_time_min} onChange={e => setForm(f => ({ ...f, avg_prep_time_min: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Pedido mínimo (Bs.)</label>
              <input type="number" min="0" step="0.5" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Horarios */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            <h2 className="font-semibold text-zinc-900">Horarios de apertura</h2>
          </div>
          <div className="space-y-2">
            {DAYS.map(day => (
              <div key={day.key} className="flex items-center gap-3">
                <label className="flex items-center gap-2 w-28 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={!!hours[day.key]}
                    onChange={() => toggleDay(day.key)}
                    className="rounded"
                  />
                  {day.label}
                </label>
                {hours[day.key] ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={hours[day.key].open}
                      onChange={e => updateHour(day.key, 'open', e.target.value)}
                      className={inputCls + ' w-32'}
                    />
                    <span className="text-zinc-400 text-sm">a</span>
                    <input
                      type="time"
                      value={hours[day.key].close}
                      onChange={e => updateHour(day.key, 'close', e.target.value)}
                      className={inputCls + ' w-32'}
                    />
                  </div>
                ) : (
                  <span className="text-zinc-400 text-sm">Cerrado</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}

const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 bg-white'
