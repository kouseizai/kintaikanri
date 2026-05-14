import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DEMO_PROFILES } from '@/lib/demo'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const demoRole = cookieStore.get('demo_role')?.value as 'employee' | 'owner' | undefined

  let profile: { name: string; role: string }

  if (demoRole) {
    // デモモード: クッキーからプロフィールを取得
    profile = DEMO_PROFILES[demoRole]
  } else {
    // 本番モード: Supabase認証
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data } = await supabase.from('profiles').select('name, role').eq('id', user.id).single()
    if (!data) redirect('/login')
    profile = data
  }

  return (
    <div className="flex h-full min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* デスクトップ: サイドバー */}
      <div className="hidden md:block">
        <Sidebar role={profile.role} name={profile.name} />
      </div>

      {/* メインコンテンツ — モバイルは pb-safe でボトムナビ分を確保 */}
      <div className="flex-1 flex flex-col overflow-hidden pb-nav md:pb-0">
        {children}
      </div>

      {/* モバイル: ボトムナビ */}
      <BottomNav role={profile.role} />
    </div>
  )
}
