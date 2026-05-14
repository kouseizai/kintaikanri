'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_ALL_SHIFTS, DEMO_ALL_LEAVES, DEMO_ALL_PAYSLIPS } from '@/lib/demo'

interface SidebarProps { role: string; name: string }

const DashboardIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
const ClockIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" /></svg>
const TramIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><rect x="5" y="3" width="14" height="14" rx="2" /><path strokeLinecap="round" d="M5 11h14M12 3v8m-5 10l-1 2m12-2l1 2M9 14h.01M15 14h.01" /></svg>
const CalIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" /></svg>
const DocIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
const PayIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" d="M2 10h20M6 15h4" /></svg>
const PeopleIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
const ChecklistIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
const CheckCircleIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
const InvoiceIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m-6 4h3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
const FlagIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
const HistoryIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0z" /></svg>
const SettingsIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>

const employeeNav = [
  { href: '/dashboard',            label: 'ダッシュボード', Icon: DashboardIcon },
  { href: '/dashboard/attendance', label: '打刻',           Icon: ClockIcon },
  { href: '/dashboard/commute',    label: '交通費',         Icon: TramIcon },
  { href: '/dashboard/shifts',     label: 'シフト',         Icon: CalIcon },
  { href: '/dashboard/leaves',     label: '有給申請',       Icon: DocIcon },
  { href: '/dashboard/payslip',    label: '給料明細',       Icon: PayIcon },
]

type AdminBadgeKey = 'shifts' | 'leaves' | 'payslips'

const adminNav: { href: string; label: string; Icon: () => React.ReactElement; badge?: AdminBadgeKey }[] = [
  { href: '/dashboard/admin/employees', label: '従業員管理',      Icon: PeopleIcon },
  { href: '/dashboard/admin/shifts',    label: 'シフト管理',      Icon: ChecklistIcon, badge: 'shifts' },
  { href: '/dashboard/admin/leaves',    label: '有給管理',        Icon: CheckCircleIcon, badge: 'leaves' },
  { href: '/dashboard/admin/payslips',  label: '給料明細管理',     Icon: InvoiceIcon, badge: 'payslips' },
  { href: '/dashboard/admin/holidays',  label: '公休日カレンダー', Icon: FlagIcon },
  { href: '/dashboard/admin/logs',      label: '操作ログ',         Icon: HistoryIcon },
  { href: '/dashboard/admin/settings',  label: '会社設定',         Icon: SettingsIcon },
]

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

export default function Sidebar({ role, name }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [counts, setCounts] = useState<Record<AdminBadgeKey, number>>({ shifts: 0, leaves: 0, payslips: 0 })
  const supabase = createClient()

  const fetchCounts = useCallback(async () => {
    if (role !== 'owner') return
    if (isDemoMode()) {
      setCounts({
        shifts:   DEMO_ALL_SHIFTS.filter(s => s.status === 'pending').length,
        leaves:   DEMO_ALL_LEAVES.filter(l => l.status === 'pending').length,
        payslips: DEMO_ALL_PAYSLIPS.filter(p => !p.is_paid).length,
      })
      return
    }
    const [{ count: sc }, { count: lc }, { count: pc }] = await Promise.all([
      supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('payslips').select('*', { count: 'exact', head: true }).eq('is_paid', false),
    ])
    setCounts({ shifts: sc ?? 0, leaves: lc ?? 0, payslips: pc ?? 0 })
  }, [role, supabase])

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [fetchCounts, pathname])

  async function handleLogout() {
    if (document.cookie.includes('demo_role=')) { window.location.href = '/api/demo-logout'; return }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = name ? name.charAt(0) : '?'
  const totalPending = counts.shifts + counts.leaves + counts.payslips

  return (
    <div className="w-60 min-h-screen flex flex-col" style={{
      background: 'linear-gradient(180deg, #0a0a0a 0%, #131316 100%)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{
          background: 'linear-gradient(135deg, #fff 0%, #e5e7eb 100%)',
          boxShadow: '0 4px 12px rgba(255,255,255,0.1)',
        }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#0a0a0a" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-[15px] tracking-tight leading-none" style={{ color: '#f9fafb' }}>TIMECARD</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>勤怠管理システム</p>
        </div>
        {role === 'owner' && totalPending > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
            background: '#ef4444', color: '#fff', boxShadow: '0 0 8px rgba(239,68,68,0.5)',
          }}>{totalPending}</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          メニュー
        </p>
        <div className="space-y-0.5">
          {employeeNav.map((item) => {
            const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                }}>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{
                    background: 'linear-gradient(180deg, #818cf8, #6366f1)',
                  }} />
                )}
                <span style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)' }}><item.Icon /></span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {role === 'owner' && (
          <div className="mt-7">
            <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
              管理者
            </p>
            <div className="space-y-0.5">
              {adminNav.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const badgeCount = item.badge ? counts[item.badge] : 0
                return (
                  <Link key={item.href} href={item.href}
                    className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                    }}>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{
                        background: 'linear-gradient(180deg, #f59e0b, #f97316)',
                      }} />
                    )}
                    <span style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)' }}><item.Icon /></span>
                    <span className="flex-1">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
                        background: '#ef4444', color: '#fff', boxShadow: '0 0 8px rgba(239,68,68,0.4)',
                      }}>{badgeCount}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl" style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <Link href="/dashboard/profile" className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: '#f9fafb' }}>{name}</p>
              <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {role === 'owner' ? '管理者' : '従業員'}
              </p>
            </div>
          </Link>
          <button onClick={handleLogout} className="flex-shrink-0 p-1.5 rounded-md transition-colors hover:bg-white/5" title="ログアウト">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
