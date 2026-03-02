'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const PAGE_TITLES: Record<string, string> = {
  '/admin':              'Resumen',
  '/admin/orders':       'Pedidos',
  '/admin/riders':       'Riders',
  '/admin/zones':        'Zonas',
  '/admin/reports':      'Reportes',
  '/dispatcher':         'Operaciones',
  '/dispatcher/orders':  'Pedidos',
  '/dispatcher/riders':  'Riders',
}

interface HeaderProps {
  name:  string
  email: string
  role:  string
}

export default function Header({ name, email, role }: HeaderProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const title   = PAGE_TITLES[pathname] ?? 'Panel'
  const initial = (name || email)[0]?.toUpperCase() ?? '?'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between flex-shrink-0">
      <h1 className="text-zinc-900 font-semibold text-base">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Notificaciones */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        {/* Separador */}
        <div className="w-px h-5 bg-zinc-200 mx-1" />

        {/* Usuario */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initial}</span>
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-zinc-900 text-sm font-medium">{name || email}</p>
            <p className="text-zinc-400 text-xs capitalize">{role}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
