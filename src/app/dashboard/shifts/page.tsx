'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

interface ShiftRecord {
  id: string
  date: string
  start_time: string
  end_time: string
  status: 'pending' | 'approved' | 'rejected'
}

const STATUS = {
  pending:  { label: '申請中', bg: 'rgba(255,149,0,0.12)', color: '#ff9500' },
  approved: { label: '確定',   bg: 'rgba(52,199,89,0.12)', color: '#34c759' },
  rejected: { label: '却下',   bg: 'rgba(255,59,48,0.12)', color: '#ff3b30' },
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)
  const [tab, setTab] = useState<'request' | 'calendar'>('request')
  const supabase = createClient()

  const fetchShifts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('shifts').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setShifts(data ?? [])
  }, [supabase])

  useEffect(() => { fetchShifts() }, [fetchShifts])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('shifts').insert({ user_id: user.id, date, start_time: startTime, end_time: endTime })
    if (error) {
      setMessage({ text: 'エラーが発生しました', type: 'error' })
    } else {
      setMessage({ text: 'シフトを申請しました！承認をお待ちください', type: 'success' })
      setDate(''); setStartTime(''); setEndTime('')
      await fetchShifts()
    }
    setLoading(false)
  }

  const approvedShifts = shifts.filter((s) => s.status === 'approved')

  function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }
  function getFirstDay(y: number, m: number) { return new Date(y, m - 1, 1).getDay() }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDay(viewYear, viewMonth)
  const calendarDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function getShiftForDay(day: number) {
    const ds = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return approvedShifts.find((s) => s.date === ds)
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f2f2f7' }}>
      <Header title="シフト" subtitle="申請と確定スケジュール" />

      <div className="px-8 pb-10 space-y-6">

        {message && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: message.type === 'success' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: message.type === 'success' ? '#34c759' : '#ff3b30' }}>
              {message.type === 'success' ? '✓' : '!'}
            </div>
            <p className="text-sm font-semibold" style={{ color: message.type === 'success' ? '#1c7234' : '#c0392b' }}>{message.text}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'rgba(118,118,128,0.12)' }}>
          {(['request', 'calendar'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: tab === t ? 'white' : 'transparent',
                color: tab === t ? '#1c1c1e' : '#8e8e93',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {t === 'request' ? 'シフト申請' : 'カレンダー'}
            </button>
          ))}
        </div>

        {tab === 'request' && (
          <>
            {/* Form */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1c1c1e' }}>シフトを申請</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>希望日</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="ios-input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>開始時刻</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="ios-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>終了時刻</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="ios-input" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl font-bold text-white shadow-sm disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #5856d6, #007aff)' }}
                >
                  {loading ? '申請中...' : '申請する'}
                </button>
              </form>
            </div>

            {/* History */}
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: '#1c1c1e' }}>申請履歴</h3>
              <div className="space-y-3">
                {shifts.length === 0 ? (
                  <div className="bg-white rounded-3xl py-16 text-center shadow-sm" style={{ color: '#8e8e93' }}>
                    <p className="text-4xl mb-3">📅</p>
                    <p className="font-medium">申請履歴がありません</p>
                  </div>
                ) : (
                  shifts.map((s) => {
                    const st = STATUS[s.status]
                    return (
                      <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: st.bg }}>
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: st.color }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold" style={{ color: '#1c1c1e' }}>
                            {new Date(s.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                          </p>
                          <p className="text-sm mt-0.5" style={{ color: '#8e8e93' }}>
                            {s.start_time.slice(0,5)} 〜 {s.end_time.slice(0,5)}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'calendar' && (
          <div className="bg-white rounded-3xl shadow-sm p-6">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(118,118,128,0.12)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#1c1c1e' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-xl font-bold" style={{ color: '#1c1c1e' }}>{viewYear}年 {viewMonth}月</h3>
              <button
                onClick={() => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(118,118,128,0.12)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#1c1c1e' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Week headers */}
            <div className="grid grid-cols-7 mb-2">
              {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                <div key={d} className="text-center text-xs font-bold py-2" style={{ color: i === 0 ? '#ff3b30' : i === 6 ? '#007aff' : '#8e8e93' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />
                const ds = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const shift = getShiftForDay(day)
                const isToday = ds === todayStr
                const dow = (firstDay + day - 1) % 7
                return (
                  <div
                    key={i}
                    className="min-h-[60px] p-1.5 rounded-xl"
                    style={{
                      background: isToday ? 'rgba(0,122,255,0.08)' : shift ? 'rgba(52,199,89,0.06)' : 'transparent',
                      border: isToday ? '1.5px solid rgba(0,122,255,0.4)' : '1.5px solid transparent',
                    }}
                  >
                    <p
                      className="text-xs font-bold text-center mb-1"
                      style={{
                        color: isToday ? '#007aff' : dow === 0 ? '#ff3b30' : dow === 6 ? '#007aff' : '#1c1c1e',
                      }}
                    >
                      {isToday ? (
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs"
                          style={{ background: '#007aff' }}
                        >
                          {day}
                        </span>
                      ) : day}
                    </p>
                    {shift && (
                      <div className="rounded-lg px-1 py-0.5 text-center" style={{ background: '#34c759' }}>
                        <p className="text-white text-xs font-bold leading-tight">{shift.start_time.slice(0,5)}</p>
                        <p className="text-white text-xs opacity-80 leading-tight">{shift.end_time.slice(0,5)}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 pt-4" style={{ borderTop: '1px solid #f2f2f7' }}>
              <div className="w-3 h-3 rounded" style={{ background: '#34c759' }} />
              <span className="text-xs" style={{ color: '#8e8e93' }}>確定シフト</span>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
