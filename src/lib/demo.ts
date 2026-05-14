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

// 祝日カレンダー（2026年）
export const DEMO_HOLIDAYS = [
  { id: 'h1',  date: '2026-01-01', name: '元日',         kind: 'public' as const },
  { id: 'h2',  date: '2026-01-12', name: '成人の日',     kind: 'public' as const },
  { id: 'h3',  date: '2026-02-11', name: '建国記念の日', kind: 'public' as const },
  { id: 'h4',  date: '2026-02-23', name: '天皇誕生日',   kind: 'public' as const },
  { id: 'h5',  date: '2026-03-20', name: '春分の日',     kind: 'public' as const },
  { id: 'h6',  date: '2026-04-29', name: '昭和の日',     kind: 'public' as const },
  { id: 'h7',  date: '2026-05-03', name: '憲法記念日',   kind: 'public' as const },
  { id: 'h8',  date: '2026-05-04', name: 'みどりの日',   kind: 'public' as const },
  { id: 'h9',  date: '2026-05-05', name: 'こどもの日',   kind: 'public' as const },
  { id: 'h10', date: '2026-05-06', name: '振替休日',     kind: 'public' as const },
  { id: 'h11', date: '2026-07-20', name: '海の日',       kind: 'public' as const },
  { id: 'h12', date: '2026-08-11', name: '山の日',       kind: 'public' as const },
  { id: 'h13', date: '2026-09-21', name: '敬老の日',     kind: 'public' as const },
  { id: 'h14', date: '2026-09-23', name: '秋分の日',     kind: 'public' as const },
  { id: 'h15', date: '2026-10-12', name: 'スポーツの日', kind: 'public' as const },
  { id: 'h16', date: '2026-11-03', name: '文化の日',     kind: 'public' as const },
  { id: 'h17', date: '2026-11-23', name: '勤労感謝の日', kind: 'public' as const },
]

// 会社設定
export const DEMO_COMPANY_SETTINGS = {
  company_name: '株式会社デモ商事',
  standard_work_hours: 8.0,
  overtime_threshold_hours: 8.0,
  payroll_cutoff_day: 31,
  payroll_payday: 25,
  social_insurance_rate: 0.15,
  income_tax_rate: 0.05,
}

export const DEMO_ALL_PAYSLIPS = [
  { id: '1', year: 2026, month: 5, base_salary: 280000, commute_total: 8400, deduction: 56000, net_salary: 232400, is_paid: false, profiles: { name: '田中 太郎' } },
  { id: '2', year: 2026, month: 5, base_salary: 250000, commute_total: 6300, deduction: 50000, net_salary: 206300, is_paid: false, profiles: { name: '佐藤 花子' } },
  { id: '3', year: 2026, month: 4, base_salary: 280000, commute_total: 8400, deduction: 56000, net_salary: 232400, is_paid: true,  profiles: { name: '田中 太郎' } },
  { id: '4', year: 2026, month: 4, base_salary: 250000, commute_total: 6300, deduction: 50000, net_salary: 206300, is_paid: true,  profiles: { name: '佐藤 花子' } },
]
