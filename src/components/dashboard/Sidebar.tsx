'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Users,
  Map,
  BarChart2,
  Package2,
} from 'lucide-react'
import { clsx } from 'clsx'

type UserRole = 'admin' | 'dispatcher' | 'rider' | 'customer'

const ADMIN_NAV = [
  { href: '/admin',          label: 'Resumen',   icon: LayoutDashboard, exact: true },
  { href: '/admin/orders',   label: 'Pedidos',   icon: Package },
  { href: '/admin/riders',   label: 'Riders',    icon: Users },
  { href: '/admin/zones',    label: 'Zonas',     icon: Map },
  { href: '/admin/reports',  label: 'Reportes',  icon: BarChart2 },
]

const DISPATCHER_NAV = [
  { href: '/dispatcher',         label: 'Operaciones', icon: LayoutDashboard, exact: true },
  { href: '/dispatcher/orders',  label: 'Pedidos',     icon: Package },
  { href: '/dispatcher/riders',  label: 'Riders',      icon: Users },
]

const ROLE_NAV: Record<string, typeof ADMIN_NAV> = {
  admin:      ADMIN_NAV,
  dispatcher: DISPATCHER_NAV,
}

const ROLE_LABEL: Record<string, string> = {
  admin:      'Administrador',
  dispatcher: 'Dispatcher',
}

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const navItems = ROLE_NAV[role] ?? ADMIN_NAV

  return (
    <aside className="w-60 flex-shrink-0 bg-zinc-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-zinc-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Package2 className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-semibold text-base tracking-tight">
          rider-egx
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Rol */}
      <div className="px-5 py-4 border-t border-zinc-800">
        <span className="text-xs text-zinc-600 uppercase tracking-widest font-medium">
          {ROLE_LABEL[role] ?? role}
        </span>
      </div>
    </aside>
  )
}
