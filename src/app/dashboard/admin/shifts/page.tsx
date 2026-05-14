'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_ALL_SHIFTS, DEMO_ALL_EMPLOYEES } from '@/lib/demo'
import Header from '@/components/Header'

interface ShiftWithUser {
  id: string
  user_id?: string
  date: string
  start_time: string
  end_time: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  profiles: { name: string } | null
}

const STATUS = {
  pending:  { label: '申請中', cls: 'badge-amber' },
  approved: { label: '確定',   cls: 'badge-green' },
  rejected: { label: '却下',   cls: 'badge-red' },
}

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

export default function AdminShiftsPage() {
  const [demoMode, setDemoMode] = useState(false)
  const [shifts, setShifts] = useState<ShiftWithUser[]>([])
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [filterUser, setFilterUser] = useState('')
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClient()

  const fetchShifts = useCallback(async () => {
    if (isDemoMode()) {
      setDemoMode(true)
      setShifts(DEMO_ALL_SHIFTS as ShiftWithUser[])
      setProfiles(DEMO_ALL_EMPLOYEES.filter(e => e.is_active).map(e => ({ id: e.id, name: e.name })))
      return
    }
    const [{ data: sd }, { data: pd }] = await Promise.all([
      supabase.from('shifts').select('*, profiles(name)').order('date', { ascending: false }),
      supabase.from('profiles').select('id, name').eq('role', 'employee').order('name'),
    ])
    setShifts((sd ?? []) as unknown as ShiftWithUser[])
    setProfiles(pd ?? [])
  }, [supabase])

  useEffect(() => { fetchShifts() }, [fetchShifts])

  async function approve(id: string) {
    if (demoMode) {
      setShifts(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' as const, rejection_reason: null } : s))
      return
    }
    setLoading(id)
    await supabase.from('shifts').update({ status: 'approved', rejection_reason: null }).eq('id', id)
    await fetchShifts()
    setLoading(null)
  }

  async function reject(id: string) {
    const reason = window.prompt('却下理由を入力してください（任意）')
    if (reason === null) return
    if (demoMode) {
      setShifts(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected' as const, rejection_reason: reason || null } : s))
      return
    }
    setLoading(id)
    await supabase.from('shifts').update({ status: 'rejected', rejection_reason: reason || null }).eq('id', id)
    await fetchShifts()
    setLoading(null)
  }

  async function bulkApprove() {
    const pendingIds = filtered.filter(s => s.status === 'pending').map(s => s.id)
    if (pendingIds.length === 0) return
    if (!confirm(`表示中の申請中 ${pendingIds.length}件 をまとめて承認しますか？`)) return
    if (demoMode) {
      setShifts(prev => prev.map(s => pendingIds.includes(s.id) ? { ...s, status: 'approved' as const, rejection_reason: null } : s))
      return
    }
    await supabase.from('shifts').update({ status: 'approved', rejection_reason: null }).in('id', pendingIds)
    await fetchShifts()
  }

  const filtered = useMemo(() => {
    return shifts.filter(s => {
      if (filter !== 'all' && s.status !== filter) return false
      if (filterUser && s.user_id !== filterUser && !(demoMode && s.profiles?.name === profiles.find(p => p.id === filterUser)?.name)) return false
      if (filterMonth && !s.date.startsWith(filterMonth)) return false
      return true
    })
  }, [shifts, filter, filterUser, filterMonth, demoMode, profiles])

  const pendingCount = shifts.filter(s => s.status === 'pending').length

  // 月選択用
  const monthOptions = useMemo(() => {
    const now = new Date()
    const arr: string[] = []
    for (let i = -2; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return arr
  }, [])

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="シフト管理" subtitle="申請の承認・却下" />
      <div className="px-4 md:px-8 pb-10 space-y-6">

        {/* Summary */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>承認待ちシフト</p>
              <p className="text-3xl font-bold" style={{ color: pendingCount > 0 ? '#b45309' : 'var(--text-primary)' }}>{pendingCount}<span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>件</span></p>
            </div>
            {pendingCount > 0 && filtered.filter(s => s.status === 'pending').length > 1 && (
              <button onClick={bulkApprove} className="btn-primary text-sm">表示中を一括承認</button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="field-input w-auto text-sm">
            <option value="">全従業員</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="field-input w-auto text-sm">
            <option value="">全期間</option>
            {monthOptions.map(m => {
              const [y, mm] = m.split('-')
              return <option key={m} value={m}>{y}年{parseInt(mm)}月</option>
            })}
          </select>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--border-light)' }}>
            {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${filter === f ? 'tab-active' : 'tab-inactive'}`}>
                {f === 'pending' ? '申請中' : f === 'approved' ? '確定' : f === 'rejected' ? '却下' : '全て'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>該当するシフトがありません</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {filtered.map((s, i) => {
              const st = STATUS[s.status]
              const initials = s.profiles?.name?.slice(0, 1) ?? '?'
              return (
                <div key={s.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div className="flex items-start gap-3 px-4 md:px-6 py-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5" style={{ background: '#f3f4f6', color: 'var(--text-secondary)' }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.profiles?.name ?? '不明'}</p>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(s.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })}
                        　{s.start_time.slice(0,5)} 〜 {s.end_time.slice(0,5)}
                      </p>
                      {s.status === 'rejected' && s.rejection_reason && (
                        <p className="text-xs mt-1" style={{ color: 'var(--red-text)' }}>却下理由: {s.rejection_reason}</p>
                      )}
                    </div>
                    {s.status === 'pending' && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => approve(s.id)} disabled={loading === s.id}
                          className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50"
                          style={{ background: 'var(--green-text)' }}>
                          {loading === s.id ? '...' : '承認'}
                        </button>
                        <button onClick={() => reject(s.id)} disabled={loading === s.id}
                          className="px-2.5 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
                          style={{ background: 'var(--red-bg)', color: 'var(--red-text)' }}>
                          却下
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
