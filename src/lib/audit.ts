import type { SupabaseClient } from '@supabase/supabase-js'
import { DEMO_PROFILES } from './demo'

export type AuditEntity = 'shift' | 'leave' | 'payslip' | 'attendance' | 'employee' | 'profile'
export type AuditAction =
  | 'created' | 'updated' | 'deleted'
  | 'approved' | 'rejected' | 'cancelled'
  | 'marked_paid' | 'unmarked_paid'
  | 'activated' | 'deactivated'

export interface AuditLog {
  id: string
  entity_type: AuditEntity
  entity_id: string | null
  action: AuditAction
  actor_id: string | null
  actor_name: string | null
  target_name: string | null
  detail: Record<string, unknown> | null
  created_at: string
}

export const ACTION_LABEL: Record<AuditAction, string> = {
  created:       '申請',
  updated:       '更新',
  deleted:       '削除',
  approved:      '承認',
  rejected:      '却下',
  cancelled:     '取消',
  marked_paid:   '支払完了',
  unmarked_paid: '支払取消',
  activated:     '有効化',
  deactivated:   '無効化（退職）',
}

export const ENTITY_LABEL: Record<AuditEntity, string> = {
  shift: 'シフト', leave: '有給', payslip: '給料明細',
  attendance: '打刻', employee: '従業員', profile: 'プロフィール',
}

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

function getDemoRole(): 'employee' | 'owner' | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/demo_role=(employee|owner)/)
  return m ? (m[1] as 'employee' | 'owner') : null
}

// デモモード用のローカルログストア（メモリのみ）
const demoLogs: AuditLog[] = []

export function getDemoLogs(): AuditLog[] {
  return demoLogs
}

export function appendDemoLog(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
  const entry: AuditLog = {
    ...log,
    id: `demo-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
  }
  demoLogs.unshift(entry)
  return entry
}

export async function logAction(
  supabase: SupabaseClient,
  params: {
    entityType: AuditEntity
    entityId: string | null
    action: AuditAction
    targetName?: string | null
    detail?: Record<string, unknown> | null
  }
): Promise<AuditLog | null> {
  if (isDemoMode()) {
    const role = getDemoRole() ?? 'employee'
    const me = DEMO_PROFILES[role]
    return appendDemoLog({
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      actor_id: me.id,
      actor_name: me.name,
      target_name: params.targetName ?? me.name,
      detail: params.detail ?? null,
    })
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
  const actorName: string = (profile as { name?: string } | null)?.name ?? ''
  const { data, error } = await supabase.from('audit_logs').insert({
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    actor_id: user.id,
    actor_name: actorName,
    target_name: params.targetName ?? actorName,
    detail: params.detail ?? null,
  }).select().single()
  if (error) return null
  return data as AuditLog
}

export async function fetchLogs(
  supabase: SupabaseClient,
  filter?: { entityType?: AuditEntity; entityId?: string; limit?: number }
): Promise<AuditLog[]> {
  if (isDemoMode()) {
    let logs = demoLogs
    if (filter?.entityType) logs = logs.filter(l => l.entity_type === filter.entityType)
    if (filter?.entityId)   logs = logs.filter(l => l.entity_id === filter.entityId)
    return logs.slice(0, filter?.limit ?? 50)
  }
  let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false })
  if (filter?.entityType) q = q.eq('entity_type', filter.entityType)
  if (filter?.entityId)   q = q.eq('entity_id', filter.entityId)
  q = q.limit(filter?.limit ?? 50)
  const { data } = await q
  return (data ?? []) as AuditLog[]
}
