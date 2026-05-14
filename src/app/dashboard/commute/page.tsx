'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

interface CommuteRecord {
  id: string
  route: string
  amount: number
  created_at: string
}

export default function CommutePage() {
  const [records, setRecords] = useState<CommuteRecord[]>([])
  const [route, setRoute] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const supabase = createClient()

  const fetchRecords = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('commute').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setRecords(data ?? [])
  }, [supabase])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('commute').insert({ user_id: user.id, route: route.trim(), amount: parseInt(amount, 10) })
    if (error) {
      setMessage({ text: 'エラーが発生しました: ' + error.message, type: 'error' })
    } else {
      setMessage({ text: '交通費を登録しました', type: 'success' })
      setRoute('')
      setAmount('')
      await fetchRecords()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('commute').delete().eq('id', id)
    await fetchRecords()
  }

  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f2f2f7' }}>
      <Header title="交通費設定" subtitle="通勤ルートと交通費の管理" />

      <div className="px-8 pb-10 space-y-6">

        {message && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: message.type === 'success' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: message.type === 'success' ? '#34c759' : '#ff3b30' }}>
              {message.type === 'success' ? '✓' : '!'}
            </div>
            <p className="text-sm font-semibold" style={{ color: message.type === 'success' ? '#1c7234' : '#c0392b' }}>{message.text}</p>
          </div>
        )}

        {/* Total banner */}
        <div className="rounded-3xl p-6 shadow-sm" style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>登録済み交通費合計</p>
              <p className="text-4xl font-bold text-white">¥{totalAmount.toLocaleString()}</p>
            </div>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              🚃
            </div>
          </div>
          {records.length > 0 && (
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{records.length} ルート登録済み</p>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#1c1c1e' }}>交通費を追加</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>通勤ルート</label>
              <input
                type="text"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                required
                placeholder="例：〇〇駅 → △△駅（往復）"
                className="ios-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>往復金額（円）</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                placeholder="例：500"
                className="ios-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white shadow-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
            >
              {loading ? '登録中...' : '登録する'}
            </button>
          </form>
        </div>

        {/* Records */}
        <div>
          <h3 className="text-lg font-bold mb-3" style={{ color: '#1c1c1e' }}>登録済みルート</h3>
          <div className="space-y-3">
            {records.length === 0 ? (
              <div className="bg-white rounded-3xl py-16 text-center shadow-sm" style={{ color: '#8e8e93' }}>
                <p className="text-4xl mb-3">🚉</p>
                <p className="font-medium">登録済みの交通費はありません</p>
              </div>
            ) : (
              records.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(0,122,255,0.1)' }}>
                    🚃
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: '#1c1c1e' }}>{r.route}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#8e8e93' }}>
                      {new Date(r.created_at).toLocaleDateString('ja-JP')} 登録
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold" style={{ color: '#007aff' }}>¥{r.amount.toLocaleString()}</p>
                    <p className="text-xs" style={{ color: '#8e8e93' }}>往復/日</p>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,59,48,0.1)' }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#ff3b30' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
