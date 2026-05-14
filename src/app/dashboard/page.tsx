import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [
    { data: attendance },
    { data: profile },
    { data: payslip },
    { count: pendingShifts },
    { count: pendingLeaves },
  ] = await Promise.all([
    supabase.from('attendance').select('*').eq('user_id', user!.id).eq('date', today).maybeSingle(),
    supabase.from('profiles').select('name, base_salary, role').eq('id', user!.id).single(),
    supabase.from('payslips').select('*').eq('user_id', user!.id).eq('year', year).eq('month', month).maybeSingle(),
    supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('status', 'pending'),
    supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('status', 'pending'),
  ])

  const clockInTime = attendance?.clock_in
    ? new Date(attendance.clock_in).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    : null
  const clockOutTime = attendance?.clock_out
    ? new Date(attendance.clock_out).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    : null

  const greeting = now.getHours() < 12 ? 'おはようございます' : now.getHours() < 18 ? 'こんにちは' : 'お疲れさまです'

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f2f2f7' }}>
      <Header title="ダッシュボード" subtitle={`${greeting}、${profile?.name ?? ''} さん`} />

      <div className="px-8 pb-10 space-y-6">

        {/* Today attendance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Clock In */}
          <div className="rounded-3xl p-6 shadow-sm" style={{ background: attendance?.clock_in ? 'linear-gradient(135deg, #007aff, #5856d6)' : 'white' }}>
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: attendance?.clock_in ? 'rgba(255,255,255,0.2)' : 'rgba(0,122,255,0.1)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: attendance?.clock_in ? 'white' : '#007aff' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              {attendance?.clock_in && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}>出勤済</span>
              )}
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: attendance?.clock_in ? 'rgba(255,255,255,0.7)' : '#8e8e93' }}>出勤時刻</p>
            <p className="text-4xl font-bold tracking-tight" style={{ color: attendance?.clock_in ? 'white' : '#1c1c1e' }}>
              {clockInTime ?? '--:--'}
            </p>
          </div>

          {/* Clock Out */}
          <div className="rounded-3xl p-6 shadow-sm" style={{ background: attendance?.clock_out ? 'linear-gradient(135deg, #34c759, #30d158)' : 'white' }}>
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: attendance?.clock_out ? 'rgba(255,255,255,0.2)' : 'rgba(52,199,89,0.1)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: attendance?.clock_out ? 'white' : '#34c759' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              {attendance?.clock_out && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}>退勤済</span>
              )}
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: attendance?.clock_out ? 'rgba(255,255,255,0.7)' : '#8e8e93' }}>退勤時刻</p>
            <p className="text-4xl font-bold tracking-tight" style={{ color: attendance?.clock_out ? 'white' : '#1c1c1e' }}>
              {clockOutTime ?? '--:--'}
            </p>
          </div>

          {/* Salary */}
          <div className="rounded-3xl p-6 shadow-sm" style={{ background: 'linear-gradient(135deg, #ff9500, #ff6b00)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}>
                {payslip?.is_paid ? '支払済' : '今月'}
              </span>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>今月の給与（見込み）</p>
            <p className="text-3xl font-bold text-white tracking-tight">
              ¥{(payslip?.net_salary ?? profile?.base_salary ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h3 className="text-lg font-bold mb-3" style={{ color: '#1c1c1e' }}>クイックアクション</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/dashboard/attendance', label: '打刻する', icon: '⏱', color: '#007aff', bg: 'rgba(0,122,255,0.1)' },
              { href: '/dashboard/shifts', label: 'シフト申請', icon: '📅', color: '#5856d6', bg: 'rgba(88,86,214,0.1)' },
              { href: '/dashboard/leaves', label: '有給申請', icon: '🌿', color: '#34c759', bg: 'rgba(52,199,89,0.1)' },
              { href: '/dashboard/payslip', label: '給料明細', icon: '💴', color: '#ff9500', bg: 'rgba(255,149,0,0.1)' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 card-hover"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: item.bg }}>
                  {item.icon}
                </div>
                <span className="text-sm font-semibold text-center" style={{ color: '#1c1c1e' }}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Pending status */}
        <div>
          <h3 className="text-lg font-bold mb-3" style={{ color: '#1c1c1e' }}>申請状況</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(88,86,214,0.1)' }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#5856d6' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#8e8e93' }}>シフト申請中</p>
                <p className="text-3xl font-bold" style={{ color: '#5856d6' }}>{pendingShifts ?? 0}<span className="text-sm font-normal ml-1" style={{ color: '#8e8e93' }}>件</span></p>
              </div>
              <Link href="/dashboard/shifts" className="ml-auto text-sm font-semibold" style={{ color: '#007aff' }}>確認 →</Link>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(52,199,89,0.1)' }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#34c759' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#8e8e93' }}>有給申請中</p>
                <p className="text-3xl font-bold" style={{ color: '#34c759' }}>{pendingLeaves ?? 0}<span className="text-sm font-normal ml-1" style={{ color: '#8e8e93' }}>件</span></p>
              </div>
              <Link href="/dashboard/leaves" className="ml-auto text-sm font-semibold" style={{ color: '#007aff' }}>確認 →</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
