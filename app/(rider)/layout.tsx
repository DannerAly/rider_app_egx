import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InstallBanner from '@/components/pwa/InstallBanner'

export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <InstallBanner />
      {children}
    </div>
  )
}
