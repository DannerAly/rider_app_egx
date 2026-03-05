import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'merchant' && profile?.role !== 'admin') {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {children}
    </div>
  )
}
