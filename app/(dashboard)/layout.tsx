import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const role      = profile?.role      ?? 'admin'
  const fullName  = profile?.full_name ?? ''
  const email     = user.email          ?? ''

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar role={role as 'admin' | 'dispatcher' | 'rider' | 'customer'} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header name={fullName} email={email} role={role} userId={user.id} />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
