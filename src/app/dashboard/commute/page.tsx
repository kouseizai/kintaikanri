'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_COMMUTE } from '@/lib/demo'
import Header from '@/components/Header'

interface CommuteRecord { id: string; route: string; amount: number; created_at: string }

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

export default function CommutePage() {
  const [demoMode, setDemoMode] = useState(false)
  const [records, setRecords] = useState<CommuteRecord[]>([])
  const [route, setRoute] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const supabase = createClient()

  const fetchRecords = useCallback(async () => {
    if (isDemoMode()) { setDemoMode(true); setRecords(DEMO_COMMUTE as CommuteRecord[]); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('commute').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setRecords(data ?? [])
  }, [supabase])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMessage(null)
    if (demoMode) {
      const newRecord: CommuteRecord = {
        id: `demo-${Date.now()}`, route: route.trim(), amount: parseInt(amount, 10),
        created_at: new Date().toISOString(),
      }
      setRecords(prev => [newRecord, ...prev])
      setMessage({ text: '交通費を登録しました', type: 'success' })
      setRoute(''); setAmount(''); setLoading(false); return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('commute').insert({ user_id: user.id, route: route.trim(), amount: parseInt(amount, 10) })
    if (error) { setMessage({ text: 'エラーが発生しました', type: 'error' }) }
    else { setMessage({ text: '交通費を登録しました', type: 'success' }); setRoute(''); setAmount(''); await fetchRecords() }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (demoMode) { setRecords(prev => prev.filter(r => r.id !== id)); return }
    await supabase.from('commute').delete().eq('id', id)
    await fetchRecords()
  }

  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="交通費設定" subtitle="通勤ルートと交通費の管理" />
      <div className="px-4 md:px-8 pb-10 space-y-6">

        {message && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ background: message.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: message.type === 'success' ? 'var(--green-text)' : 'var(--red-text)', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
            <span>{message.type === 'success' ? '✓' : '!'}</span>
            {message.text}
          </div>
        )}

        {/* Summary */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>登録済み交通費合計</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>¥{totalAmount.toLocaleString()}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{records.length} ルート登録済み</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#f3f4f6' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: 'var(--text-secondary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>交通費を追加</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>通勤ルート</label>
              <input type="text" value={route} onChange={(e) => setRoute(e.target.value)} required placeholder="例：〇〇駅 → △△駅（往復）" className="field-input" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>往復金額（円）</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0" placeholder="例：500" className="field-input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '登録中...' : '登録する'}
            </button>
          </form>
        </div>

        {/* List */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>登録済みルート</h2>
          {records.length === 0 ? (
            <div className="card py-16 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>登録済みの交通費はありません</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {records.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 px-4 md:px-6 py-4 table-row" style={{ borderBottom: i < records.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.route}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString('ja-JP')} 登録</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>¥{r.amount.toLocaleString()}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>往復/日</p>
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors hover:bg-red-50">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
