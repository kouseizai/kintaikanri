'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchLogs, ACTION_LABEL, ENTITY_LABEL, type AuditLog, type AuditEntity, type AuditAction } from '@/lib/audit'
import Header from '@/components/Header'

const ACTION_COLOR: Record<AuditAction, string> = {
  created:       'var(--blue-text)',
  updated:       'var(--text-secondary)',
  deleted:       'var(--red-text)',
  approved:      'var(--green-text)',
  rejected:      'var(--red-text)',
  cancelled:     '#999',
  marked_paid:   'var(--green-text)',
  unmarked_paid: '#b45309',
  activated:     'var(--green-text)',
  deactivated:   '#b45309',
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filterEntity, setFilterEntity] = useState<AuditEntity | ''>('')
  const [filterActor, setFilterActor] = useState('')
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('')
  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const data = await fetchLogs(supabase, { limit: 200 })
    setLogs(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterEntity && l.entity_type !== filterEntity) return false
      if (filterAction && l.action !== filterAction) return false
      if (filterActor && !(l.actor_name ?? '').includes(filterActor) && !(l.target_name ?? '').includes(filterActor)) return false
      return true
    })
  }, [logs, filterEntity, filterAction, filterActor])

  const actors = useMemo(() => {
    const set = new Set<string>()
    logs.forEach(l => { if (l.actor_name) set.add(l.actor_name) })
    return Array.from(set).sort()
  }, [logs])

  function formatDate(ts: string) {
    return new Date(ts).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function describeDetail(detail: Record<string, unknown> | null): string {
    if (!detail) return ''
    const parts: string[] = []
    if (typeof detail.date === 'string') parts.push(detail.date)
    if (typeof detail.kind === 'string') {
      const kindLabel: Record<string, string> = { full: '全日', morning: '午前半休', afternoon: '午後半休' }
      parts.push(kindLabel[detail.kind] ?? detail.kind)
    }
    if (typeof detail.start_time === 'string' && typeof detail.end_time === 'string') {
      parts.push(`${detail.start_time}〜${detail.end_time}`)
    }
    if (typeof detail.rejection_reason === 'string' && detail.rejection_reason) parts.push(`理由: ${detail.rejection_reason}`)
    if (typeof detail.year === 'number' && typeof detail.month === 'number') parts.push(`${detail.year}年${detail.month}月`)
    if (typeof detail.reason === 'string' && detail.reason) parts.push(`理由: ${detail.reason}`)
    return parts.join('　')
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="操作ログ" subtitle="申請・承認・編集など全操作の履歴" />
      <div className="px-4 md:px-8 pb-10 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['shift', 'leave', 'payslip', 'employee'] as const).map(t => (
            <div key={t} className="stat-card">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{ENTITY_LABEL[t]}</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {logs.filter(l => l.entity_type === t).length}
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>件</span>
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value as AuditEntity | '')} className="field-input w-auto text-sm">
            <option value="">全種別</option>
            {(Object.keys(ENTITY_LABEL) as AuditEntity[]).map(k => <option key={k} value={k}>{ENTITY_LABEL[k]}</option>)}
          </select>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value as AuditAction | '')} className="field-input w-auto text-sm">
            <option value="">全アクション</option>
            {(Object.keys(ACTION_LABEL) as AuditAction[]).map(k => <option key={k} value={k}>{ACTION_LABEL[k]}</option>)}
          </select>
          <select value={filterActor} onChange={(e) => setFilterActor(e.target.value)} className="field-input w-auto text-sm">
            <option value="">全ユーザー</option>
            {actors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={fetchAll} className="btn-secondary text-sm">更新</button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} 件</span>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="card py-16 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>読み込み中...</p></div>
        ) : filtered.length === 0 ? (
          <div className="card py-16 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>ログがありません</p></div>
        ) : (
          <div className="card overflow-hidden">
            {filtered.map((l, i) => (
              <div key={l.id} className="flex items-start gap-3 px-4 md:px-6 py-3.5" style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: ACTION_COLOR[l.action] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}>{ENTITY_LABEL[l.entity_type]}</span>
                    <span className="text-sm font-semibold" style={{ color: ACTION_COLOR[l.action] }}>{ACTION_LABEL[l.action]}</span>
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {l.actor_name}
                      {l.target_name && l.target_name !== l.actor_name && (
                        <>
                          <span className="mx-1" style={{ color: 'var(--text-muted)' }}>→</span>
                          {l.target_name}
                        </>
                      )}
                    </span>
                  </div>
                  {describeDetail(l.detail) && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{describeDetail(l.detail)}</p>
                  )}
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatDate(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
