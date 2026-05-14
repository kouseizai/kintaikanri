import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'

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
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="flex h-full min-h-screen" style={{ background: '#f2f2f7' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar role={profile.role} name={profile.name} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <BottomNav role={profile.role} />
    </div>
  )
}
