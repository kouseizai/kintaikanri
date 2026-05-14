'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_LEAVES, DEMO_PROFILES } from '@/lib/demo'
import Header from '@/components/Header'

type LeaveKind = 'full' | 'morning' | 'afternoon'
interface LeaveRecord {
  id: string
  date: string
  reason: string | null
  kind: LeaveKind
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
}

const STATUS = {
  pending:  { label: '審査中', cls: 'badge-amber' },
  approved: { label: '承認済', cls: 'badge-green' },
  rejected: { label: '却下',   cls: 'badge-red' },
}

const KIND_LABEL: Record<LeaveKind, string> = {
  full: '全日', morning: '午前半休', afternoon: '午後半休',
}

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

function getDemoRole(): 'employee' | 'owner' | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/demo_role=(employee|owner)/)
  return m ? (m[1] as 'employee' | 'owner') : null
}

function daysConsumed(kind: LeaveKind) {
  return kind === 'full' ? 1 : 0.5
}

export default function LeavesPage() {
  const [demoMode, setDemoMode] = useState(false)
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [annualDays, setAnnualDays] = useState(20)
  const [date, setDate] = useState('')
  const [kind, setKind] = useState<LeaveKind>('full')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (isDemoMode()) {
      setDemoMode(true)
      setLeaves(DEMO_LEAVES as LeaveRecord[])
      const role = getDemoRole() ?? 'employee'
      setAnnualDays(DEMO_PROFILES[role].annual_leave_days)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: lv }, { data: pr }] = await Promise.all([
      supabase.from('leaves').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('profiles').select('annual_leave_days').eq('id', user.id).single(),
    ])
    setLeaves(lv ?? [])
    setAnnualDays(pr?.annual_leave_days ?? 20)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const usedDays = leaves
    .filter(l => l.status === 'approved')
    .reduce((s, l) => s + daysConsumed(l.kind), 0)
  const pendingDays = leaves
    .filter(l => l.status === 'pending')
    .reduce((s, l) => s + daysConsumed(l.kind), 0)
  const remainingDays = annualDays - usedDays

  function validate(): string | null {
    if (!date) return '取得希望日を入力してください'
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
    if (date < todayStr) return '過去の日付は申請できません'
    const dup = leaves.some(l => l.date === date && l.status !== 'rejected')
    if (dup) return 'この日付には既に申請があります'
    if (remainingDays - daysConsumed(kind) < 0) return '有給残日数が足りません'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setMessage({ text: err, type: 'error' }); return }
    setLoading(true); setMessage(null)
    if (demoMode) {
      const newLeave: LeaveRecord = {
        id: `demo-${Date.now()}`, date, kind, reason: reason.trim() || null,
        status: 'pending', rejection_reason: null,
      }
      setLeaves(prev => [newLeave, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      setMessage({ text: '有給申請を提出しました！', type: 'success' })
      setDate(''); setReason(''); setKind('full'); setLoading(false); return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('leaves').insert({ user_id: user.id, date, kind, reason: reason.trim() || null })
    if (error) { setMessage({ text: 'エラーが発生しました', type: 'error' }) }
    else { setMessage({ text: '有給申請を提出しました！', type: 'success' }); setDate(''); setReason(''); setKind('full'); await fetchData() }
    setLoading(false)
  }

  async function cancelLeave(id: string) {
    if (!confirm('この申請を取り消しますか？')) return
    if (demoMode) {
      setLeaves(prev => prev.filter(l => l.id !== id))
      setMessage({ text: '申請を取り消しました', type: 'success' })
      return
    }
    await supabase.from('leaves').delete().eq('id', id)
    setMessage({ text: '申請を取り消しました', type: 'success' })
    await fetchData()
  }

  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="有給申請" subtitle="有給休暇の申請と残日数管理" />
      <div className="px-4 md:px-8 pb-10 space-y-6">

        {message && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ background: message.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: message.type === 'success' ? 'var(--green-text)' : 'var(--red-text)', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
            <span>{message.type === 'success' ? '✓' : '!'}</span>
            {message.text}
          </div>
        )}

        {/* 残数 大カード */}
        <div className="rounded-xl p-6" style={{ background: '#141414' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>有給休暇残日数</p>
              <p className="text-5xl font-bold text-white tabular-nums">
                {remainingDays}
                <span className="text-base font-normal ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>/ {annualDays} 日</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <p className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>付与</p>
              <p className="text-sm font-semibold text-white tabular-nums">{annualDays} 日</p>
            </div>
            <div>
              <p className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>消化済</p>
              <p className="text-sm font-semibold text-white tabular-nums">{usedDays} 日</p>
            </div>
            <div>
              <p className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>申請中</p>
              <p className="text-sm font-semibold text-white tabular-nums">{pendingDays} 日</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>有給申請を提出</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>取得希望日</label>
              <input type="date" value={date} min={todayStr} onChange={(e) => setDate(e.target.value)} required className="field-input" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>取得区分</label>
              <div className="grid grid-cols-3 gap-2">
                {(['full', 'morning', 'afternoon'] as const).map(k => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    className="py-2.5 rounded-md text-sm font-medium transition-all"
                    style={{
                      background: kind === k ? '#111827' : 'var(--border-light)',
                      color: kind === k ? '#ffffff' : 'var(--text-secondary)',
                    }}>
                    {KIND_LABEL[k]}
                    <span className="block text-[10px] mt-0.5 opacity-70">
                      {k === 'full' ? '1.0 日' : '0.5 日'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>理由（任意）</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="理由を入力してください（任意）" className="field-input resize-none" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '申請中...' : '申請する'}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>申請履歴</h2>
          {leaves.length === 0 ? (
            <div className="card py-16 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>申請履歴がありません</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {leaves.map((l, i) => {
                const st = STATUS[l.status]
                return (
                  <div key={l.id} className="flex items-center gap-3 px-4 md:px-6 py-4 table-row" style={{ borderBottom: i < leaves.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {new Date(l.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                        </p>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}>
                          {KIND_LABEL[l.kind]}
                        </span>
                      </div>
                      {l.reason && <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{l.reason}</p>}
                      {l.status === 'rejected' && l.rejection_reason && (
                        <p className="text-xs mt-1" style={{ color: 'var(--red-text)' }}>却下理由: {l.rejection_reason}</p>
                      )}
                    </div>
                    <span className={`badge ${st.cls} flex-shrink-0`}>{st.label}</span>
                    {l.status === 'pending' && (
                      <button onClick={() => cancelLeave(l.id)} className="text-xs font-medium px-2 py-1 rounded-md flex-shrink-0" style={{ color: 'var(--red-text)', background: 'var(--red-bg)' }}>取消</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
