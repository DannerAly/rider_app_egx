'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Users, Map,
  BarChart2, Settings, Package2, Store, DollarSign, Ticket, UserCog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

type UserRole = 'admin' | 'dispatcher' | 'rider' | 'customer' | 'merchant'

const ADMIN_NAV = [
  { href: '/admin',            label: 'Resumen',    icon: LayoutDashboard, exact: true },
  { href: '/admin/orders',     label: 'Pedidos',    icon: Package },
  { href: '/admin/riders',     label: 'Riders',     icon: Users },
  { href: '/admin/merchants',  label: 'Comercios',  icon: Store },
  { href: '/admin/users',      label: 'Usuarios',   icon: UserCog },
  { href: '/admin/zones',      label: 'Zonas',      icon: Map },
  { href: '/admin/reports',    label: 'Reportes',   icon: BarChart2 },
  { href: '/admin/finance',    label: 'Finanzas',   icon: DollarSign },
  { href: '/admin/coupons',    label: 'Cupones',    icon: Ticket },
]

const DISPATCHER_NAV = [
  { href: '/dispatcher',        label: 'Operaciones', icon: LayoutDashboard, exact: true },
  { href: '/dispatcher/orders', label: 'Pedidos',     icon: Package },
  { href: '/dispatcher/riders', label: 'Riders',      icon: Users },
]

const ADMIN_BOTTOM    = [{ href: '/admin/settings', label: 'Ajustes', icon: Settings }]
const DISPATCHER_BOTTOM: typeof ADMIN_BOTTOM = []

const ROLE_NAV: Record<string, typeof ADMIN_NAV> = {
  admin: ADMIN_NAV, dispatcher: DISPATCHER_NAV,
}
const ROLE_BOTTOM: Record<string, typeof ADMIN_BOTTOM> = {
  admin: ADMIN_BOTTOM, dispatcher: DISPATCHER_BOTTOM,
}
const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador', dispatcher: 'Dispatcher',
}

function NavItem({
  href, label, icon: Icon, exact, pathname,
}: { href: string; label: string; icon: React.ElementType; exact?: boolean; pathname: string }) {
  const isActive = exact ? pathname === href : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
      )}
      <Icon className={cn(
        'w-4 h-4 flex-shrink-0 transition-colors',
        isActive ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-300'
      )} />
      {label}
    </Link>
  )
}

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname   = usePathname()
  const navItems   = ROLE_NAV[role]    ?? ADMIN_NAV
  const bottomItems = ROLE_BOTTOM[role] ?? []

  return (
    <aside className="w-60 flex-shrink-0 bg-zinc-950 flex flex-col border-r border-zinc-800/60">

      {/* Logo / branding */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-zinc-800/60">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/30">
          <Package2 className="w-4 h-4 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-white font-bold text-sm tracking-tight">rider-egx</p>
          <p className="text-zinc-600 text-xs">{ROLE_LABEL[role] ?? role}</p>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavItem key={item.href} {...item} pathname={pathname} />
        ))}
      </nav>

      {/* Bottom navigation (settings, etc.) */}
      {bottomItems.length > 0 && (
        <>
          <Separator className="bg-zinc-800/60" />
          <nav className="px-3 py-3 space-y-0.5">
            {bottomItems.map(item => (
              <NavItem key={item.href} {...item} pathname={pathname} />
            ))}
          </nav>
        </>
      )}
    </aside>
  )
}
