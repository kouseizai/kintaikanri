'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_ALL_LEAVES, DEMO_ALL_EMPLOYEES } from '@/lib/demo'
import { logAction } from '@/lib/audit'
import Header from '@/components/Header'

type LeaveKind = 'full' | 'morning' | 'afternoon'
interface LeaveWithUser {
  id: string
  user_id?: string
  date: string
  reason: string | null
  kind: LeaveKind
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  profiles: { name: string } | null
}

const STATUS = {
  pending:  { label: '審査中', cls: 'badge-amber' },
  approved: { label: '承認済', cls: 'badge-green' },
  rejected: { label: '却下',   cls: 'badge-red' },
}

const KIND_LABEL: Record<LeaveKind, string> = { full: '全日', morning: '午前半休', afternoon: '午後半休' }

function daysOf(kind: LeaveKind) { return kind === 'full' ? 1 : 0.5 }

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

export default function AdminLeavesPage() {
  const [demoMode, setDemoMode] = useState(false)
  const [leaves, setLeaves] = useState<LeaveWithUser[]>([])
  const [employees, setEmployees] = useState<{ id: string; name: string; annual_leave_days: number }[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [filterUser, setFilterUser] = useState('')
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClient()

  const fetchLeaves = useCallback(async () => {
    if (isDemoMode()) {
      setDemoMode(true)
      setLeaves(DEMO_ALL_LEAVES as LeaveWithUser[])
      setEmployees(DEMO_ALL_EMPLOYEES.filter(e => e.is_active).map(e => ({ id: e.id, name: e.name, annual_leave_days: e.annual_leave_days })))
      return
    }
    const [{ data: ld }, { data: ed }] = await Promise.all([
      supabase.from('leaves').select('*, profiles(name)').order('date', { ascending: false }),
      supabase.from('profiles').select('id, name, annual_leave_days').eq('role', 'employee').order('name'),
    ])
    setLeaves((ld ?? []) as unknown as LeaveWithUser[])
    setEmployees(ed ?? [])
  }, [supabase])

  useEffect(() => { fetchLeaves() }, [fetchLeaves])

  // 各従業員の有給残数を計算（承認済のみで計算）
  const balanceByUserName = useMemo(() => {
    const m: Record<string, { annual: number; used: number; pending: number }> = {}
    employees.forEach(e => { m[e.name] = { annual: e.annual_leave_days, used: 0, pending: 0 } })
    leaves.forEach(l => {
      const name = l.profiles?.name
      if (!name || !m[name]) return
      if (l.status === 'approved') m[name].used += daysOf(l.kind)
      if (l.status === 'pending')  m[name].pending += daysOf(l.kind)
    })
    return m
  }, [leaves, employees])

  async function approve(l: LeaveWithUser) {
    const name = l.profiles?.name
    const bal = name ? balanceByUserName[name] : null
    if (bal && bal.annual - bal.used - daysOf(l.kind) < 0) {
      if (!confirm(`${name} の有給残日数が不足します（残${bal.annual - bal.used}日、申請${daysOf(l.kind)}日）。それでも承認しますか？`)) return
    }
    if (demoMode) {
      setLeaves(prev => prev.map(x => x.id === l.id ? { ...x, status: 'approved' as const, rejection_reason: null } : x))
      await logAction(supabase, { entityType: 'leave', entityId: l.id, action: 'approved', targetName: name ?? null, detail: { date: l.date, kind: l.kind } })
      return
    }
    setLoading(l.id)
    await supabase.from('leaves').update({ status: 'approved', rejection_reason: null }).eq('id', l.id)
    await logAction(supabase, { entityType: 'leave', entityId: l.id, action: 'approved', targetName: name ?? null, detail: { date: l.date, kind: l.kind } })
    await fetchLeaves()
    setLoading(null)
  }

  async function reject(l: LeaveWithUser) {
    const reason = window.prompt('却下理由を入力してください（任意）')
    if (reason === null) return
    const name = l.profiles?.name
    if (demoMode) {
      setLeaves(prev => prev.map(x => x.id === l.id ? { ...x, status: 'rejected' as const, rejection_reason: reason || null } : x))
      await logAction(supabase, { entityType: 'leave', entityId: l.id, action: 'rejected', targetName: name ?? null, detail: { rejection_reason: reason || null, date: l.date, kind: l.kind } })
      return
    }
    setLoading(l.id)
    await supabase.from('leaves').update({ status: 'rejected', rejection_reason: reason || null }).eq('id', l.id)
    await logAction(supabase, { entityType: 'leave', entityId: l.id, action: 'rejected', targetName: name ?? null, detail: { rejection_reason: reason || null, date: l.date, kind: l.kind } })
    await fetchLeaves()
    setLoading(null)
  }

  const filtered = useMemo(() => {
    return leaves.filter(l => {
      if (filter !== 'all' && l.status !== filter) return false
      if (filterUser && !(l.user_id === filterUser || (demoMode && l.profiles?.name === employees.find(e => e.id === filterUser)?.name))) return false
      if (filterMonth && !l.date.startsWith(filterMonth)) return false
      return true
    })
  }, [leaves, filter, filterUser, filterMonth, demoMode, employees])

  const pendingCount = leaves.filter(l => l.status === 'pending').length

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
      <Header title="有給管理" subtitle="有給申請の承認・却下と残日数管理" />
      <div className="px-4 md:px-8 pb-10 space-y-6">

        {/* Summary */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>承認待ち有給申請</p>
              <p className="text-3xl font-bold" style={{ color: pendingCount > 0 ? '#b45309' : 'var(--text-primary)' }}>{pendingCount}<span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>件</span></p>
            </div>
          </div>
        </div>

        {/* 従業員別有給残数サマリー */}
        {employees.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>従業員別 有給残数</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {employees.map(e => {
                const b = balanceByUserName[e.name] ?? { annual: e.annual_leave_days, used: 0, pending: 0 }
                const remaining = b.annual - b.used
                return (
                  <div key={e.id} className="stat-card">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{e.name}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: remaining <= 3 ? '#b45309' : 'var(--text-primary)' }}>
                      {remaining}<span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>/ {b.annual}日</span>
                    </p>
                    {b.pending > 0 && (
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>申請中 {b.pending}日</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="field-input w-auto text-sm">
            <option value="">全従業員</option>
            {employees.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                {f === 'pending' ? '審査中' : f === 'approved' ? '承認済' : f === 'rejected' ? '却下' : '全て'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>該当する有給申請がありません</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {filtered.map((l, i) => {
              const st = STATUS[l.status]
              const initials = l.profiles?.name?.slice(0, 1) ?? '?'
              const bal = l.profiles?.name ? balanceByUserName[l.profiles.name] : null
              const remaining = bal ? bal.annual - bal.used : null
              return (
                <div key={l.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div className="flex items-start gap-3 px-4 md:px-6 py-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5" style={{ background: '#f3f4f6', color: 'var(--text-secondary)' }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{l.profiles?.name ?? '不明'}</p>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}>{KIND_LABEL[l.kind]}</span>
                        {l.status === 'pending' && remaining !== null && (
                          <span className="text-xs" style={{ color: remaining < daysOf(l.kind) ? 'var(--red-text)' : 'var(--text-muted)' }}>
                            残 {remaining}日
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(l.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })}
                      </p>
                      {l.reason && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{l.reason}</p>}
                      {l.status === 'rejected' && l.rejection_reason && (
                        <p className="text-xs mt-1" style={{ color: 'var(--red-text)' }}>却下理由: {l.rejection_reason}</p>
                      )}
                    </div>
                    {l.status === 'pending' && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => approve(l)} disabled={loading === l.id}
                          className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50"
                          style={{ background: 'var(--green-text)' }}>
                          {loading === l.id ? '...' : '承認'}
                        </button>
                        <button onClick={() => reject(l)} disabled={loading === l.id}
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
