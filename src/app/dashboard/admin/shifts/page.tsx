'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

interface ShiftWithUser {
  id: string
  date: string
  start_time: string
  end_time: string
  status: 'pending' | 'approved' | 'rejected'
  profiles: { name: string } | null
}

const STATUS = {
  pending:  { label: '申請中', bg: 'rgba(255,149,0,0.12)', color: '#ff9500' },
  approved: { label: '確定',   bg: 'rgba(52,199,89,0.12)',  color: '#34c759' },
  rejected: { label: '却下',   bg: 'rgba(255,59,48,0.12)', color: '#ff3b30' },
}

export default function AdminShiftsPage() {
  const [shifts, setShifts] = useState<ShiftWithUser[]>([])
  const [filter, setFilter] = useState<'all' | 'pending'>('pending')
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClient()

  const fetchShifts = useCallback(async () => {
    let query = supabase.from('shifts').select('*, profiles(name)').order('date', { ascending: true })
    if (filter === 'pending') query = query.eq('status', 'pending')
    const { data } = await query
    setShifts((data ?? []) as ShiftWithUser[])
  }, [supabase, filter])

  useEffect(() => { fetchShifts() }, [fetchShifts])

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setLoading(id)
    await supabase.from('shifts').update({ status }).eq('id', id)
    await fetchShifts()
    setLoading(null)
  }

  const pendingCount = shifts.filter(s => s.status === 'pending').length

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f2f2f7' }}>
      <Header title="シフト管理" subtitle="申請の承認・却下" />

      <div className="px-8 pb-10 space-y-6">

        {/* Stats */}
        <div className="rounded-3xl p-6 shadow-sm" style={{ background: 'linear-gradient(135deg, #5856d6, #007aff)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>承認待ちシフト</p>
              <p className="text-5xl font-bold text-white">{pendingCount}</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>件の申請があります</p>
            </div>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'rgba(118,118,128,0.12)' }}>
          {(['pending', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: filter === f ? 'white' : 'transparent',
                color: filter === f ? '#1c1c1e' : '#8e8e93',
                boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {f === 'pending' ? '申請中のみ' : '全て表示'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {shifts.length === 0 ? (
            <div className="bg-white rounded-3xl py-16 text-center shadow-sm" style={{ color: '#8e8e93' }}>
              <p className="text-4xl mb-3">✅</p>
              <p className="font-medium">
                {filter === 'pending' ? '申請中のシフトはありません' : 'データがありません'}
              </p>
            </div>
          ) : (
            shifts.map((s) => {
              const st = STATUS[s.status]
              return (
                <div key={s.id} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,122,255,0.1)' }}>
                      <span className="text-xl font-bold" style={{ color: '#007aff' }}>
                        {s.profiles?.name?.slice(0, 1) ?? '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold" style={{ color: '#1c1c1e' }}>{s.profiles?.name ?? '不明'}</p>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      <p className="text-sm mt-1 font-medium" style={{ color: '#3c3c43' }}>
                        {new Date(s.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                      </p>
                      <p className="text-sm" style={{ color: '#8e8e93' }}>
                        {s.start_time.slice(0,5)} 〜 {s.end_time.slice(0,5)}
                      </p>
                    </div>
                  </div>
                  {s.status === 'pending' && (
                    <div className="flex gap-3 mt-4 pt-4" style={{ borderTop: '1px solid #f2f2f7' }}>
                      <button
                        onClick={() => updateStatus(s.id, 'approved')}
                        disabled={loading === s.id}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #34c759, #30d158)' }}
                      >
                        {loading === s.id ? '処理中...' : '承認する'}
                      </button>
                      <button
                        onClick={() => updateStatus(s.id, 'rejected')}
                        disabled={loading === s.id}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                        style={{ background: 'rgba(255,59,48,0.1)', color: '#ff3b30' }}
                      >
                        却下
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}
