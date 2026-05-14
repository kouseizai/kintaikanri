'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_ATTENDANCE } from '@/lib/demo'
import Header from '@/components/Header'

interface AttendanceRecord {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  break_start: string | null
  break_end: string | null
}

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

function todayInJST() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

function formatTime(ts: string | null) {
  if (!ts) return '--:--'
  return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function calcWorkMinutes(rec: { clock_in: string | null; clock_out: string | null; break_start: string | null; break_end: string | null }) {
  if (!rec.clock_in || !rec.clock_out) return 0
  let total = (new Date(rec.clock_out).getTime() - new Date(rec.clock_in).getTime()) / 60000
  if (rec.break_start && rec.break_end) {
    total -= (new Date(rec.break_end).getTime() - new Date(rec.break_start).getTime()) / 60000
  }
  return Math.max(0, Math.round(total))
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return '—'
  return `${Math.floor(minutes / 60)}時間 ${minutes % 60}分`
}

export default function AttendancePage() {
  const [demoMode, setDemoMode] = useState(false)
  const [today, setToday] = useState<AttendanceRecord | null>(null)
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [editing, setEditing] = useState<AttendanceRecord | null>(null)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)

  const supabase = createClient()
  const todayDate = todayInJST()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchData = useCallback(async () => {
    if (isDemoMode()) {
      setDemoMode(true)
      const sorted = [...DEMO_ATTENDANCE].sort((a, b) => b.date.localeCompare(a.date))
      setToday(sorted.find(r => r.date === todayDate) ?? null)
      setHistory(sorted)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: todayRecord } = await supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', todayDate).maybeSingle()
    setToday(todayRecord)
    const { data: historyRecords } = await supabase.from('attendance').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(100)
    setHistory(historyRecords ?? [])
  }, [supabase, todayDate])

  useEffect(() => { fetchData() }, [fetchData])

  function upsertHistory(rec: AttendanceRecord) {
    setHistory(prev => {
      const i = prev.findIndex(r => r.date === rec.date)
      if (i >= 0) { const copy = [...prev]; copy[i] = rec; return copy }
      return [rec, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    })
  }

  async function recordAction(field: 'clock_in' | 'clock_out' | 'break_start' | 'break_end', successText: string) {
    setLoading(true); setMessage(null)
    const now = new Date().toISOString()
    if (demoMode) {
      const base: AttendanceRecord = today ?? { id: `demo-${todayDate}`, date: todayDate, clock_in: null, clock_out: null, break_start: null, break_end: null }
      const rec: AttendanceRecord = { ...base, [field]: now }
      setToday(rec); upsertHistory(rec)
      setMessage({ text: successText, type: 'success' })
      setLoading(false); return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    if (today) await supabase.from('attendance').update({ [field]: now }).eq('id', today.id)
    else await supabase.from('attendance').insert({ user_id: user.id, date: todayDate, [field]: now })
    setMessage({ text: successText, type: 'success' })
    await fetchData()
    setLoading(false)
  }

  const clockIn       = () => recordAction('clock_in',    '出勤を記録しました')
  const clockOut      = () => recordAction('clock_out',   'お疲れさまでした！退勤を記録しました')
  const startBreak    = () => recordAction('break_start', '休憩を開始しました')
  const endBreak      = () => recordAction('break_end',   '休憩を終了しました')

  async function saveEdit() {
    if (!editing) return
    if (demoMode) {
      setHistory(prev => prev.map(r => r.id === editing.id ? editing : r))
      if (today?.id === editing.id) setToday(editing)
      setEditing(null)
      setMessage({ text: '打刻を修正しました', type: 'success' })
      return
    }
    await supabase.from('attendance').update({
      clock_in: editing.clock_in, clock_out: editing.clock_out,
      break_start: editing.break_start, break_end: editing.break_end,
    }).eq('id', editing.id)
    setEditing(null)
    setMessage({ text: '打刻を修正しました', type: 'success' })
    await fetchData()
  }

  const clockedIn  = !!today?.clock_in
  const clockedOut = !!today?.clock_out
  const onBreak    = !!today?.break_start && !today?.break_end
  const breakDone  = !!today?.break_start && !!today?.break_end

  // 表示用：選択月の履歴
  const visibleHistory = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth).padStart(2, '0')}`
    return history.filter(r => r.date.startsWith(prefix))
  }, [history, viewYear, viewMonth])

  // 月サマリー
  const summary = useMemo(() => {
    const days = visibleHistory.filter(r => r.clock_in).length
    const totalMin = visibleHistory.reduce((s, r) => s + calcWorkMinutes(r), 0)
    const standardMin = 8 * 60 // 1日8時間
    const overtimeMin = visibleHistory.reduce((s, r) => s + Math.max(0, calcWorkMinutes(r) - standardMin), 0)
    return { days, totalMin, overtimeMin }
  }, [visibleHistory])

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // 編集ダイアログ：input[type=datetime-local]用に変換
  function toLocalInput(ts: string | null) {
    if (!ts) return ''
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  function fromLocalInput(value: string) {
    if (!value) return null
    return new Date(value).toISOString()
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="打刻" subtitle="出退勤・休憩の記録と修正" />
      <div className="px-4 md:px-8 pb-10 space-y-6">

        {message && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ background: message.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: message.type === 'success' ? 'var(--green-text)' : 'var(--red-text)', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
            <span>{message.type === 'success' ? '✓' : '!'}</span>
            {message.text}
          </div>
        )}

        {/* Clock display */}
        <div className="rounded-xl p-6 md:p-8 text-center" style={{ background: '#141414' }}>
          <p className="text-xs font-medium mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {currentTime.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <p className="text-5xl md:text-6xl font-bold tracking-tighter text-white mb-6 tabular-nums">
            {currentTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-xl mx-auto">
            <button onClick={clockIn} disabled={loading || clockedIn}
              className="py-3 rounded-lg font-semibold text-xs md:text-sm transition-all disabled:opacity-50"
              style={{ background: clockedIn ? 'rgba(255,255,255,0.08)' : '#ffffff', color: clockedIn ? 'rgba(255,255,255,0.5)' : '#111827' }}>
              {clockedIn ? `出勤済 ${formatTime(today?.clock_in ?? null)}` : '出勤'}
            </button>
            <button onClick={startBreak} disabled={loading || !clockedIn || clockedOut || onBreak || breakDone}
              className="py-3 rounded-lg font-semibold text-xs md:text-sm transition-all disabled:opacity-50"
              style={{ background: breakDone ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}>
              {breakDone ? `休憩済` : onBreak ? '休憩中…' : '休憩開始'}
            </button>
            <button onClick={endBreak} disabled={loading || !onBreak}
              className="py-3 rounded-lg font-semibold text-xs md:text-sm transition-all disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}>
              休憩終了
            </button>
            <button onClick={clockOut} disabled={loading || !clockedIn || clockedOut || onBreak}
              className="py-3 rounded-lg font-semibold text-xs md:text-sm transition-all disabled:opacity-50"
              style={{ background: clockedOut ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)', color: clockedOut ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}>
              {clockedOut ? `退勤済 ${formatTime(today?.clock_out ?? null)}` : '退勤'}
            </button>
          </div>
        </div>

        {/* Today summary */}
        {today && (clockedIn || clockedOut) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '出勤', value: formatTime(today.clock_in) },
              { label: '休憩', value: today.break_start && today.break_end ? `${formatTime(today.break_start)}〜${formatTime(today.break_end)}` : '—' },
              { label: '退勤', value: formatTime(today.clock_out) },
              { label: '勤務時間', value: formatMinutes(calcWorkMinutes(today)) },
            ].map((item) => (
              <div key={item.label} className="stat-card text-center">
                <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="text-base md:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Month switcher + Summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>月別勤務サマリー</h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="w-7 h-7 rounded-md flex items-center justify-center btn-secondary p-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-sm font-semibold min-w-[88px] text-center" style={{ color: 'var(--text-primary)' }}>{viewYear}年 {viewMonth}月</span>
              <button onClick={nextMonth} className="w-7 h-7 rounded-md flex items-center justify-center btn-secondary p-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="stat-card text-center">
              <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>出勤日数</p>
              <p className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{summary.days}<span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>日</span></p>
            </div>
            <div className="stat-card text-center">
              <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>総勤務時間</p>
              <p className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatMinutes(summary.totalMin)}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>残業時間</p>
              <p className="text-xl md:text-2xl font-bold" style={{ color: summary.overtimeMin > 0 ? '#b45309' : 'var(--text-primary)' }}>{formatMinutes(summary.overtimeMin)}</p>
            </div>
          </div>

          {/* History */}
          <div className="card overflow-hidden">
            {visibleHistory.length === 0 ? (
              <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm">この月の記録はありません</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['日付', '出勤', '休憩', '退勤', '勤務時間', ''].map(h => (
                      <th key={h} className="px-2 md:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleHistory.map((record, i) => (
                    <tr key={record.id} className="table-row" style={{ borderBottom: i < visibleHistory.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <td className="px-2 md:px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {new Date(record.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                      </td>
                      <td className="px-2 md:px-4 py-3 text-sm font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatTime(record.clock_in)}</td>
                      <td className="px-2 md:px-4 py-3 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{record.break_start && record.break_end ? `${formatTime(record.break_start)}〜${formatTime(record.break_end)}` : '—'}</td>
                      <td className="px-2 md:px-4 py-3 text-sm font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatTime(record.clock_out)}</td>
                      <td className="px-2 md:px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatMinutes(calcWorkMinutes(record))}</td>
                      <td className="px-2 md:px-4 py-3 text-right">
                        <button onClick={() => setEditing(record)} className="text-xs font-medium px-2 py-1 rounded-md" style={{ color: 'var(--text-secondary)', background: 'var(--border-light)' }}>修正</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setEditing(null)}>
          <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>打刻を修正</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              {new Date(editing.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            </p>
            <div className="space-y-3">
              {(['clock_in', 'break_start', 'break_end', 'clock_out'] as const).map((f) => {
                const labels = { clock_in: '出勤', break_start: '休憩開始', break_end: '休憩終了', clock_out: '退勤' }
                return (
                  <div key={f}>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{labels[f]}</label>
                    <input type="datetime-local" value={toLocalInput(editing[f])}
                      onChange={(e) => setEditing({ ...editing, [f]: fromLocalInput(e.target.value) })}
                      className="field-input" />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="flex-1 btn-secondary">キャンセル</button>
              <button onClick={saveEdit} className="flex-1 btn-primary">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
