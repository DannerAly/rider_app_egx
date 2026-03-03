'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LogOut, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import NotificationsBell from './NotificationsBell'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const PAGE_TITLES: Record<string, [string, string]> = {
  '/admin':              ['Dashboard',   'Resumen'],
  '/admin/orders':       ['Dashboard',   'Pedidos'],
  '/admin/riders':       ['Dashboard',   'Riders'],
  '/admin/zones':        ['Dashboard',   'Zonas'],
  '/admin/reports':      ['Dashboard',   'Reportes'],
  '/admin/settings':     ['Dashboard',   'Ajustes'],
  '/dispatcher':         ['Dispatcher',  'Operaciones'],
  '/dispatcher/orders':  ['Dispatcher',  'Pedidos'],
  '/dispatcher/riders':  ['Dispatcher',  'Riders'],
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador', dispatcher: 'Dispatcher', rider: 'Rider',
}

interface HeaderProps { name: string; email: string; role: string; userId: string }

export default function Header({ name, email, role, userId }: HeaderProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [section, page] = PAGE_TITLES[pathname] ?? ['Panel', 'Inicio']
  const displayName     = name || email
  const initials        = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-zinc-200 px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-10">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-400 font-medium">{section}</span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
        <span className="text-zinc-900 font-semibold">{page}</span>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1">
        <NotificationsBell userId={userId} />

        <Separator orientation="vertical" className="h-5 mx-2" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-zinc-100 transition-colors outline-none ring-0">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-zinc-900 text-sm font-medium">{displayName}</p>
                <p className="text-zinc-500 text-xs">{ROLE_LABEL[role] ?? role}</p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal py-2">
              <p className="text-sm font-semibold text-zinc-900 truncate">{displayName}</p>
              <p className="text-xs text-zinc-500 truncate mt-0.5">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50 gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
