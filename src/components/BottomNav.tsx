'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface BottomNavProps { role: string }

function HomeIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}
function ClockIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function CalIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
function DocIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function PayIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}
function AdminIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

const employeeNav = [
  { href: '/dashboard',            label: 'ホーム', icon: HomeIcon },
  { href: '/dashboard/attendance', label: '打刻',   icon: ClockIcon },
  { href: '/dashboard/shifts',     label: 'シフト', icon: CalIcon },
  { href: '/dashboard/leaves',     label: '有給',   icon: DocIcon },
  { href: '/dashboard/payslip',    label: '明細',   icon: PayIcon },
]

const ownerEmployeeNav = [
  { href: '/dashboard',              label: 'ホーム', icon: HomeIcon },
  { href: '/dashboard/attendance',   label: '打刻',   icon: ClockIcon },
  { href: '/dashboard/shifts',       label: 'シフト', icon: CalIcon },
  { href: '/dashboard/leaves',       label: '有給',   icon: DocIcon },
  { href: '/dashboard/admin/shifts', label: '管理',   icon: AdminIcon },
]

function PeopleIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

const ownerAdminNav = [
  { href: '/dashboard',                 label: 'ホーム',   icon: HomeIcon },
  { href: '/dashboard/admin/employees', label: '従業員',   icon: PeopleIcon },
  { href: '/dashboard/admin/shifts',    label: 'シフト',   icon: CalIcon },
  { href: '/dashboard/admin/leaves',    label: '有給',     icon: DocIcon },
  { href: '/dashboard/admin/payslips',  label: '明細',     icon: PayIcon },
]

function UserIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()
  const isAdminPath = pathname.startsWith('/dashboard/admin')

  const items =
    role === 'owner'
      ? isAdminPath ? ownerAdminNav : ownerEmployeeNav
      : employeeNav

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: '#ffffff',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 py-2 flex-1 min-w-0"
              style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {item.icon(isActive)}
              <span
                className="text-center leading-none"
                style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0 }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* プロフィール */}
        <Link
          href="/dashboard/profile"
          className="flex flex-col items-center justify-center gap-1 py-2 px-3 flex-shrink-0"
          style={{ color: pathname.startsWith('/dashboard/profile') ? 'var(--text-primary)' : 'var(--text-muted)', borderLeft: '1px solid var(--border-light)' }}
        >
          {UserIcon(pathname.startsWith('/dashboard/profile'))}
          <span className="text-center leading-none" style={{ fontSize: 9, fontWeight: 600 }}>プロフィール</span>
        </Link>
      </div>
    </nav>
  )
}
