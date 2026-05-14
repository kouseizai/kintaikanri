'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_SHIFTS, DEMO_HOLIDAYS } from '@/lib/demo'
import { logAction, fetchLogs, ACTION_LABEL, type AuditLog } from '@/lib/audit'
import Header from '@/components/Header'

interface ShiftRecord {
  id: string
  date: string
  start_time: string
  end_time: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
}
interface Holiday { date: string; name: string; kind: 'public' | 'company' }

const STATUS = {
  pending:  { label: '申請中', cls: 'badge-amber' },
  approved: { label: '確定',   cls: 'badge-green' },
  rejected: { label: '却下',   cls: 'badge-red' },
}

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

export default function ShiftsPage() {
  const [demoMode, setDemoMode] = useState(false)
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)
  const [tab, setTab] = useState<'request' | 'calendar'>('request')
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [expandedLogs, setExpandedLogs] = useState<Record<string, AuditLog[] | 'loading'>>({})
  const supabase = createClient()

  async function toggleLogs(shiftId: string) {
    if (expandedLogs[shiftId] && expandedLogs[shiftId] !== 'loading') {
      setExpandedLogs(prev => { const c = { ...prev }; delete c[shiftId]; return c })
      return
    }
    setExpandedLogs(prev => ({ ...prev, [shiftId]: 'loading' }))
    const logs = await fetchLogs(supabase, { entityType: 'shift', entityId: shiftId })
    setExpandedLogs(prev => ({ ...prev, [shiftId]: logs }))
  }

  const fetchShifts = useCallback(async () => {
    if (isDemoMode()) {
      setDemoMode(true)
      setShifts(DEMO_SHIFTS as ShiftRecord[])
      setHolidays(DEMO_HOLIDAYS as Holiday[])
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: shiftData }, { data: holidayData }] = await Promise.all([
      supabase.from('shifts').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('holidays').select('date, name, kind'),
    ])
    setShifts(shiftData ?? [])
    setHolidays((holidayData ?? []) as Holiday[])
  }, [supabase])

  useEffect(() => { fetchShifts() }, [fetchShifts])

  function getHolidayForDay(day: number) {
    const ds = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return holidays.find(h => h.date === ds)
  }

  function validate(): string | null {
    if (!date || !startTime || !endTime) return '全ての項目を入力してください'
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
    if (date < todayStr) return '過去の日付は申請できません'
    if (startTime >= endTime) return '終了時刻は開始時刻より後にしてください'
    const dup = shifts.some(s => s.date === date && s.status !== 'rejected')
    if (dup) return 'この日付には既に申請があります'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setMessage({ text: err, type: 'error' }); return }
    setLoading(true); setMessage(null)
    if (demoMode) {
      const newShift: ShiftRecord = {
        id: `demo-${Date.now()}`, date, start_time: startTime, end_time: endTime,
        status: 'pending', rejection_reason: null,
      }
      setShifts(prev => [newShift, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      await logAction(supabase, { entityType: 'shift', entityId: newShift.id, action: 'created', detail: { date, start_time: startTime, end_time: endTime } })
      setMessage({ text: 'シフトを申請しました！承認をお待ちください', type: 'success' })
      setDate(''); setStartTime(''); setEndTime(''); setLoading(false); return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: inserted, error } = await supabase.from('shifts').insert({ user_id: user.id, date, start_time: startTime, end_time: endTime }).select().single()
    if (error) { setMessage({ text: 'エラーが発生しました', type: 'error' }) }
    else {
      await logAction(supabase, { entityType: 'shift', entityId: (inserted as { id: string }).id, action: 'created', detail: { date, start_time: startTime, end_time: endTime } })
      setMessage({ text: 'シフトを申請しました！承認をお待ちください', type: 'success' }); setDate(''); setStartTime(''); setEndTime(''); await fetchShifts()
    }
    setLoading(false)
  }

  async function cancelShift(id: string) {
    if (!confirm('この申請を取り消しますか？')) return
    const target = shifts.find(s => s.id === id)
    if (demoMode) {
      setShifts(prev => prev.filter(s => s.id !== id))
      await logAction(supabase, { entityType: 'shift', entityId: id, action: 'cancelled', detail: target ? { date: target.date } : null })
      setMessage({ text: '申請を取り消しました', type: 'success' })
      return
    }
    await logAction(supabase, { entityType: 'shift', entityId: id, action: 'cancelled', detail: target ? { date: target.date } : null })
    await supabase.from('shifts').delete().eq('id', id)
    setMessage({ text: '申請を取り消しました', type: 'success' })
    await fetchShifts()
  }

  const approvedShifts = shifts.filter((s) => s.status === 'approved')
  const pendingShifts  = shifts.filter((s) => s.status === 'pending')

  function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }
  function getFirstDay(y: number, m: number) { return new Date(y, m - 1, 1).getDay() }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDay(viewYear, viewMonth)
  const calendarDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function getShiftForDay(day: number) {
    const ds = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return shifts.find((s) => s.date === ds && s.status !== 'rejected')
  }

  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="シフト" subtitle="申請と確定スケジュール" />
      <div className="px-4 md:px-8 pb-10 space-y-6">

        {message && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ background: message.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: message.type === 'success' ? 'var(--green-text)' : 'var(--red-text)', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
            <span>{message.type === 'success' ? '✓' : '!'}</span>
            {message.text}
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--border-light)', width: 'fit-content' }}>
          {(['request', 'calendar'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === t ? 'tab-active' : 'tab-inactive'}`}>
              {t === 'request' ? 'シフト申請' : 'カレンダー'}
            </button>
          ))}
        </div>

        {tab === 'request' && (
          <>
            <div className="card p-6">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>シフトを申請</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>希望日</label>
                  <input type="date" value={date} min={todayStr} onChange={(e) => setDate(e.target.value)} required className="field-input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>開始時刻</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="field-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>終了時刻</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="field-input" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? '申請中...' : '申請する'}
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>申請履歴</h2>
              {shifts.length === 0 ? (
                <div className="card py-16 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>申請履歴がありません</p>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  {shifts.map((s, i) => {
                    const st = STATUS[s.status]
                    const logs = expandedLogs[s.id]
                    return (
                      <div key={s.id} style={{ borderBottom: i < shifts.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                        <div className="flex items-center gap-3 px-4 md:px-6 py-4 table-row">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {new Date(s.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.start_time.slice(0,5)} 〜 {s.end_time.slice(0,5)}</p>
                            {s.status === 'rejected' && s.rejection_reason && (
                              <p className="text-xs mt-1" style={{ color: 'var(--red-text)' }}>却下理由: {s.rejection_reason}</p>
                            )}
                          </div>
                          <span className={`badge ${st.cls} flex-shrink-0`}>{st.label}</span>
                          <button onClick={() => toggleLogs(s.id)} className="text-xs font-medium px-2 py-1 rounded-md flex-shrink-0" style={{ color: 'var(--text-secondary)', background: 'var(--border-light)' }}>
                            {logs ? '閉じる' : '履歴'}
                          </button>
                          {s.status === 'pending' && (
                            <button onClick={() => cancelShift(s.id)} className="text-xs font-medium px-2 py-1 rounded-md flex-shrink-0" style={{ color: 'var(--red-text)', background: 'var(--red-bg)' }}>取消</button>
                          )}
                        </div>
                        {logs && (
                          <div className="px-4 md:px-6 py-3 space-y-1.5" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border-light)' }}>
                            {logs === 'loading' ? (
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>読み込み中...</p>
                            ) : logs.length === 0 ? (
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>履歴がありません</p>
                            ) : (
                              logs.map(l => (
                                <div key={l.id} className="flex items-start gap-2 text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: l.action === 'approved' ? 'var(--green-text)' : l.action === 'rejected' ? 'var(--red-text)' : l.action === 'cancelled' ? '#999' : 'var(--text-muted)' }} />
                                  <div className="flex-1">
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{ACTION_LABEL[l.action]}</span>
                                    <span className="ml-2" style={{ color: 'var(--text-muted)' }}>{l.actor_name}</span>
                                    {l.detail && (l.detail as { rejection_reason?: string }).rejection_reason && (
                                      <span className="ml-2" style={{ color: 'var(--red-text)' }}>— {(l.detail as { rejection_reason?: string }).rejection_reason}</span>
                                    )}
                                  </div>
                                  <span style={{ color: 'var(--text-muted)' }}>
                                    {new Date(l.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'calendar' && (
          <div className="card p-3 md:p-6">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <button onClick={() => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }}
                className="w-8 h-8 rounded-md flex items-center justify-center btn-secondary p-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{viewYear}年 {viewMonth}月</h3>
              <button onClick={() => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }}
                className="w-8 h-8 rounded-md flex items-center justify-center btn-secondary p-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                <div key={d} className="text-center text-xs font-medium py-2" style={{ color: i === 0 ? 'var(--red-text)' : i === 6 ? 'var(--blue-text)' : 'var(--text-muted)' }}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />
                const ds = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const shift = getShiftForDay(day)
                const holiday = getHolidayForDay(day)
                const isToday = ds === todayStr
                const dow = (firstDay + day - 1) % 7
                const isPending = shift?.status === 'pending'
                const isHoliday = !!holiday
                const dayColor = isToday ? 'var(--blue-text)'
                  : isHoliday ? 'var(--red-text)'
                  : dow === 0 ? 'var(--red-text)'
                  : dow === 6 ? 'var(--blue-text)'
                  : 'var(--text-primary)'
                return (
                  <div key={i} className="min-h-[56px] p-1.5 rounded-md"
                    style={{
                      background: isToday ? 'var(--blue-bg)' : shift ? (isPending ? '#fef3c7' : 'var(--green-bg)') : isHoliday ? '#fff1f2' : 'transparent',
                      border: isToday ? '1px solid #bfdbfe' : '1px solid transparent',
                    }}
                    title={holiday?.name}>
                    <p className="text-xs text-center mb-0.5" style={{ color: dayColor, fontWeight: isToday ? 700 : 500 }}>
                      {day}
                    </p>
                    {holiday && !shift && (
                      <p className="text-[8px] text-center truncate leading-tight" style={{ color: 'var(--red-text)' }}>
                        {holiday.name}
                      </p>
                    )}
                    {shift && (
                      <div className="rounded px-0.5 py-0.5 text-center" style={{ background: isPending ? '#b45309' : 'var(--green-text)' }}>
                        <p className="text-white text-[9px] font-semibold leading-tight">{shift.start_time.slice(0,5)}</p>
                        <p className="text-white text-[9px] opacity-80 leading-tight">{shift.end_time.slice(0,5)}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded" style={{ background: 'var(--green-text)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>確定 ({approvedShifts.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded" style={{ background: '#b45309' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>申請中 ({pendingShifts.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded" style={{ background: '#fff1f2', border: '1px solid #fecaca' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>祝日・会社休日</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
