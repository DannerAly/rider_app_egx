'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save, Settings, CheckCircle } from 'lucide-react'

interface Setting { key: string; value: string; label: string }

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [values,   setValues]   = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(({ data }) => {
      setSettings(data ?? [])
      setValues(Object.fromEntries((data ?? []).map((s: Setting) => [s.key, s.value])))
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const updates = Object.entries(values).map(([key, value]) => ({ key, value }))
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
    </div>
  )

  const tarifas  = settings.filter(s => ['base_fee', 'fee_per_km'].includes(s.key))
  const empresa  = settings.filter(s => ['company_name'].includes(s.key))

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-zinc-900 font-semibold text-lg">Ajustes</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Configura las tarifas y datos de tu empresa</p>
      </div>

      {/* Tarifas */}
      <Section icon={<Settings className="w-4 h-4" />} title="Tarifas de entrega">
        <p className="text-xs text-zinc-400 mb-4">
          Tarifa total = Tarifa base + (Tarifa por km × distancia)
        </p>
        {tarifas.map(s => (
          <div key={s.key} className="flex items-center gap-4 mb-4">
            <label className="text-sm text-zinc-600 w-44">{s.label}</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Bs.</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={values[s.key] ?? ''}
                onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                className="w-28 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        ))}
        <div className="mt-2 p-3 bg-zinc-50 rounded-lg text-xs text-zinc-500">
          Ejemplo: pedido de <strong>{Number(values['base_fee'] ?? 10).toFixed(2)}</strong> Bs. base +{' '}
          5 km × <strong>{Number(values['fee_per_km'] ?? 2).toFixed(2)}</strong> Bs./km ={' '}
          <strong>
            Bs. {(Number(values['base_fee'] ?? 10) + 5 * Number(values['fee_per_km'] ?? 2)).toFixed(2)}
          </strong>
        </div>
      </Section>

      {/* Empresa */}
      <Section icon={<Settings className="w-4 h-4" />} title="Datos de la empresa">
        {empresa.map(s => (
          <div key={s.key} className="flex items-center gap-4 mb-4">
            <label className="text-sm text-zinc-600 w-44">{s.label}</label>
            <input
              type="text"
              value={values[s.key] ?? ''}
              onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
              className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-blue-500"
            />
          </div>
        ))}
      </Section>

      {/* Guardar */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar ajustes'}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            Guardado
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-zinc-100">
        <span className="text-zinc-400">{icon}</span>
        <h3 className="text-zinc-800 font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}
