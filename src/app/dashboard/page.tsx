import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import {
  DEMO_PROFILES, DEMO_ATTENDANCE, DEMO_PAYSLIPS, DEMO_SHIFTS, DEMO_LEAVES,
  DEMO_ALL_SHIFTS, DEMO_ALL_LEAVES, DEMO_ALL_PAYSLIPS, DEMO_ADMIN_TODAY_ATTENDANCE,
} from '@/lib/demo'
import Header from '@/components/Header'
import Link from 'next/link'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const demoRole = cookieStore.get('demo_role')?.value as 'employee' | 'owner' | undefined

  const now = new Date()
  const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
  const [yearStr, monthStr] = todayStr.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)
  const greeting = now.getHours() < 12 ? 'おはようございます' : now.getHours() < 18 ? 'こんにちは' : 'お疲れさまです'

  // ─── オーナーダッシュボード ────────────────────────────────
  if (demoRole === 'owner' || (!demoRole && await getRole())) {
    const profile = demoRole ? DEMO_PROFILES.owner : await getProfile()
    const isOwner = profile.role === 'owner'
    if (!isOwner) return renderEmployee({ demoRole, todayStr, year, month, now, greeting })

    let pendingShifts: number
    let pendingLeaves: number
    let unpaidPayslips: number
    let employeeCount: number
    let todayAttendance: { name: string; clock_in: string | null; clock_out: string | null }[]
    let recentShifts: { id: string; date: string; start_time: string; end_time: string; profiles: { name: string } | null }[]
    let recentLeaves: { id: string; date: string; reason: string | null; profiles: { name: string } | null }[]

    if (demoRole) {
      pendingShifts = DEMO_ALL_SHIFTS.filter(s => s.status === 'pending').length
      pendingLeaves = DEMO_ALL_LEAVES.filter(l => l.status === 'pending').length
      unpaidPayslips = DEMO_ALL_PAYSLIPS.filter(p => !p.is_paid).length
      employeeCount = 3
      todayAttendance = DEMO_ADMIN_TODAY_ATTENDANCE
      recentShifts = DEMO_ALL_SHIFTS.filter(s => s.status === 'pending').slice(0, 3)
      recentLeaves = DEMO_ALL_LEAVES.filter(l => l.status === 'pending').slice(0, 3)
    } else {
      const supabase = await createClient()
      const [
        { count: sc }, { count: lc }, { count: pc }, { count: ec },
        { data: attData }, { data: shiftData }, { data: leaveData },
      ] = await Promise.all([
        supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('payslips').select('*', { count: 'exact', head: true }).eq('is_paid', false),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employee'),
        supabase.from('attendance').select('clock_in, clock_out, profiles(name)').eq('date', todayStr),
        supabase.from('shifts').select('id, date, start_time, end_time, profiles(name)').eq('status', 'pending').order('date').limit(3),
        supabase.from('leaves').select('id, date, reason, profiles(name)').eq('status', 'pending').order('date').limit(3),
      ])
      pendingShifts = sc ?? 0
      pendingLeaves = lc ?? 0
      unpaidPayslips = pc ?? 0
      employeeCount = ec ?? 0
      const pickProfile = (p: any) => Array.isArray(p) ? (p[0] ?? null) : (p ?? null)
      todayAttendance = (attData ?? []).map((r: any) => ({ name: pickProfile(r.profiles)?.name ?? '—', clock_in: r.clock_in, clock_out: r.clock_out }))
      recentShifts = (shiftData ?? []).map((s: any) => ({ id: s.id, date: s.date, start_time: s.start_time, end_time: s.end_time, profiles: pickProfile(s.profiles) }))
      recentLeaves = (leaveData ?? []).map((l: any) => ({ id: l.id, date: l.date, reason: l.reason, profiles: pickProfile(l.profiles) }))
    }

    const fmt = (ts: string | null) => ts
      ? new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      : null

    return (
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
        <Header title="管理ダッシュボード" subtitle={`${greeting}、${profile.name} さん`} />

        <div className="px-4 md:px-8 pb-10 space-y-8">

          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '承認待ちシフト', value: pendingShifts, unit: '件', href: '/dashboard/admin/shifts',   urgent: pendingShifts > 0 },
              { label: '承認待ち有給',   value: pendingLeaves, unit: '件', href: '/dashboard/admin/leaves',   urgent: pendingLeaves > 0 },
              { label: '未払い給与明細', value: unpaidPayslips, unit: '件', href: '/dashboard/admin/payslips', urgent: unpaidPayslips > 0 },
              { label: '従業員数',       value: employeeCount,  unit: '名', href: null,                        urgent: false },
            ].map((item) => (
              <div key={item.label} className="stat-card">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="text-3xl font-bold mb-1" style={{ color: item.urgent ? '#b45309' : 'var(--text-primary)' }}>
                  {item.value}
                  <span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{item.unit}</span>
                </p>
                {item.href && (
                  <Link href={item.href} className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    管理画面へ →
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* 今日の出勤状況 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>今日の出勤状況</h2>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
              </span>
            </div>
            <div className="card overflow-hidden">
              {todayAttendance.length === 0 ? (
                <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>本日の出勤記録はまだありません</div>
              ) : (
                todayAttendance.map((emp, i) => {
                  const ci = fmt(emp.clock_in)
                  const co = fmt(emp.clock_out)
                  const status = !ci ? 'absent' : !co ? 'working' : 'done'
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 md:px-6 py-3.5"
                      style={{ borderBottom: i < todayAttendance.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: '#f3f4f6', color: 'var(--text-secondary)' }}>
                        {emp.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{emp.name}</p>
                        {ci && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {ci} 出勤{co ? `　${co} 退勤` : ''}
                          </p>
                        )}
                      </div>
                      <span className={`badge ${status === 'done' ? 'badge-green' : status === 'working' ? 'badge-blue' : 'badge-gray'}`}>
                        {status === 'done' ? '退勤済' : status === 'working' ? '勤務中' : '未出勤'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 承認が必要な申請 */}
          {(recentShifts.length > 0 || recentLeaves.length > 0) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>承認が必要な申請</h2>
              </div>
              <div className="card overflow-hidden">
                {recentShifts.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 md:px-6 py-3.5"
                    style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: '#fffbeb', color: '#b45309' }}>
                      {s.profiles?.name?.slice(0, 1) ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.profiles?.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        シフト申請 — {new Date(s.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}　{s.start_time.slice(0,5)}〜{s.end_time.slice(0,5)}
                      </p>
                    </div>
                    <span className="badge badge-amber">申請中</span>
                  </div>
                ))}
                {recentLeaves.map((l, i) => (
                  <div key={l.id} className="flex items-center gap-3 px-4 md:px-6 py-3.5"
                    style={{ borderBottom: i < recentLeaves.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: '#fffbeb', color: '#b45309' }}>
                      {l.profiles?.name?.slice(0, 1) ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{l.profiles?.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        有給申請 — {new Date(l.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}{l.reason ? `　${l.reason}` : ''}
                      </p>
                    </div>
                    <span className="badge badge-amber">審査中</span>
                  </div>
                ))}
                <div className="px-4 md:px-6 py-3 flex justify-end gap-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <Link href="/dashboard/admin/shifts" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>シフト管理へ →</Link>
                  <Link href="/dashboard/admin/leaves" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>有給管理へ →</Link>
                </div>
              </div>
            </div>
          )}

          {/* 管理メニュー */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>管理メニュー</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { href: '/dashboard/admin/employees', label: '従業員管理',     desc: '追加・編集・退職処理' },
                { href: '/dashboard/admin/shifts',    label: 'シフト管理',     desc: '申請の承認・却下' },
                { href: '/dashboard/admin/leaves',    label: '有給管理',       desc: '有給申請の承認・却下' },
                { href: '/dashboard/admin/payslips',  label: '給料明細管理',   desc: '明細作成・支払い完了' },
                { href: '/dashboard/admin/holidays',  label: '公休日カレンダー', desc: '祝日・会社休日の管理' },
                { href: '/dashboard/admin/logs',      label: '操作ログ',       desc: '申請・承認・編集の履歴' },
                { href: '/dashboard/admin/settings',  label: '会社設定',       desc: '社名・労働時間・給与計算' },
              ].map((item) => (
                <Link key={item.href} href={item.href}
                  className="card p-5 flex flex-col gap-1.5 hover:shadow-md transition-shadow">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    )
  }

  return renderEmployee({ demoRole, todayStr, year, month, now, greeting })
}

// ─── ヘルパー（owner判定用、Server Component内で使用）────────
async function getRole() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    return data?.role === 'owner'
  } catch { return false }
}

async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase.from('profiles').select('name, role, base_salary').eq('id', user!.id).single()
  return data ?? { name: '', role: 'employee', base_salary: 0 }
}

// ─── 従業員ダッシュボード ─────────────────────────────────────
async function renderEmployee({ demoRole, todayStr, year, month, now, greeting }: {
  demoRole: 'employee' | 'owner' | undefined
  todayStr: string; year: number; month: number; now: Date; greeting: string
}) {
  let profile: { name: string; base_salary: number; role: string }
  let attendance: { clock_in: string | null; clock_out: string | null } | null
  let payslip: { net_salary: number | null; is_paid: boolean } | null
  let pendingShifts: number
  let pendingLeaves: number

  if (demoRole) {
    profile = DEMO_PROFILES[demoRole]
    attendance = DEMO_ATTENDANCE[0]
    payslip = DEMO_PAYSLIPS[0]
    pendingShifts = DEMO_SHIFTS.filter(s => s.status === 'pending').length
    pendingLeaves = DEMO_LEAVES.filter(l => l.status === 'pending').length
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [
      { data: profileData }, { data: attendanceData }, { data: payslipData },
      { count: shiftCount }, { count: leaveCount },
    ] = await Promise.all([
      supabase.from('profiles').select('name, base_salary, role').eq('id', user!.id).single(),
      supabase.from('attendance').select('*').eq('user_id', user!.id).eq('date', todayStr).maybeSingle(),
      supabase.from('payslips').select('*').eq('user_id', user!.id).eq('year', year).eq('month', month).maybeSingle(),
      supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('status', 'pending'),
      supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('status', 'pending'),
    ])
    profile = profileData ?? { name: '', base_salary: 0, role: 'employee' }
    attendance = attendanceData
    payslip = payslipData
    pendingShifts = shiftCount ?? 0
    pendingLeaves = leaveCount ?? 0
  }

  const clockInTime = attendance?.clock_in
    ? new Date(attendance.clock_in).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : null
  const clockOutTime = attendance?.clock_out
    ? new Date(attendance.clock_out).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="ダッシュボード" subtitle={`${greeting}、${profile.name} さん`} />
      <div className="px-4 md:px-10 pb-12 space-y-10">

        {/* Hero status card */}
        <div className="dark-card p-6 md:p-8 animate-in">
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
              <p className="numeric-xl text-6xl md:text-7xl mt-3 text-white">
                {now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="flex items-center gap-3 mt-4">
                {clockInTime ? (
                  <>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.18)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      {clockOutTime ? '退勤済' : '勤務中'}
                    </span>
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {clockInTime} 〜 {clockOutTime ?? '現在'}
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
                    未打刻
                  </span>
                )}
              </div>
            </div>
            <Link href="/dashboard/attendance" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]" style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
              color: '#0a0a0a',
              boxShadow: '0 8px 24px rgba(255,255,255,0.12)',
            }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              打刻画面へ
            </Link>
          </div>
        </div>

        {/* KPI grid */}
        <div>
          <p className="section-label mb-4">本日の状況</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label="出勤時刻" value={clockInTime ?? '--:--'} accent={attendance?.clock_in ? 'green' : 'gray'}
              hint={attendance?.clock_in ? '出勤済' : '未打刻'}
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />}
            />
            <KpiCard
              label="退勤時刻" value={clockOutTime ?? '--:--'} accent={attendance?.clock_out ? 'green' : 'gray'}
              hint={attendance?.clock_out ? '退勤済' : '勤務中'}
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />}
            />
            <KpiCard
              label="今月の給与（見込み）" value={`¥${(payslip?.net_salary ?? profile.base_salary ?? 0).toLocaleString()}`} accent="indigo"
              hint={payslip?.is_paid ? '支払済' : '計算中'}
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
            />
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <p className="section-label mb-4">クイックアクション</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/dashboard/attendance', label: '打刻する',   desc: '出退勤を記録',   icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { href: '/dashboard/shifts',     label: 'シフト申請', desc: '希望日を申請',   icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { href: '/dashboard/leaves',     label: '有給申請',   desc: '休暇を申請',     icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { href: '/dashboard/payslip',    label: '給料明細',   desc: '明細を確認',     icon: 'M9 7h6m-6 4h6m-6 4h3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="group card p-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                }}>
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--text-primary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Pending status */}
        <div>
          <p className="section-label mb-4">申請状況</p>
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 md:px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--amber-bg)' }}>
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--amber-text)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>シフト申請中</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold numeric-xl tabular-nums" style={{ color: pendingShifts > 0 ? 'var(--amber-text)' : 'var(--text-muted)' }}>
                  {pendingShifts}<span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>件</span>
                </span>
                <Link href="/dashboard/shifts" className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  確認 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 md:px-6 py-4">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--blue-bg)' }}>
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--blue-text)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>有給申請中</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold numeric-xl tabular-nums" style={{ color: pendingLeaves > 0 ? 'var(--blue-text)' : 'var(--text-muted)' }}>
                  {pendingLeaves}<span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>件</span>
                </span>
                <Link href="/dashboard/leaves" className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  確認 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function KpiCard({ label, value, hint, accent, icon }: {
  label: string
  value: string
  hint?: string
  accent: 'green' | 'gray' | 'indigo' | 'amber'
  icon: ReactNode
}) {
  const accentMap = {
    green:  { bg: 'var(--green-bg)',  fg: 'var(--green-text)',  pill: 'badge-green' },
    gray:   { bg: '#f3f4f6',          fg: '#6b7280',            pill: 'badge-gray' },
    indigo: { bg: 'var(--indigo-soft)', fg: 'var(--indigo)',    pill: 'badge-blue' },
    amber:  { bg: 'var(--amber-bg)',  fg: 'var(--amber-text)',  pill: 'badge-amber' },
  }[accent]

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accentMap.bg }}>
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: accentMap.fg }}>
            {icon}
          </svg>
        </div>
        {hint && <span className={`badge ${accentMap.pill}`}>{hint}</span>}
      </div>
      <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="numeric-xl text-3xl md:text-[32px]" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}
