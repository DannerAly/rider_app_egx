'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, ShieldCheck, Bike, Store, User, Radio, Power, PowerOff } from 'lucide-react'

const ROLES = [
  { value: 'admin',      label: 'Admin',      icon: ShieldCheck, color: 'text-red-600' },
  { value: 'dispatcher',  label: 'Dispatcher',  icon: Radio,       color: 'text-purple-600' },
  { value: 'merchant',   label: 'Merchant',   icon: Store,       color: 'text-amber-600' },
  { value: 'rider',      label: 'Rider',      icon: Bike,        color: 'text-blue-600' },
  { value: 'customer',   label: 'Customer',   icon: User,        color: 'text-zinc-600' },
] as const

interface UserActionsProps {
  userId: string
  userName: string
  currentRole: string
  isActive: boolean
}

export default function UserActions({ userId, userName, currentRole, isActive }: UserActionsProps) {
  const router = useRouter()
  const [confirmRole, setConfirmRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRoleChange() {
    if (!confirmRole) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: confirmRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Error al cambiar rol')
      } else {
        router.refresh()
      }
    } finally {
      setLoading(false)
      setConfirmRole(null)
    }
  }

  async function toggleActive() {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    if (res.ok) router.refresh()
  }

  const targetRole = ROLES.find(r => r.value === confirmRole)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
            <MoreHorizontal className="w-4 h-4 text-zinc-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-zinc-400">Cambiar rol</DropdownMenuLabel>
          {ROLES.filter(r => r.value !== currentRole).map(r => (
            <DropdownMenuItem key={r.value} onClick={() => setConfirmRole(r.value)}>
              <r.icon className={`w-4 h-4 mr-2 ${r.color}`} />
              {r.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleActive}>
            {isActive ? (
              <><PowerOff className="w-4 h-4 mr-2 text-red-500" />Desactivar</>
            ) : (
              <><Power className="w-4 h-4 mr-2 text-emerald-500" />Activar</>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!confirmRole} onOpenChange={() => setConfirmRole(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar cambio de rol</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            Cambiar a <strong>{userName}</strong> de{' '}
            <span className="font-semibold">{currentRole}</span> a{' '}
            <span className={`font-semibold ${targetRole?.color}`}>{targetRole?.label}</span>?
          </p>
          {(confirmRole === 'merchant' || confirmRole === 'rider' || confirmRole === 'customer') && (
            <p className="text-xs text-zinc-400 mt-1">
              Se creará automáticamente un registro de {targetRole?.label?.toLowerCase()} con datos por defecto.
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmRole(null)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleRoleChange} disabled={loading}>
              {loading ? 'Cambiando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
