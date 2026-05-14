// デモモード用ダミーデータ

export const DEMO_PROFILES = {
  employee: { id: 'demo-employee', name: '田中 太郎', role: 'employee', base_salary: 280000, annual_leave_days: 20 },
  owner:    { id: 'demo-owner',    name: '山田 社長', role: 'owner',    base_salary: 500000, annual_leave_days: 20 },
} as const

export const DEMO_ATTENDANCE = [
  { id: '1', date: '2026-05-14', clock_in: '2026-05-14T09:02:00+09:00', clock_out: '2026-05-14T18:15:00+09:00', break_start: '2026-05-14T12:00:00+09:00', break_end: '2026-05-14T13:00:00+09:00' },
  { id: '2', date: '2026-05-13', clock_in: '2026-05-13T08:55:00+09:00', clock_out: '2026-05-13T18:00:00+09:00', break_start: '2026-05-13T12:00:00+09:00', break_end: '2026-05-13T13:00:00+09:00' },
  { id: '3', date: '2026-05-12', clock_in: '2026-05-12T09:10:00+09:00', clock_out: '2026-05-12T17:45:00+09:00', break_start: null, break_end: null },
  { id: '4', date: '2026-05-09', clock_in: '2026-05-09T09:00:00+09:00', clock_out: '2026-05-09T18:30:00+09:00', break_start: '2026-05-09T12:30:00+09:00', break_end: '2026-05-09T13:30:00+09:00' },
  { id: '5', date: '2026-05-08', clock_in: '2026-05-08T08:45:00+09:00', clock_out: '2026-05-08T18:05:00+09:00', break_start: '2026-05-08T12:00:00+09:00', break_end: '2026-05-08T13:00:00+09:00' },
]

export const DEMO_COMMUTE = [
  { id: '1', route: '自宅（渋谷）→ 会社（新宿）往復', amount: 420, created_at: '2026-05-01T00:00:00+09:00' },
]

export const DEMO_SHIFTS = [
  { id: '1', date: '2026-05-19', start_time: '09:00', end_time: '18:00', status: 'approved' as const, rejection_reason: null },
  { id: '2', date: '2026-05-20', start_time: '09:00', end_time: '18:00', status: 'approved' as const, rejection_reason: null },
  { id: '3', date: '2026-05-21', start_time: '10:00', end_time: '17:00', status: 'approved' as const, rejection_reason: null },
  { id: '4', date: '2026-05-26', start_time: '09:00', end_time: '18:00', status: 'pending'  as const, rejection_reason: null },
  { id: '5', date: '2026-05-27', start_time: '09:00', end_time: '18:00', status: 'pending'  as const, rejection_reason: null },
  { id: '6', date: '2026-05-15', start_time: '09:00', end_time: '18:00', status: 'rejected' as const, rejection_reason: '別の従業員と重複しているため' },
]

export const DEMO_LEAVES = [
  { id: '1', date: '2026-05-22', reason: '私用のため', kind: 'full' as const,    status: 'approved' as const, rejection_reason: null },
  { id: '2', date: '2026-06-02', reason: '通院のため', kind: 'morning' as const, status: 'pending'  as const, rejection_reason: null },
]

export const DEMO_PAYSLIPS = [
  { id: '1', year: 2026, month: 5, base_salary: 280000, commute_total: 8400, deduction: 56000, net_salary: 232400, is_paid: false },
  { id: '2', year: 2026, month: 4, base_salary: 280000, commute_total: 8400, deduction: 56000, net_salary: 232400, is_paid: true  },
  { id: '3', year: 2026, month: 3, base_salary: 280000, commute_total: 8400, deduction: 56000, net_salary: 232400, is_paid: true  },
]

// 管理者用: 全従業員一覧
export const DEMO_ALL_EMPLOYEES = [
  { id: 'demo-employee',    name: '田中 太郎', email: 'tanaka@demo.local',  base_salary: 280000, annual_leave_days: 20, hired_at: '2023-04-01', is_active: true  },
  { id: 'demo-employee-2',  name: '佐藤 花子', email: 'sato@demo.local',    base_salary: 250000, annual_leave_days: 15, hired_at: '2024-04-01', is_active: true  },
  { id: 'demo-employee-3',  name: '鈴木 一郎', email: 'suzuki@demo.local',  base_salary: 320000, annual_leave_days: 22, hired_at: '2022-10-01', is_active: true  },
  { id: 'demo-employee-4',  name: '高橋 美咲', email: 'takahashi@demo.local', base_salary: 240000, annual_leave_days: 12, hired_at: '2025-01-15', is_active: true },
]

// 管理者用: 全従業員シフト申請
export const DEMO_ALL_SHIFTS = [
  { id: '1', date: '2026-05-26', start_time: '09:00', end_time: '18:00', status: 'pending' as const,  rejection_reason: null,                profiles: { name: '田中 太郎' } },
  { id: '2', date: '2026-05-27', start_time: '09:00', end_time: '18:00', status: 'pending' as const,  rejection_reason: null,                profiles: { name: '田中 太郎' } },
  { id: '3', date: '2026-05-28', start_time: '10:00', end_time: '17:00', status: 'pending' as const,  rejection_reason: null,                profiles: { name: '佐藤 花子' } },
  { id: '4', date: '2026-05-19', start_time: '09:00', end_time: '18:00', status: 'approved' as const, rejection_reason: null,                profiles: { name: '田中 太郎' } },
  { id: '5', date: '2026-05-20', start_time: '09:00', end_time: '18:00', status: 'approved' as const, rejection_reason: null,                profiles: { name: '佐藤 花子' } },
]

export const DEMO_ALL_LEAVES = [
  { id: '1', date: '2026-05-22', reason: '私用のため',  kind: 'full' as const,    status: 'approved' as const, rejection_reason: null, profiles: { name: '田中 太郎' } },
  { id: '2', date: '2026-06-02', reason: '通院のため',  kind: 'morning' as const, status: 'pending' as const,  rejection_reason: null, profiles: { name: '田中 太郎' } },
  { id: '3', date: '2026-06-03', reason: '家族の行事', kind: 'full' as const,    status: 'pending' as const,  rejection_reason: null, profiles: { name: '佐藤 花子' } },
]

export const DEMO_ADMIN_TODAY_ATTENDANCE = [
  { name: '田中 太郎', clock_in: '2026-05-14T09:02:00+09:00', clock_out: '2026-05-14T18:15:00+09:00' },
  { name: '佐藤 花子', clock_in: '2026-05-14T09:30:00+09:00', clock_out: null },
  { name: '鈴木 一郎', clock_in: null, clock_out: null },
]

export const DEMO_ALL_PAYSLIPS = [
  { id: '1', year: 2026, month: 5, base_salary: 280000, commute_total: 8400, deduction: 56000, net_salary: 232400, is_paid: false, profiles: { name: '田中 太郎' } },
  { id: '2', year: 2026, month: 5, base_salary: 250000, commute_total: 6300, deduction: 50000, net_salary: 206300, is_paid: false, profiles: { name: '佐藤 花子' } },
  { id: '3', year: 2026, month: 4, base_salary: 280000, commute_total: 8400, deduction: 56000, net_salary: 232400, is_paid: true,  profiles: { name: '田中 太郎' } },
  { id: '4', year: 2026, month: 4, base_salary: 250000, commute_total: 6300, deduction: 50000, net_salary: 206300, is_paid: true,  profiles: { name: '佐藤 花子' } },
]
