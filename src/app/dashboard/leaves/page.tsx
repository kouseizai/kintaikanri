'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

interface LeaveRecord {
  id: string
  date: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
}

const STATUS = {
  pending:  { label: '審査中', bg: 'rgba(255,149,0,0.12)', color: '#ff9500' },
  approved: { label: '承認済', bg: 'rgba(52,199,89,0.12)',  color: '#34c759' },
  rejected: { label: '却下',   bg: 'rgba(255,59,48,0.12)', color: '#ff3b30' },
}

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const supabase = createClient()

  const fetchLeaves = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('leaves').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setLeaves(data ?? [])
  }, [supabase])

  useEffect(() => { fetchLeaves() }, [fetchLeaves])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('leaves').insert({ user_id: user.id, date, reason: reason.trim() || null })
    if (error) {
      setMessage({ text: 'エラーが発生しました', type: 'error' })
    } else {
      setMessage({ text: '有給申請を提出しました！承認をお待ちください', type: 'success' })
      setDate(''); setReason('')
      await fetchLeaves()
    }
    setLoading(false)
  }

  const approved = leaves.filter(l => l.status === 'approved').length
  const pending = leaves.filter(l => l.status === 'pending').length

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f2f2f7' }}>
      <Header title="有給申請" subtitle="有給休暇の申請と状況確認" />

      <div className="px-8 pb-10 space-y-6">

        {message && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: message.type === 'success' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: message.type === 'success' ? '#34c759' : '#ff3b30' }}>
              {message.type === 'success' ? '✓' : '!'}
            </div>
            <p className="text-sm font-semibold" style={{ color: message.type === 'success' ? '#1c7234' : '#c0392b' }}>{message.text}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#8e8e93' }}>承認済み</p>
            <p className="text-4xl font-bold" style={{ color: '#34c759' }}>{approved}</p>
            <p className="text-xs mt-1" style={{ color: '#8e8e93' }}>日間</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#8e8e93' }}>審査中</p>
            <p className="text-4xl font-bold" style={{ color: '#ff9500' }}>{pending}</p>
            <p className="text-xs mt-1" style={{ color: '#8e8e93' }}>件</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#1c1c1e' }}>有給申請を提出</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>取得希望日</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="ios-input" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>理由（任意）</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="理由を入力してください（任意）"
                className="ios-input resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white shadow-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #34c759, #30d158)' }}
            >
              {loading ? '申請中...' : '申請する'}
            </button>
          </form>
        </div>

        {/* History */}
        <div>
          <h3 className="text-lg font-bold mb-3" style={{ color: '#1c1c1e' }}>申請履歴</h3>
          <div className="space-y-3">
            {leaves.length === 0 ? (
              <div className="bg-white rounded-3xl py-16 text-center shadow-sm" style={{ color: '#8e8e93' }}>
                <p className="text-4xl mb-3">🌿</p>
                <p className="font-medium">申請履歴がありません</p>
              </div>
            ) : (
              leaves.map((l) => {
                const st = STATUS[l.status]
                return (
                  <div key={l.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: st.bg }}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: st.color }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold" style={{ color: '#1c1c1e' }}>
                        {new Date(l.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                      </p>
                      {l.reason && (
                        <p className="text-sm mt-0.5 truncate" style={{ color: '#8e8e93' }}>{l.reason}</p>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
