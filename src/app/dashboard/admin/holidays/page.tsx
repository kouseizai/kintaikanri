'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_HOLIDAYS } from '@/lib/demo'
import Header from '@/components/Header'

interface Holiday {
  id: string
  date: string
  name: string
  kind: 'public' | 'company'
}

const KIND_LABEL = { public: '祝日', company: '会社休日' }

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

export default function AdminHolidaysPage() {
  const [demoMode, setDemoMode] = useState(false)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'public' | 'company'>('company')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const supabase = createClient()

  const fetchHolidays = useCallback(async () => {
    if (isDemoMode()) {
      setDemoMode(true)
      setHolidays([...DEMO_HOLIDAYS].sort((a, b) => a.date.localeCompare(b.date)))
      return
    }
    const { data } = await supabase.from('holidays').select('*').order('date')
    setHolidays((data ?? []) as Holiday[])
  }, [supabase])

  useEffect(() => { fetchHolidays() }, [fetchHolidays])

  async function addHoliday(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !name) { setMessage({ text: '日付と名称を入力してください', type: 'error' }); return }
    if (holidays.some(h => h.date === date)) { setMessage({ text: 'この日付は既に登録されています', type: 'error' }); return }
    setLoading(true); setMessage(null)
    if (demoMode) {
      setHolidays(prev => [...prev, { id: `demo-${Date.now()}`, date, name, kind }].sort((a, b) => a.date.localeCompare(b.date)))
      setDate(''); setName(''); setMessage({ text: '休日を追加しました', type: 'success' })
      setLoading(false); return
    }
    const { error } = await supabase.from('holidays').insert({ date, name, kind })
    if (error) setMessage({ text: 'エラーが発生しました', type: 'error' })
    else { setDate(''); setName(''); setMessage({ text: '休日を追加しました', type: 'success' }); await fetchHolidays() }
    setLoading(false)
  }

  async function deleteHoliday(id: string) {
    if (!confirm('この休日を削除しますか？')) return
    if (demoMode) {
      setHolidays(prev => prev.filter(h => h.id !== id))
      return
    }
    await supabase.from('holidays').delete().eq('id', id)
    await fetchHolidays()
  }

  const filtered = useMemo(() => holidays.filter(h => h.date.startsWith(String(filterYear))), [holidays, filterYear])
  const availableYears = useMemo(() => {
    const set = new Set(holidays.map(h => parseInt(h.date.slice(0, 4))))
    set.add(new Date().getFullYear())
    return Array.from(set).sort((a, b) => b - a)
  }, [holidays])

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="公休日カレンダー" subtitle="祝日・会社休日の管理" />
      <div className="px-4 md:px-8 pb-10 space-y-6 max-w-3xl">

        {message && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ background: message.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: message.type === 'success' ? 'var(--green-text)' : 'var(--red-text)', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
            <span>{message.type === 'success' ? '✓' : '!'}</span>
            {message.text}
          </div>
        )}

        {/* 追加フォーム */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>休日を追加</h2>
          <form onSubmit={addHoliday} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>日付</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="field-input" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>名称</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 創立記念日" required className="field-input" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>種別</label>
                <select value={kind} onChange={(e) => setKind(e.target.value as 'public' | 'company')} className="field-input">
                  <option value="public">祝日</option>
                  <option value="company">会社休日</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? '追加中...' : '追加'}
            </button>
          </form>
        </div>

        {/* 年フィルタ */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>年で絞り込み</span>
          <select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} className="field-input w-auto text-sm">
            {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length}件</span>
        </div>

        {/* 一覧 */}
        {filtered.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>この年の休日は登録されていません</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {filtered.map((h, i) => (
              <div key={h.id} className="flex items-center gap-3 px-4 md:px-6 py-3.5" style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div className="w-12 text-center flex-shrink-0">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(h.date).toLocaleDateString('ja-JP', { month: 'numeric' })}</p>
                  <p className="text-lg font-bold leading-none" style={{ color: 'var(--red-text)' }}>{parseInt(h.date.slice(8))}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(h.date).toLocaleDateString('ja-JP', { weekday: 'short' })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{h.name}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: h.kind === 'public' ? 'var(--red-bg)' : 'var(--border-light)', color: h.kind === 'public' ? 'var(--red-text)' : 'var(--text-secondary)' }}>
                    {KIND_LABEL[h.kind]}
                  </span>
                </div>
                <button onClick={() => deleteHoliday(h.id)} className="text-xs font-medium px-2.5 py-1.5 rounded-md" style={{ background: 'var(--red-bg)', color: 'var(--red-text)' }}>削除</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
