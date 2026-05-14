'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_ALL_PAYSLIPS, DEMO_ALL_EMPLOYEES } from '@/lib/demo'
import Header from '@/components/Header'

interface PayslipWithUser {
  id: string
  user_id?: string
  year: number
  month: number
  base_salary: number
  commute_total: number
  deduction: number
  net_salary: number | null
  is_paid: boolean
  profiles: { name: string } | null
}
interface Profile { id: string; name: string; base_salary: number }

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

export default function AdminPayslipsPage() {
  const [demoMode, setDemoMode] = useState(false)
  const [payslips, setPayslips] = useState<PayslipWithUser[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showBulkCreate, setShowBulkCreate] = useState(false)
  const [editing, setEditing] = useState<PayslipWithUser | null>(null)
  const [filterUser, setFilterUser] = useState<string>('')
  const [filterYear, setFilterYear] = useState<number | ''>('')
  const [filterMonth, setFilterMonth] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const supabase = createClient()

  // create form state
  const [formUserId, setFormUserId] = useState('')
  const [formYear, setFormYear] = useState(new Date().getFullYear())
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1)
  const [formCommute, setFormCommute] = useState(0)
  const [formDeduction, setFormDeduction] = useState(0)
  const [commuteAuto, setCommuteAuto] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  // bulk create state
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear())
  const [bulkMonth, setBulkMonth] = useState(new Date().getMonth() + 1)
  const [bulkLoading, setBulkLoading] = useState(false)

  const autoCalcCommute = useCallback(async (userId: string, year: number, month: number) => {
    if (!userId || demoMode) return
    setCommuteAuto('計算中...')
    const mm = String(month).padStart(2, '0')
    const startDate = `${year}-${mm}-01`
    const endDate = `${year}-${mm}-31`
    const [{ data: commuteData }, { count: daysWorked }] = await Promise.all([
      supabase.from('commute').select('amount').eq('user_id', userId),
      supabase.from('attendance').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).gte('date', startDate).lte('date', endDate).not('clock_in', 'is', null),
    ])
    const dailyAmount = (commuteData ?? []).reduce((s, r) => s + r.amount, 0)
    const total = dailyAmount * (daysWorked ?? 0)
    setFormCommute(total)
    setCommuteAuto(`自動計算: ${daysWorked ?? 0}日 × ¥${dailyAmount.toLocaleString()} = ¥${total.toLocaleString()}`)
  }, [supabase, demoMode])

  const fetchData = useCallback(async () => {
    if (isDemoMode()) {
      setDemoMode(true)
      setPayslips(DEMO_ALL_PAYSLIPS as PayslipWithUser[])
      setProfiles(DEMO_ALL_EMPLOYEES.filter(e => e.is_active).map(e => ({ id: e.id, name: e.name, base_salary: e.base_salary })))
      return
    }
    const [{ data: psData }, { data: profilesData }] = await Promise.all([
      supabase.from('payslips').select('id, user_id, year, month, base_salary, commute_total, deduction, net_salary, is_paid, profiles(name)').order('year', { ascending: false }).order('month', { ascending: false }),
      supabase.from('profiles').select('id, name, base_salary').eq('role', 'employee').order('name'),
    ])
    setPayslips((psData ?? []) as unknown as PayslipWithUser[])
    setProfiles((profilesData ?? []) as Profile[])
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (formUserId) autoCalcCommute(formUserId, formYear, formMonth) }, [formUserId, formYear, formMonth, autoCalcCommute])

  async function togglePaid(p: PayslipWithUser) {
    if (demoMode) { setPayslips(prev => prev.map(x => x.id === p.id ? { ...x, is_paid: !x.is_paid } : x)); return }
    setLoading(p.id)
    await supabase.from('payslips').update({ is_paid: !p.is_paid }).eq('id', p.id)
    await fetchData()
    setLoading(null)
  }

  async function deletePayslip(p: PayslipWithUser) {
    if (!confirm(`${p.profiles?.name ?? '不明'} の ${p.year}年${p.month}月分の明細を削除しますか？`)) return
    if (demoMode) {
      setPayslips(prev => prev.filter(x => x.id !== p.id))
      setMessage({ text: '明細を削除しました', type: 'success' })
      return
    }
    setLoading(p.id)
    await supabase.from('payslips').delete().eq('id', p.id)
    setMessage({ text: '明細を削除しました', type: 'success' })
    await fetchData()
    setLoading(null)
  }

  async function saveEdit() {
    if (!editing) return
    const net = editing.base_salary + editing.commute_total - editing.deduction
    const updated = { ...editing, net_salary: net }
    if (demoMode) {
      setPayslips(prev => prev.map(p => p.id === editing.id ? updated : p))
      setEditing(null)
      setMessage({ text: '明細を更新しました', type: 'success' })
      return
    }
    setLoading(editing.id)
    await supabase.from('payslips').update({
      base_salary: editing.base_salary, commute_total: editing.commute_total,
      deduction: editing.deduction, net_salary: net,
    }).eq('id', editing.id)
    setEditing(null)
    setMessage({ text: '明細を更新しました', type: 'success' })
    await fetchData()
    setLoading(null)
  }

  async function createPayslip(e: React.FormEvent) {
    e.preventDefault()
    const dup = payslips.some(p => p.user_id === formUserId && p.year === formYear && p.month === formMonth)
    if (dup) { setMessage({ text: '同じ年月・従業員の明細が既に存在します', type: 'error' }); return }
    if (demoMode) {
      const profile = profiles.find(p => p.id === formUserId)
      if (!profile) return
      const net = profile.base_salary + formCommute - formDeduction
      const newOne: PayslipWithUser = {
        id: Date.now().toString(), user_id: formUserId, year: formYear, month: formMonth,
        base_salary: profile.base_salary, commute_total: formCommute,
        deduction: formDeduction, net_salary: net, is_paid: false,
        profiles: { name: profile.name },
      }
      setPayslips(prev => [newOne, ...prev])
      setShowCreate(false); setFormUserId(''); setFormCommute(0); setFormDeduction(0); setCommuteAuto(null)
      setMessage({ text: '明細を作成しました', type: 'success' })
      return
    }
    setCreateLoading(true)
    const profile = profiles.find(p => p.id === formUserId)
    if (!profile) return
    const net = profile.base_salary + formCommute - formDeduction
    await supabase.from('payslips').insert({ user_id: formUserId, year: formYear, month: formMonth, base_salary: profile.base_salary, commute_total: formCommute, deduction: formDeduction, net_salary: net })
    setShowCreate(false); setFormUserId(''); setFormCommute(0); setFormDeduction(0); setCommuteAuto(null)
    setMessage({ text: '明細を作成しました', type: 'success' })
    await fetchData(); setCreateLoading(false)
  }

  async function bulkCreate() {
    setBulkLoading(true); setMessage(null)
    const existing = payslips.filter(p => p.year === bulkYear && p.month === bulkMonth).map(p => p.user_id ?? '')
    const targets = profiles.filter(p => !existing.includes(p.id))
    if (targets.length === 0) { setMessage({ text: `${bulkYear}年${bulkMonth}月分は全員作成済みです`, type: 'error' }); setBulkLoading(false); return }

    if (demoMode) {
      const newOnes: PayslipWithUser[] = targets.map(p => ({
        id: `${Date.now()}-${p.id}`, user_id: p.id, year: bulkYear, month: bulkMonth,
        base_salary: p.base_salary, commute_total: 0, deduction: Math.round(p.base_salary * 0.2),
        net_salary: p.base_salary - Math.round(p.base_salary * 0.2), is_paid: false,
        profiles: { name: p.name },
      }))
      setPayslips(prev => [...newOnes, ...prev])
      setMessage({ text: `${targets.length}名分の明細を一括作成しました`, type: 'success' })
      setShowBulkCreate(false); setBulkLoading(false); return
    }

    // 本番: 各人の交通費自動計算
    const mm = String(bulkMonth).padStart(2, '0')
    const startDate = `${bulkYear}-${mm}-01`
    const endDate = `${bulkYear}-${mm}-31`
    const inserts = await Promise.all(targets.map(async (p) => {
      const [{ data: commute }, { count: days }] = await Promise.all([
        supabase.from('commute').select('amount').eq('user_id', p.id),
        supabase.from('attendance').select('*', { count: 'exact', head: true })
          .eq('user_id', p.id).gte('date', startDate).lte('date', endDate).not('clock_in', 'is', null),
      ])
      const dailyAmount = (commute ?? []).reduce((s, r) => s + r.amount, 0)
      const commuteTotal = dailyAmount * (days ?? 0)
      const deduction = Math.round(p.base_salary * 0.2)
      const net = p.base_salary + commuteTotal - deduction
      return { user_id: p.id, year: bulkYear, month: bulkMonth, base_salary: p.base_salary, commute_total: commuteTotal, deduction, net_salary: net }
    }))
    await supabase.from('payslips').insert(inserts)
    setMessage({ text: `${targets.length}名分の明細を一括作成しました`, type: 'success' })
    setShowBulkCreate(false)
    await fetchData()
    setBulkLoading(false)
  }

  const filtered = useMemo(() => {
    return payslips.filter(p => {
      if (filterUser && p.user_id !== filterUser) return false
      if (filterYear !== '' && p.year !== filterYear) return false
      if (filterMonth !== '' && p.month !== filterMonth) return false
      if (filterStatus === 'paid' && !p.is_paid) return false
      if (filterStatus === 'unpaid' && p.is_paid) return false
      return true
    })
  }, [payslips, filterUser, filterYear, filterMonth, filterStatus])

  const unpaidCount = payslips.filter(p => !p.is_paid).length
  const totalUnpaidAmount = payslips.filter(p => !p.is_paid).reduce((s, p) => s + (p.net_salary ?? 0), 0)
  const selectedProfile = profiles.find(p => p.id === formUserId)
  const previewNet = selectedProfile ? selectedProfile.base_salary + formCommute - formDeduction : 0

  const allYears = Array.from(new Set(payslips.map(p => p.year))).sort((a, b) => b - a)

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="給料明細管理" subtitle="明細の作成と支払い管理"
        action={
          <div className="flex gap-2">
            <button onClick={() => { setShowBulkCreate(!showBulkCreate); setShowCreate(false) }} className="btn-secondary text-sm">一括作成</button>
            <button onClick={() => { setShowCreate(!showCreate); setShowBulkCreate(false) }} className="btn-primary text-sm">+ 明細を作成</button>
          </div>
        } />
      <div className="px-4 md:px-8 pb-10 space-y-6">

        {message && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ background: message.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: message.type === 'success' ? 'var(--green-text)' : 'var(--red-text)', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
            <span>{message.type === 'success' ? '✓' : '!'}</span>
            {message.text}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>未払い明細</p>
            <p className="text-3xl font-bold" style={{ color: unpaidCount > 0 ? '#b45309' : 'var(--text-primary)' }}>{unpaidCount}<span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>件</span></p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>未払い合計</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>¥{totalUnpaidAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Bulk create form */}
        {showBulkCreate && (
          <div className="card p-6">
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>明細を一括作成</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>指定月の未作成分を全従業員分まとめて作成します（控除は基本給の20%で初期化）</p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>年</label>
                <input type="number" value={bulkYear} onChange={(e) => setBulkYear(parseInt(e.target.value))} className="field-input" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>月</label>
                <input type="number" min="1" max="12" value={bulkMonth} onChange={(e) => setBulkMonth(parseInt(e.target.value))} className="field-input" />
              </div>
              <button onClick={bulkCreate} disabled={bulkLoading} className="btn-primary">{bulkLoading ? '作成中...' : '一括作成'}</button>
              <button onClick={() => setShowBulkCreate(false)} className="btn-secondary">閉じる</button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="card p-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>新規給料明細作成</h3>
            <form onSubmit={createPayslip} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>従業員</label>
                <select value={formUserId} onChange={(e) => setFormUserId(e.target.value)} required className="field-input">
                  <option value="">選択してください</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}（基本給 ¥{p.base_salary.toLocaleString()}）</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>年</label>
                  <input type="number" value={formYear} onChange={(e) => setFormYear(parseInt(e.target.value))} className="field-input" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>月</label>
                  <input type="number" min="1" max="12" value={formMonth} onChange={(e) => setFormMonth(parseInt(e.target.value))} className="field-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>交通費（円）</label>
                  <input type="number" min="0" value={formCommute} onChange={(e) => { setFormCommute(parseInt(e.target.value) || 0); setCommuteAuto(null) }} className="field-input" />
                  {commuteAuto && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{commuteAuto}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>控除額（円）</label>
                  <input type="number" min="0" value={formDeduction} onChange={(e) => setFormDeduction(parseInt(e.target.value) || 0)} className="field-input" />
                </div>
              </div>
              {selectedProfile && (
                <div className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: '#f3f4f6' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>差引支給額（見込み）</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>¥{previewNet.toLocaleString()}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={createLoading} className="btn-primary flex-1 disabled:opacity-50">
                  {createLoading ? '作成中...' : '作成する'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary px-5">キャンセル</button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="field-input w-auto text-sm">
            <option value="">全従業員</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value === '' ? '' : parseInt(e.target.value))} className="field-input w-auto text-sm">
            <option value="">全期間</option>
            {allYears.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value === '' ? '' : parseInt(e.target.value))} className="field-input w-auto text-sm">
            <option value="">全月</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
          </select>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--border-light)' }}>
            {(['all', 'unpaid', 'paid'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${filterStatus === s ? 'tab-active' : 'tab-inactive'}`}>
                {s === 'all' ? '全て' : s === 'unpaid' ? '未払' : '支払済'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>該当する明細がありません</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {filtered.map((p, i) => (
              <div key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div className="flex items-center gap-3 px-4 md:px-6 py-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: '#f3f4f6', color: 'var(--text-secondary)' }}>
                    {p.profiles?.name?.slice(0, 1) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.profiles?.name ?? '不明'}</p>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>— {p.year}年 {p.month}月</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>基本給 ¥{p.base_salary.toLocaleString()}</span>
                      <span>+交通費 ¥{p.commute_total.toLocaleString()}</span>
                      <span style={{ color: 'var(--red-text)' }}>-控除 ¥{p.deduction.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>¥{(p.net_salary ?? 0).toLocaleString()}</p>
                    <span className={`badge ${p.is_paid ? 'badge-green' : 'badge-amber'} mt-1`}>{p.is_paid ? '支払済' : '未払い'}</span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditing(p)} className="text-xs font-medium px-2 py-1.5 rounded-md" style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}>編集</button>
                    <button onClick={() => togglePaid(p)} disabled={loading === p.id} className="text-xs font-medium px-2 py-1.5 rounded-md disabled:opacity-50"
                      style={{ background: p.is_paid ? 'var(--border-light)' : 'var(--green-text)', color: p.is_paid ? 'var(--text-secondary)' : '#fff' }}>
                      {loading === p.id ? '...' : (p.is_paid ? '取消' : '支払')}
                    </button>
                    <button onClick={() => deletePayslip(p)} className="text-xs font-medium px-2 py-1.5 rounded-md" style={{ background: 'var(--red-bg)', color: 'var(--red-text)' }}>削除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setEditing(null)}>
          <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>明細を編集</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{editing.profiles?.name} — {editing.year}年{editing.month}月</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>基本給（円）</label>
                <input type="number" min="0" value={editing.base_salary} onChange={(e) => setEditing({ ...editing, base_salary: parseInt(e.target.value) || 0 })} className="field-input" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>交通費（円）</label>
                <input type="number" min="0" value={editing.commute_total} onChange={(e) => setEditing({ ...editing, commute_total: parseInt(e.target.value) || 0 })} className="field-input" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>控除額（円）</label>
                <input type="number" min="0" value={editing.deduction} onChange={(e) => setEditing({ ...editing, deduction: parseInt(e.target.value) || 0 })} className="field-input" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: '#f3f4f6' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>差引支給額</span>
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>¥{(editing.base_salary + editing.commute_total - editing.deduction).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="flex-1 btn-secondary">キャンセル</button>
              <button onClick={saveEdit} disabled={loading === editing.id} className="flex-1 btn-primary">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
