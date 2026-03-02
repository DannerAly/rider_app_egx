import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RiderDashboard from './RiderDashboard'

export default async function RiderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'rider') redirect('/unauthorized')

  return <RiderDashboard riderId={user.id} name={profile?.full_name ?? 'Rider'} />
}
