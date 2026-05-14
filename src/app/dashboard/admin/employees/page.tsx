'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_ALL_EMPLOYEES } from '@/lib/demo'
import Header from '@/components/Header'

interface Employee {
  id: string
  name: string
  email: string
  base_salary: number
  annual_leave_days: number
  hired_at: string | null
  is_active: boolean
}

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

export default function AdminEmployeesPage() {
  const [demoMode, setDemoMode] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetchEmployees = useCallback(async () => {
    if (isDemoMode()) {
      setDemoMode(true)
      setEmployees(DEMO_ALL_EMPLOYEES as Employee[])
      return
    }
    const { data } = await supabase.from('profiles')
      .select('id, name, base_salary, annual_leave_days, hired_at, is_active')
      .eq('role', 'employee')
      .order('name')
    // emailはauth.usersから取得が必要なため、ここではname/idのみ
    setEmployees((data ?? []).map((d: any) => ({ ...d, email: '' })) as Employee[])
  }, [supabase])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  async function saveEmployee(emp: Employee) {
    setLoading(true); setMessage(null)
    if (demoMode) {
      setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e))
      setEditing(null)
      setMessage({ text: '従業員情報を更新しました', type: 'success' })
      setLoading(false); return
    }
    const { error } = await supabase.from('profiles').update({
      name: emp.name, base_salary: emp.base_salary,
      annual_leave_days: emp.annual_leave_days, hired_at: emp.hired_at,
      is_active: emp.is_active,
    }).eq('id', emp.id)
    if (error) setMessage({ text: 'エラーが発生しました', type: 'error' })
    else { setMessage({ text: '従業員情報を更新しました', type: 'success' }); setEditing(null); await fetchEmployees() }
    setLoading(false)
  }

  async function createEmployee(form: Omit<Employee, 'id'> & { password?: string }) {
    setLoading(true); setMessage(null)
    if (demoMode) {
      const newEmp: Employee = { ...form, id: `demo-${Date.now()}` }
      setEmployees(prev => [...prev, newEmp].sort((a, b) => a.name.localeCompare(b.name, 'ja')))
      setShowCreate(false)
      setMessage({ text: '従業員を追加しました', type: 'success' })
      setLoading(false); return
    }
    // 本番モードではメール送信が必要なため、UIガイドのみ表示
    setMessage({ text: '本番モードでの新規追加はSupabase Authでのユーザー作成後にprofilesテーブルに追加してください', type: 'error' })
    setLoading(false)
  }

  async function toggleActive(emp: Employee) {
    if (!confirm(emp.is_active ? `${emp.name} を無効化しますか？（退職扱い）` : `${emp.name} を有効化しますか？`)) return
    await saveEmployee({ ...emp, is_active: !emp.is_active })
  }

  async function deleteEmployee(emp: Employee) {
    if (!confirm(`${emp.name} のデータを完全に削除しますか？\n打刻・申請・明細データも全て削除されます。この操作は取り消せません。`)) return
    if (demoMode) {
      setEmployees(prev => prev.filter(e => e.id !== emp.id))
      setMessage({ text: '従業員を削除しました', type: 'success' })
      return
    }
    // 本番では関連データのカスケード削除が必要
    setMessage({ text: '本番削除はSupabase管理画面から実施してください', type: 'error' })
  }

  const filtered = employees
    .filter(e => showInactive || e.is_active)
    .filter(e => !search || e.name.includes(search) || (e.email ?? '').includes(search))

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="従業員管理" subtitle="従業員情報の追加・編集"
        action={
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">
            + 従業員を追加
          </button>
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>在籍中</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{employees.filter(e => e.is_active).length}<span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>名</span></p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>退職済</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-muted)' }}>{employees.filter(e => !e.is_active).length}<span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>名</span></p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>月間総基本給</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>¥{employees.filter(e => e.is_active).reduce((s, e) => s + e.base_salary, 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Filter / Search */}
        <div className="flex flex-wrap gap-3 items-center">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="名前・メールで検索"
            className="field-input flex-1 min-w-[200px]" />
          <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="w-4 h-4" />
            退職者も表示
          </label>
        </div>

        {/* Create form */}
        {showCreate && <CreateEmployeeForm onSubmit={createEmployee} onCancel={() => setShowCreate(false)} loading={loading} demoMode={demoMode} />}

        {/* List */}
        {filtered.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>該当する従業員がいません</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {filtered.map((emp, i) => (
              <div key={emp.id} className="flex items-center gap-3 px-4 md:px-6 py-4" style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none', opacity: emp.is_active ? 1 : 0.5 }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: '#f3f4f6', color: 'var(--text-secondary)' }}>
                  {emp.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{emp.name}</p>
                    {!emp.is_active && <span className="badge badge-gray">退職済</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {emp.email && <span>{emp.email}</span>}
                    <span>基本給 ¥{emp.base_salary.toLocaleString()}</span>
                    <span>有給 {emp.annual_leave_days}日/年</span>
                    {emp.hired_at && <span>入社 {new Date(emp.hired_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric' })}</span>}
                  </div>
                </div>
                <button onClick={() => setEditing(emp)} className="text-xs font-medium px-3 py-1.5 rounded-md flex-shrink-0" style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}>編集</button>
                <button onClick={() => toggleActive(emp)} className="text-xs font-medium px-3 py-1.5 rounded-md flex-shrink-0" style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}>
                  {emp.is_active ? '無効化' : '有効化'}
                </button>
                <button onClick={() => deleteEmployee(emp)} className="text-xs font-medium px-3 py-1.5 rounded-md flex-shrink-0" style={{ background: 'var(--red-bg)', color: 'var(--red-text)' }}>削除</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setEditing(null)}>
          <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>従業員情報を編集</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>名前</label>
                <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="field-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>基本給（円）</label>
                  <input type="number" min="0" value={editing.base_salary} onChange={(e) => setEditing({ ...editing, base_salary: parseInt(e.target.value) || 0 })} className="field-input" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>有給日数/年</label>
                  <input type="number" min="0" max="40" value={editing.annual_leave_days} onChange={(e) => setEditing({ ...editing, annual_leave_days: parseInt(e.target.value) || 0 })} className="field-input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>入社日</label>
                <input type="date" value={editing.hired_at ?? ''} onChange={(e) => setEditing({ ...editing, hired_at: e.target.value || null })} className="field-input" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="flex-1 btn-secondary">キャンセル</button>
              <button onClick={() => saveEmployee(editing)} disabled={loading} className="flex-1 btn-primary">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CreateEmployeeForm({ onSubmit, onCancel, loading, demoMode }: {
  onSubmit: (form: Omit<Employee, 'id'> & { password?: string }) => void
  onCancel: () => void
  loading: boolean
  demoMode: boolean
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [baseSalary, setBaseSalary] = useState(250000)
  const [annualDays, setAnnualDays] = useState(20)
  const [hiredAt, setHiredAt] = useState(new Date().toISOString().split('T')[0])

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>新規従業員を追加</h3>
      <form onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name, email, password, base_salary: baseSalary, annual_leave_days: annualDays, hired_at: hiredAt, is_active: true })
      }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>名前</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="field-input" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>メールアドレス</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required={!demoMode} className="field-input" />
          </div>
        </div>
        {!demoMode && (
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>初期パスワード（8文字以上）</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="field-input" />
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>基本給（円）</label>
            <input type="number" min="0" value={baseSalary} onChange={(e) => setBaseSalary(parseInt(e.target.value) || 0)} className="field-input" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>有給日数/年</label>
            <input type="number" min="0" max="40" value={annualDays} onChange={(e) => setAnnualDays(parseInt(e.target.value) || 0)} className="field-input" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>入社日</label>
            <input type="date" value={hiredAt} onChange={(e) => setHiredAt(e.target.value)} className="field-input" />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 btn-secondary">キャンセル</button>
          <button type="submit" disabled={loading} className="flex-1 btn-primary">追加</button>
        </div>
      </form>
    </div>
  )
}
