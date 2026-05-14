'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

interface AttendanceRecord {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
}

export default function AttendancePage() {
  const [today, setToday] = useState<AttendanceRecord | null>(null)
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const supabase = createClient()
  const todayDate = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: todayRecord } = await supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', todayDate).maybeSingle()
    setToday(todayRecord)
    const { data: historyRecords } = await supabase.from('attendance').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(20)
    setHistory(historyRecords ?? [])
  }, [supabase, todayDate])

  useEffect(() => { fetchData() }, [fetchData])

  async function clockIn() {
    setLoading(true)
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const now = new Date().toISOString()
    if (today) {
      await supabase.from('attendance').update({ clock_in: now }).eq('id', today.id)
    } else {
      await supabase.from('attendance').insert({ user_id: user.id, date: todayDate, clock_in: now })
    }
    setMessage({ text: '出勤を記録しました', type: 'success' })
    await fetchData()
    setLoading(false)
  }

  async function clockOut() {
    setLoading(true)
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const now = new Date().toISOString()
    if (today) {
      await supabase.from('attendance').update({ clock_out: now }).eq('id', today.id)
    } else {
      await supabase.from('attendance').insert({ user_id: user.id, date: todayDate, clock_out: now })
    }
    setMessage({ text: 'お疲れさまでした！退勤を記録しました', type: 'success' })
    await fetchData()
    setLoading(false)
  }

  function formatTime(ts: string | null) {
    if (!ts) return '--:--'
    return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  function calcWorkHours(ci: string | null, co: string | null) {
    if (!ci || !co) return '—'
    const diff = new Date(co).getTime() - new Date(ci).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  const clockedIn = !!today?.clock_in
  const clockedOut = !!today?.clock_out

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f2f2f7' }}>
      <Header title="打刻" subtitle="出退勤の記録" />

      <div className="px-8 pb-10 space-y-6">

        {message && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: message.type === 'success' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{ background: message.type === 'success' ? '#34c759' : '#ff3b30' }}
            >
              {message.type === 'success' ? '✓' : '!'}
            </div>
            <p className="text-sm font-semibold" style={{ color: message.type === 'success' ? '#1c7234' : '#c0392b' }}>
              {message.text}
            </p>
          </div>
        )}

        {/* Live clock */}
        <div
          className="rounded-3xl p-8 text-center shadow-sm"
          style={{ background: 'linear-gradient(135deg, #1a1a3e 0%, #2d2d6b 100%)' }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {currentTime.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <p className="text-7xl font-bold tracking-tighter text-white mb-8 tabular-nums">
            {currentTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={clockIn}
              disabled={loading || clockedIn}
              className="flex-1 max-w-[200px] py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-50"
              style={{
                background: clockedIn ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #007aff, #5856d6)',
                color: 'white',
              }}
            >
              {clockedIn ? `出勤済 ${formatTime(today?.clock_in ?? null)}` : '出勤打刻'}
            </button>
            <button
              onClick={clockOut}
              disabled={loading || !clockedIn || clockedOut}
              className="flex-1 max-w-[200px] py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-50"
              style={{
                background: clockedOut ? 'rgba(255,255,255,0.1)' : clockedIn ? 'linear-gradient(135deg, #34c759, #30d158)' : 'rgba(255,255,255,0.08)',
                color: 'white',
              }}
            >
              {clockedOut ? `退勤済 ${formatTime(today?.clock_out ?? null)}` : '退勤打刻'}
            </button>
          </div>
        </div>

        {/* Today summary */}
        {(clockedIn || clockedOut) && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '出勤', value: formatTime(today?.clock_in ?? null), color: '#007aff' },
              { label: '退勤', value: formatTime(today?.clock_out ?? null), color: '#34c759' },
              { label: '勤務時間', value: calcWorkHours(today?.clock_in ?? null, today?.clock_out ?? null), color: '#ff9500' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl p-5 shadow-sm text-center">
                <p className="text-xs font-medium mb-1" style={{ color: '#8e8e93' }}>{item.label}</p>
                <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        <div>
          <h3 className="text-lg font-bold mb-3" style={{ color: '#1c1c1e' }}>打刻履歴</h3>
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            {history.length === 0 ? (
              <div className="py-16 text-center" style={{ color: '#8e8e93' }}>
                <p className="text-4xl mb-3">📋</p>
                <p className="font-medium">記録がありません</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #f2f2f7' }}>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#8e8e93' }}>日付</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#8e8e93' }}>出勤</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#8e8e93' }}>退勤</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#8e8e93' }}>勤務時間</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record, i) => (
                    <tr key={record.id} style={{ borderBottom: i < history.length - 1 ? '1px solid #f2f2f7' : 'none' }}>
                      <td className="px-6 py-4 text-sm font-medium" style={{ color: '#1c1c1e' }}>
                        {new Date(record.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold" style={{ color: '#007aff' }}>{formatTime(record.clock_in)}</td>
                      <td className="px-6 py-4 text-sm font-semibold" style={{ color: '#34c759' }}>{formatTime(record.clock_out)}</td>
                      <td className="px-6 py-4 text-sm font-medium" style={{ color: '#8e8e93' }}>{calcWorkHours(record.clock_in, record.clock_out)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
