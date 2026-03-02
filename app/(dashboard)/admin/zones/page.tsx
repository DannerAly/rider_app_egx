'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Map, Plus, Trash2 } from 'lucide-react'

async function createZone(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('zones').insert({
    name:        formData.get('name') as string,
    description: formData.get('description') as string,
    color:       formData.get('color') as string,
  })
  revalidatePath('/admin/zones')
}

async function deleteZone(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('zones').delete().eq('id', formData.get('id') as string)
  revalidatePath('/admin/zones')
}

const COLORS = [
  { value: '#3B82F6', label: 'Azul' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#f97316', label: 'Naranja' },
  { value: '#a855f7', label: 'Violeta' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#eab308', label: 'Amarillo' },
]

export default async function ZonesPage() {
  const supabase = await createClient()
  const { data: zones } = await supabase
    .from('zones')
    .select('id, name, description, color, is_active, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-zinc-900 font-semibold text-lg">Zonas de cobertura</h2>
        <p className="text-zinc-500 text-sm mt-0.5">{zones?.length ?? 0} zonas registradas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario nueva zona */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h3 className="text-zinc-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva zona
          </h3>
          <form action={createZone} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Nombre *</label>
              <input
                name="name"
                required
                placeholder="Ej: Centro, Equipetrol, Plan 3000"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Descripción</label>
              <input
                name="description"
                placeholder="Descripción opcional"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1.5">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c, i) => (
                  <label key={c.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      value={c.value}
                      defaultChecked={i === 0}
                      className="sr-only"
                    />
                    <div
                      className="w-7 h-7 rounded-full border-2 border-white shadow ring-2 ring-transparent peer-checked:ring-blue-500 hover:scale-110 transition-transform"
                      style={{ background: c.value }}
                      title={c.label}
                    />
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="mt-1 bg-zinc-900 hover:bg-zinc-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
            >
              Crear zona
            </button>
          </form>
        </div>

        {/* Lista de zonas */}
        <div className="lg:col-span-2 space-y-3">
          {zones && zones.length > 0 ? (
            zones.map((zone: any) => (
              <div
                key={zone.id}
                className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white shadow"
                    style={{ background: zone.color }}
                  />
                  <div>
                    <p className="text-zinc-900 font-semibold text-sm">{zone.name}</p>
                    {zone.description && (
                      <p className="text-zinc-400 text-xs mt-0.5">{zone.description}</p>
                    )}
                  </div>
                </div>
                <form action={deleteZone}>
                  <input type="hidden" name="id" value={zone.id} />
                  <button
                    type="submit"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Eliminar zona"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-16">
              <Map className="w-8 h-8 text-zinc-300 mb-3" />
              <p className="text-zinc-500 font-medium">No hay zonas</p>
              <p className="text-zinc-400 text-sm mt-1">Crea la primera zona desde el formulario.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
