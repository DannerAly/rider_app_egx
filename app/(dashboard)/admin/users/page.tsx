import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Users, Search, ShieldCheck, Bike, Store, User, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import UserActions from './UserActions'

const ROLE_FILTERS = [
  { value: '',           label: 'Todos' },
  { value: 'admin',      label: 'Admins' },
  { value: 'dispatcher', label: 'Dispatchers' },
  { value: 'merchant',   label: 'Merchants' },
  { value: 'rider',      label: 'Riders' },
  { value: 'customer',   label: 'Customers' },
]

const ROLE_BADGE: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  admin:      { label: 'Admin',      className: 'bg-red-50 text-red-700 border-red-200',        icon: ShieldCheck },
  dispatcher: { label: 'Dispatcher', className: 'bg-purple-50 text-purple-700 border-purple-200', icon: Radio },
  merchant:   { label: 'Merchant',   className: 'bg-amber-50 text-amber-700 border-amber-200',  icon: Store },
  rider:      { label: 'Rider',      className: 'bg-blue-50 text-blue-700 border-blue-200',     icon: Bike },
  customer:   { label: 'Customer',   className: 'bg-zinc-50 text-zinc-700 border-zinc-200',     icon: User },
}

interface PageProps {
  searchParams: Promise<{ role?: string; search?: string }>
}

export default async function UsersPage({ searchParams }: PageProps) {
  const { role = '', search = '' } = await searchParams
  const supabase = await createClient()
  const admin = createAdminClient()

  // Query profiles
  let query = admin
    .from('profiles')
    .select('id, full_name, phone, role, is_active, avatar_url, created_at')
    .order('created_at', { ascending: false })

  if (role) query = query.eq('role', role)
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const [{ data: profiles }, { data: { users: authUsers } }] = await Promise.all([
    query,
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailMap = new Map(authUsers.map(u => [u.id, u.email]))

  let users = (profiles ?? []).map(p => ({
    ...p,
    email: emailMap.get(p.id) ?? null,
  }))

  // Client-side email search filter
  if (search) {
    const q = search.toLowerCase()
    users = users.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  }

  const counts = {
    total:    users.length,
    admin:    users.filter(u => u.role === 'admin').length,
    rider:    users.filter(u => u.role === 'rider').length,
    merchant: users.filter(u => u.role === 'merchant').length,
    customer: users.filter(u => u.role === 'customer').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-zinc-900 font-bold text-xl">Usuarios</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            {counts.total} registrados ·{' '}
            <span className="text-red-600 font-medium">{counts.admin} admins</span> ·{' '}
            <span className="text-blue-600 font-medium">{counts.rider} riders</span> ·{' '}
            <span className="text-amber-600 font-medium">{counts.merchant} merchants</span> ·{' '}
            <span className="text-zinc-600 font-medium">{counts.customer} customers</span>
          </p>
        </div>
      </div>

      {/* Search */}
      <form className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          name="search"
          type="text"
          defaultValue={search}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
        />
        {role && <input type="hidden" name="role" value={role} />}
      </form>

      {/* Role filters */}
      <div className="flex gap-1.5 flex-wrap">
        {ROLE_FILTERS.map(f => {
          const href = f.value
            ? `/admin/users?role=${f.value}${search ? `&search=${search}` : ''}`
            : `/admin/users${search ? `?search=${search}` : ''}`
          return (
            <a
              key={f.value}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                role === f.value
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
              )}
            >
              {f.label}
            </a>
          )
        })}
      </div>

      {/* Users list */}
      {users.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((u: any) => {
            const initials = (u.full_name ?? '?')
              .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            const roleBadge = ROLE_BADGE[u.role] ?? ROLE_BADGE.customer
            const RoleIcon = roleBadge.icon

            return (
              <Card key={u.id} className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-11 h-11">
                        <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-900 text-white text-sm font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-zinc-900 font-semibold text-sm leading-tight truncate">
                          {u.full_name ?? 'Sin nombre'}
                        </p>
                        <p className="text-zinc-500 text-xs mt-0.5 truncate">
                          {u.email ?? 'Sin email'}
                        </p>
                      </div>
                    </div>
                    <UserActions
                      userId={u.id}
                      userName={u.full_name ?? 'Usuario'}
                      currentRole={u.role}
                      isActive={u.is_active ?? true}
                    />
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className={cn('text-xs gap-1', roleBadge.className)}>
                      <RoleIcon className="w-3 h-3" />
                      {roleBadge.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        u.is_active !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      )}
                    >
                      {u.is_active !== false ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  <Separator className="mb-3" />

                  <div className="space-y-1.5 text-sm">
                    {u.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 text-xs">Teléfono</span>
                        <span className="text-zinc-700 text-xs">{u.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-xs">Registrado</span>
                      <span className="text-zinc-700 text-xs">
                        {new Date(u.created_at).toLocaleDateString('es', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-zinc-400" />
            </div>
            <p className="text-zinc-700 font-semibold">No hay usuarios</p>
            <p className="text-zinc-400 text-sm mt-1">
              {search ? 'No se encontraron resultados para tu búsqueda.' : 'Aún no hay usuarios registrados.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
